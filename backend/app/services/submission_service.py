import copy
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    UnprocessableEntityException,
)
from app.models.checkpoint import Checkpoint, Submission, SubmissionStatus
from app.models.team import TeamMemberRole
from app.models.user import ApprovalStatus, User, UserRole
from app.repositories.checkpoint_repo import checkpoint_repo
from app.repositories.submission_repo import submission_repo
from app.repositories.team_repo import team_repo
from app.schemas.checkpoint import CheckpointStatus
from app.schemas.submission import (
    AuditLogResponse,
    SubmissionCreateRequest,
    SubmissionResponse,
)
from app.services.checkpoint_service import checkpoint_service, ensure_utc
from app.services.github_service import github_service

logger = logging.getLogger("hackflow.submission_service")

IDEMPOTENCY_WINDOW_SECONDS = 10.0


class SubmissionService:
    """
    Business service layer for Checkpoint Submissions and Audit Logging (HF-34 & SRS HF-23):
    - Enforces Approval Status (`APPROVED` -> else 403 `ACCOUNT_NOT_APPROVED`)
      and Team Leader role (`TEAM_LEADER` -> else 403 `FORBIDDEN_NOT_TEAM_LEADER`).
    - Validates Checkpoint Status (`INVALID_CHECKPOINT_STATUS` 400) and Time-Gated Deadline
      with configurable Grace Period (`DEADLINE_EXCEEDED` 400).
    - Supports Idempotency-Key header & 10-second duplicate request detection (`UAT-CP-09`).
    - Validates dynamic `submission_fields` (`MISSING_REQUIRED_FIELD` 422).
    - Records anti-race intermediate status `pending_sha_freeze` with server timestamp
      before invoking GitHub API (`HF-33`).
    - Automatically rolls back to previous valid `submitted` record if a resubmission fails
      due to candidate repo error (`422 GITHUB_REPO_INACCESSIBLE` / `UAT-CP-07`).
    - Preserves submission on GitHub 503 outage via Graceful Fallback (`sha_verification_failed`, HTTP 200 OK).
    - Maintains version history on resubmission and writes comprehensive `audit_logs` with `late_grace_period`.
    """

    @staticmethod
    def _extract_effective_submission_data(
        payload: SubmissionCreateRequest,
    ) -> Tuple[Dict[str, Any], Optional[str], Optional[str], Optional[str]]:
        """
        Normalizes submission_data from both nested `payload.submission_data` and top-level fields.
        Returns (effective_submission_data, repo_url, demo_url, note).
        """
        merged: Dict[str, Any] = {}

        # 1. Extra top-level dynamic fields (if caller passed custom keys at root)
        reserved_keys = {
            "checkpoint_id",
            "submission_data",
            "simulate_time",
            "note",
        }
        if payload.model_extra:
            for k, v in payload.model_extra.items():
                if k not in reserved_keys and v is not None:
                    merged[k] = v.strip() if isinstance(v, str) else v

        # 2. Known top-level convenience fields
        for key in ("repo_url", "demo_url", "slide_url", "presentation_pdf"):
            val = getattr(payload, key, None)
            if val is not None:
                cleaned = val.strip() if isinstance(val, str) else val
                if cleaned != "":
                    merged[key] = cleaned

        # 3. Explicit `submission_data` dictionary (takes precedence)
        if isinstance(payload.submission_data, dict):
            for k, v in payload.submission_data.items():
                if v is not None:
                    merged[k] = v.strip() if isinstance(v, str) else v

        # Extract note
        raw_note = payload.note
        if raw_note is None and isinstance(merged.get("note"), str):
            raw_note = merged.get("note")
        note = raw_note.strip() if isinstance(raw_note, str) and raw_note.strip() else None

        # Extract repo_url
        raw_repo = merged.get("repo_url") or payload.repo_url
        repo_url = raw_repo.strip() if isinstance(raw_repo, str) and raw_repo.strip() else None

        # Extract demo_url (or fallback to non-repo dynamic link for display convenience)
        raw_demo = (
            merged.get("demo_url")
            or payload.demo_url
            or merged.get("slide_url")
            or merged.get("presentation_pdf")
        )
        if not raw_demo:
            for k, v in merged.items():
                if k not in ("repo_url", "note", "progress_note") and isinstance(v, str) and v.strip():
                    raw_demo = v
                    break
        demo_url = raw_demo.strip() if isinstance(raw_demo, str) and raw_demo.strip() else None

        return merged, repo_url, demo_url, note

    @staticmethod
    def _is_same_payload(
        existing_sub: Submission,
        new_data: Dict[str, Any],
        new_note: Optional[str],
    ) -> bool:
        """
        Compares incoming normalized submission_data and note against an existing Submission
        for 10-second duplicate request detection (SRS HF-23 Mục 4.2).
        """
        existing_data = existing_sub.submission_data or {}
        existing_note = (existing_sub.note or "").strip() or None
        clean_new_note = (new_note or "").strip() or None

        if existing_data == new_data and existing_note == clean_new_note:
            return True

        return False

    @classmethod
    def build_submission_response(
        cls,
        submission: Submission,
        is_duplicate: bool = False,
    ) -> SubmissionResponse:
        grace = bool(getattr(submission, "grace_period_applied", False))
        history = getattr(submission, "version_history", None)
        if not isinstance(history, list):
            history = []

        return SubmissionResponse(
            id=str(submission.id),
            submission_id=str(submission.id),
            checkpoint_id=str(submission.checkpoint_id),
            team_id=str(submission.team_id),
            submitted_by=submission.submitted_by,
            repo_url=submission.repo_url,
            demo_url=submission.demo_url,
            commit_sha=submission.commit_sha,
            submission_data=submission.submission_data,
            note=getattr(submission, "note", None),
            feedback=submission.feedback,
            status=submission.status,
            grace_period_applied=grace,
            late_grace_period=grace,
            version=getattr(submission, "version", 1) or 1,
            version_history=history,
            is_duplicate=is_duplicate,
            submitted_at=ensure_utc(submission.submitted_at),
            created_at=submission.created_at,
            updated_at=submission.updated_at,
        )

    @staticmethod
    def build_audit_log_response(log: Any) -> AuditLogResponse:
        return AuditLogResponse(
            id=str(log.id),
            user_id=log.user_id,
            team_id=log.team_id,
            checkpoint_id=log.checkpoint_id,
            submission_id=log.submission_id,
            action=log.action,
            status=log.status,
            ip_address=log.ip_address,
            late_grace_period=bool(log.late_grace_period),
            commit_sha=log.commit_sha,
            details=log.details,
            created_at=ensure_utc(log.created_at),
        )

    async def submit_checkpoint(
        self,
        db: AsyncSession,
        user: User,
        payload: SubmissionCreateRequest,
        checkpoint_id_override: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        client_ip: Optional[str] = None,
        github_client: Optional[httpx.AsyncClient] = None,
        on_pending_sha_freeze: Optional[Callable[[Submission], None]] = None,
    ) -> Tuple[SubmissionResponse, str]:
        """
        Executes the complete Checkpoint Submission workflow (SRS HF-23 Mục 2, 3, 4, 5, 6):
        1. Verify user is APPROVED (403 ACCOUNT_NOT_APPROVED) and TEAM_LEADER (403 FORBIDDEN_NOT_TEAM_LEADER).
        2. Verify checkpoint status (400 INVALID_CHECKPOINT_STATUS) and deadline + grace period (400 DEADLINE_EXCEEDED).
        3. Check Idempotency-Key and 10s duplicate detection window (200 OK without re-calling GitHub API).
        4. Validate dynamic required fields in checkpoint.submission_fields (422 MISSING_REQUIRED_FIELD).
        5. Record intermediate state `pending_sha_freeze` with `submitted_at = server_timestamp`.
        6. Call GitHub API (HF-33) if `is_final_checkpoint == True`:
           - On 422 repo error: rollback to previous `submitted` version if resubmitting, log audit, raise 422.
           - On 503 GitHub outage after 3 retries: transition to `sha_verification_failed`, log audit, return 200 OK.
           - On success: freeze `commit_sha`, transition to `submitted`, save version history & audit log, return 200 OK.
        """
        # ── Bước 2.1: Kiểm tra trạng thái duyệt tài khoản & Phân quyền Đội trưởng ──
        if user.approval_status != ApprovalStatus.APPROVED.value:
            raise ForbiddenException(
                message="Tài khoản của bạn chưa được Ban tổ chức phê duyệt (APPROVED) để thực hiện nộp bài.",
                error_code="ACCOUNT_NOT_APPROVED",
            )

        membership = await team_repo.get_user_membership(db, str(user.id))
        if not membership or membership.role != TeamMemberRole.LEADER.value:
            raise ForbiddenException(
                message="Chỉ Đội trưởng (TEAM_LEADER) mới có quyền gửi hoặc cập nhật bài nộp cho đội thi.",
                error_code="FORBIDDEN_NOT_TEAM_LEADER",
            )

        team_id = str(membership.team_id)

        # ── Xác định checkpoint_id ──
        checkpoint_id = (checkpoint_id_override or payload.checkpoint_id or "").strip()
        if not checkpoint_id:
            raise UnprocessableEntityException(
                message="Thiếu định danh mốc nộp bài bắt buộc: 'checkpoint_id'.",
                error_code="MISSING_REQUIRED_FIELD",
                data={"missing_field": "checkpoint_id"},
            )

        checkpoint: Optional[Checkpoint] = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not checkpoint:
            raise NotFoundException(
                message=f"Không tìm thấy mốc Checkpoint với ID '{checkpoint_id}'.",
                error_code="CHECKPOINT_NOT_FOUND",
            )

        # ── Bước 2.2 & Mục 3: Kiểm tra trạng thái Checkpoint & Công thức Time-Gated + Grace Period ──
        server_timestamp = ensure_utc(payload.simulate_time or datetime.now(timezone.utc))
        gate_info = checkpoint_service.calculate_time_gate_info(checkpoint, now=server_timestamp)
        grace_sec = gate_info.get("grace_period_seconds", 5)

        if not checkpoint.is_active:
            raise BadRequestException(
                message="Checkpoint này hiện đang tạm khóa hoặc không ở trạng thái hoạt động (inactive).",
                error_code="INVALID_CHECKPOINT_STATUS",
            )

        if gate_info["status"] == CheckpointStatus.UPCOMING.value:
            raise BadRequestException(
                message="Cổng nộp bài cho mốc Checkpoint này chưa đến giờ mở (UPCOMING).",
                error_code="INVALID_CHECKPOINT_STATUS",
            )

        if gate_info["status"] == CheckpointStatus.CLOSED.value:
            raise BadRequestException(
                message=f"Đã quá thời hạn nộp bài cho mốc Checkpoint này (kể cả thời gian ân hạn mạng {grace_sec} giây).",
                error_code="DEADLINE_EXCEEDED",
            )

        grace_period_applied = bool(gate_info["grace_period_applied"])

        # ── Chuẩn hóa dữ liệu bài nộp động ──
        effective_data, raw_repo_url, raw_demo_url, note = self._extract_effective_submission_data(
            payload
        )
        clean_idem_key = (
            idempotency_key.strip()
            if isinstance(idempotency_key, str) and idempotency_key.strip()
            else None
        )

        # ── Bước 4.2: Kiểm tra Idempotency-Key & Phát hiện Request Trùng trong cửa sổ 10 giây ──
        existing_sub = await submission_repo.get_by_team_and_checkpoint(
            db, team_id=team_id, checkpoint_id=str(checkpoint.id), for_update=True
        )

        if existing_sub and existing_sub.status in (
            SubmissionStatus.SUBMITTED.value,
            SubmissionStatus.SHA_VERIFICATION_FAILED.value,
            SubmissionStatus.EVALUATED.value,
        ):
            # 1. Trùng Idempotency-Key header
            if clean_idem_key and existing_sub.idempotency_key == clean_idem_key:
                logger.info(
                    f"Idempotency-Key hit ({clean_idem_key}) for team={team_id}, checkpoint={checkpoint.id}"
                )
                return (
                    self.build_submission_response(existing_sub, is_duplicate=True),
                    "Yêu cầu nộp bài trùng lặp (Idempotency-Key). Hệ thống trả về bản ghi bài nộp hiện tại.",
                )

            # 2. Trùng hoàn toàn payload trong cửa sổ 10 giây kể từ lần nộp gần nhất
            elapsed_sec = abs(
                (server_timestamp - ensure_utc(existing_sub.submitted_at)).total_seconds()
            )
            if (
                elapsed_sec <= IDEMPOTENCY_WINDOW_SECONDS
                and self._is_same_payload(existing_sub, effective_data, note)
                and (not clean_idem_key or clean_idem_key == existing_sub.idempotency_key)
            ):
                logger.info(
                    f"Duplicate submission detected within {elapsed_sec:.2f}s window for team={team_id}, checkpoint={checkpoint.id}"
                )
                return (
                    self.build_submission_response(existing_sub, is_duplicate=True),
                    "Phát hiện yêu cầu nộp bài trùng lặp trong cửa sổ 10 giây. Hệ thống trả về bản ghi hiện tại.",
                )

        # ── Bước 2.3: Validate dữ liệu động theo submission_fields ──
        github_service.validate_submission_fields(checkpoint, effective_data)

        # Với checkpoint cuối chưa cấu hình mảng submission_fields tùy chỉnh, bắt buộc phải có repo_url
        if checkpoint.is_final_checkpoint and not checkpoint.submission_fields:
            if not raw_repo_url:
                raise UnprocessableEntityException(
                    message="Thiếu trường nộp bài bắt buộc: 'GitHub Repository URL' (repo_url) ở mốc chốt sản phẩm cuối.",
                    error_code="MISSING_REQUIRED_FIELD",
                    data={"missing_field": "repo_url"},
                )

        # ── Bước 2.4: Ghi nhận trạng thái trung gian PENDING_SHA_FREEZE (Chống Race Condition) ──
        prev_snapshot: Optional[Dict[str, Any]] = None
        if existing_sub is not None:
            prev_snapshot = {
                "submitted_by": existing_sub.submitted_by,
                "repo_url": existing_sub.repo_url,
                "demo_url": existing_sub.demo_url,
                "commit_sha": existing_sub.commit_sha,
                "submission_data": copy.deepcopy(existing_sub.submission_data),
                "note": existing_sub.note,
                "status": existing_sub.status,
                "grace_period_applied": bool(existing_sub.grace_period_applied),
                "version": existing_sub.version or 1,
                "version_history": copy.deepcopy(existing_sub.version_history or []),
                "idempotency_key": existing_sub.idempotency_key,
                "submitted_at": ensure_utc(existing_sub.submitted_at),
            }
            working_sub = await submission_repo.update(
                db,
                existing_sub,
                status=SubmissionStatus.PENDING_SHA_FREEZE.value,
                submitted_at=server_timestamp,
            )
        else:
            working_sub = await submission_repo.create(
                db=db,
                checkpoint_id=str(checkpoint.id),
                team_id=team_id,
                submitted_by=str(user.id),
                repo_url=raw_repo_url,
                demo_url=raw_demo_url,
                commit_sha=None,
                submission_data=effective_data,
                note=note,
                status=SubmissionStatus.PENDING_SHA_FREEZE.value,
                grace_period_applied=grace_period_applied,
                version=1,
                version_history=[],
                idempotency_key=clean_idem_key,
                submitted_at=server_timestamp,
            )

        if on_pending_sha_freeze is not None:
            on_pending_sha_freeze(working_sub)

        # ── Gọi Module HF-33 (Nếu is_final_checkpoint = True) & Xử lý Rollback an toàn ──
        try:
            freeze_result = await github_service.process_checkpoint_sha_freeze(
                checkpoint=checkpoint,
                submission_data=effective_data,
                client=github_client,
            )
        except UnprocessableEntityException as exc:
            # Kịch bản UAT-FIX-06 / UAT-CP-07:
            # Nếu đội đã có bài nộp hợp lệ trước đó nhưng lần nộp lại gặp lỗi repo private / không tồn tại / rỗng:
            # Tự động rollback về phiên bản SUBMITTED hợp lệ trước đó!
            if prev_snapshot is not None:
                await submission_repo.update(
                    db,
                    working_sub,
                    submitted_by=prev_snapshot["submitted_by"],
                    repo_url=prev_snapshot["repo_url"],
                    demo_url=prev_snapshot["demo_url"],
                    commit_sha=prev_snapshot["commit_sha"],
                    submission_data=prev_snapshot["submission_data"],
                    note=prev_snapshot["note"],
                    status=prev_snapshot["status"],
                    grace_period_applied=prev_snapshot["grace_period_applied"],
                    version=prev_snapshot["version"],
                    version_history=prev_snapshot["version_history"],
                    idempotency_key=prev_snapshot["idempotency_key"],
                    submitted_at=prev_snapshot["submitted_at"],
                )
                await submission_repo.create_audit_log(
                    db=db,
                    user_id=str(user.id),
                    team_id=team_id,
                    checkpoint_id=str(checkpoint.id),
                    submission_id=str(working_sub.id),
                    action="SUBMISSION_ROLLBACK_ON_ERROR",
                    status=prev_snapshot["status"],
                    ip_address=client_ip,
                    late_grace_period=grace_period_applied,
                    commit_sha=prev_snapshot["commit_sha"],
                    details={
                        "error_code": exc.error_code,
                        "error_message": exc.message,
                        "rolled_back_to_version": prev_snapshot["version"],
                        "attempted_repo_url": raw_repo_url,
                        "server_timestamp": server_timestamp.isoformat(),
                    },
                )
                await db.commit()
                await db.refresh(working_sub)

                exc.data = {
                    **(exc.data if isinstance(exc.data, dict) else {}),
                    "rolled_back": True,
                    "rolled_back_to_version": prev_snapshot["version"],
                    "preserved_submission_id": str(working_sub.id),
                    "preserved_status": working_sub.status,
                    "preserved_commit_sha": working_sub.commit_sha,
                }
                raise exc
            else:
                # Lần nộp đầu tiên bị lỗi 422 -> xóa bản ghi trung gian PENDING_SHA_FREEZE và ghi log
                await submission_repo.delete(db, working_sub)
                await submission_repo.create_audit_log(
                    db=db,
                    user_id=str(user.id),
                    team_id=team_id,
                    checkpoint_id=str(checkpoint.id),
                    submission_id=None,
                    action="SUBMISSION_REJECTED_REPO_ERROR",
                    status=SubmissionStatus.INVALID.value,
                    ip_address=client_ip,
                    late_grace_period=grace_period_applied,
                    commit_sha=None,
                    details={
                        "error_code": exc.error_code,
                        "error_message": exc.message,
                        "attempted_repo_url": raw_repo_url,
                        "server_timestamp": server_timestamp.isoformat(),
                    },
                )
                await db.commit()
                raise exc

        # ── Bước 2.5 & 4.2: Hoàn tất lưu trữ, cập nhật Version History & Ghi Audit Log ──
        if prev_snapshot is not None:
            history_item = {
                "id": f"{working_sub.id}-v{prev_snapshot['version']}",
                "submission_id": str(working_sub.id),
                "version": prev_snapshot["version"],
                "checkpoint_id": str(checkpoint.id),
                "team_id": team_id,
                "submitted_by": prev_snapshot["submitted_by"],
                "repo_url": prev_snapshot["repo_url"],
                "demo_url": prev_snapshot["demo_url"],
                "commit_sha": prev_snapshot["commit_sha"],
                "submission_data": prev_snapshot["submission_data"],
                "note": prev_snapshot["note"],
                "status": prev_snapshot["status"],
                "grace_period_applied": prev_snapshot["grace_period_applied"],
                "submitted_at": ensure_utc(prev_snapshot["submitted_at"]).isoformat(),
            }
            new_version_history = [history_item] + list(prev_snapshot["version_history"] or [])
            new_version = int(prev_snapshot["version"]) + 1
        else:
            new_version_history = []
            new_version = 1

        final_repo_url = freeze_result.repo_url or raw_repo_url
        if final_repo_url and "repo_url" in effective_data:
            effective_data["repo_url"] = final_repo_url

        final_status = freeze_result.status or SubmissionStatus.SUBMITTED.value

        working_sub = await submission_repo.update(
            db,
            working_sub,
            submitted_by=str(user.id),
            repo_url=final_repo_url,
            demo_url=raw_demo_url,
            commit_sha=freeze_result.commit_sha,
            submission_data=effective_data,
            note=note,
            status=final_status,
            grace_period_applied=grace_period_applied,
            version=new_version,
            version_history=new_version_history,
            idempotency_key=clean_idem_key,
            submitted_at=server_timestamp,
        )

        # Ghi vết vào bảng audit_logs kèm cờ late_grace_period
        if freeze_result.is_fallback:
            audit_action = "SUBMISSION_SHA_FALLBACK"
        elif prev_snapshot is not None:
            audit_action = "SUBMISSION_RESUBMITTED"
        else:
            audit_action = "SUBMISSION_CREATED"

        await submission_repo.create_audit_log(
            db=db,
            user_id=str(user.id),
            team_id=team_id,
            checkpoint_id=str(checkpoint.id),
            submission_id=str(working_sub.id),
            action=audit_action,
            status=final_status,
            ip_address=client_ip,
            late_grace_period=grace_period_applied,
            commit_sha=freeze_result.commit_sha,
            details={
                "version": new_version,
                "is_resubmission": prev_snapshot is not None,
                "is_final_checkpoint": bool(checkpoint.is_final_checkpoint),
                "grace_period_applied": grace_period_applied,
                "grace_period_seconds": grace_sec,
                "repo_url": final_repo_url,
                "demo_url": raw_demo_url,
                "submission_data": effective_data,
                "retry_attempts": freeze_result.retry_attempts,
                "is_fallback": freeze_result.is_fallback,
                "incident_note": freeze_result.incident_note,
                "server_timestamp": server_timestamp.isoformat(),
            },
        )

        await db.commit()
        await db.refresh(working_sub)

        if freeze_result.is_fallback:
            message = (
                "Bài nộp đã được ghi nhận nhưng không thể lấy Commit SHA do GitHub API gián đoạn. "
                "BTC sẽ xác thực thủ công."
            )
        elif grace_period_applied:
            message = f"Nộp bài thành công trong thời gian ân hạn mạng (Grace Period {grace_sec}s)."
        elif prev_snapshot is not None:
            message = f"Cập nhật bài nộp (phiên bản v{new_version}) thành công."
        else:
            message = "Nộp bài thành công."

        return self.build_submission_response(working_sub, is_duplicate=False), message

    async def list_submissions(
        self,
        db: AsyncSession,
        user: User,
        checkpoint_id: Optional[str] = None,
        team_id: Optional[str] = None,
        include_history: bool = True,
    ) -> List[SubmissionResponse]:
        """
        Lists submissions (and optionally expands version_history rows for HF-31 SubmissionHistoryTable).
        - Candidates automatically view their own team's submissions.
        - Admin / Judge / Mentor can view all submissions or filter by team_id / checkpoint_id.
        """
        effective_team_id = team_id
        if user.role == UserRole.CANDIDATE.value:
            membership = await team_repo.get_user_membership(db, str(user.id))
            if not membership:
                return []
            effective_team_id = str(membership.team_id)

        records = await submission_repo.list_submissions(
            db, team_id=effective_team_id, checkpoint_id=checkpoint_id
        )

        results: List[SubmissionResponse] = []
        for sub in records:
            results.append(self.build_submission_response(sub, is_duplicate=False))
            if include_history and isinstance(sub.version_history, list):
                for hist in sub.version_history:
                    if not isinstance(hist, dict):
                        continue
                    hist_submitted_at = hist.get("submitted_at")
                    try:
                        parsed_dt = (
                            datetime.fromisoformat(str(hist_submitted_at).replace("Z", "+00:00"))
                            if hist_submitted_at
                            else ensure_utc(sub.submitted_at)
                        )
                    except Exception:
                        parsed_dt = ensure_utc(sub.submitted_at)

                    hist_grace = bool(hist.get("grace_period_applied", False))
                    hist_id = str(hist.get("id") or f"{sub.id}-v{hist.get('version', 1)}")
                    results.append(
                        SubmissionResponse(
                            id=hist_id,
                            submission_id=str(sub.id),
                            checkpoint_id=str(sub.checkpoint_id),
                            team_id=str(sub.team_id),
                            submitted_by=hist.get("submitted_by"),
                            repo_url=hist.get("repo_url"),
                            demo_url=hist.get("demo_url"),
                            commit_sha=hist.get("commit_sha"),
                            submission_data=hist.get("submission_data"),
                            note=hist.get("note"),
                            feedback=None,
                            status=str(hist.get("status") or SubmissionStatus.SUBMITTED.value),
                            grace_period_applied=hist_grace,
                            late_grace_period=hist_grace,
                            version=int(hist.get("version") or 1),
                            version_history=[],
                            is_duplicate=False,
                            submitted_at=parsed_dt,
                            created_at=parsed_dt,
                            updated_at=parsed_dt,
                        )
                    )

        return results

    async def get_submission_by_id(
        self,
        db: AsyncSession,
        user: User,
        submission_id: str,
    ) -> SubmissionResponse:
        sub = await submission_repo.get_by_id(db, submission_id)
        if not sub:
            raise NotFoundException(
                message=f"Không tìm thấy bản ghi bài nộp với ID '{submission_id}'.",
                error_code="SUBMISSION_NOT_FOUND",
            )

        if user.role == UserRole.CANDIDATE.value:
            membership = await team_repo.get_user_membership(db, str(user.id))
            if not membership or str(membership.team_id) != str(sub.team_id):
                raise ForbiddenException(
                    message="Bạn không có quyền xem bài nộp của đội thi khác.",
                    error_code="FORBIDDEN_SUBMISSION_ACCESS",
                )

        return self.build_submission_response(sub)

    async def list_audit_logs(
        self,
        db: AsyncSession,
        user: User,
        checkpoint_id: Optional[str] = None,
        team_id: Optional[str] = None,
        submission_id: Optional[str] = None,
        action: Optional[str] = None,
        late_grace_period: Optional[bool] = None,
    ) -> List[AuditLogResponse]:
        effective_team_id = team_id
        if user.role == UserRole.CANDIDATE.value:
            membership = await team_repo.get_user_membership(db, str(user.id))
            if not membership:
                return []
            effective_team_id = str(membership.team_id)

        logs = await submission_repo.list_audit_logs(
            db,
            team_id=effective_team_id,
            checkpoint_id=checkpoint_id,
            submission_id=submission_id,
            action=action,
            late_grace_period=late_grace_period,
        )
        return [self.build_audit_log_response(log) for log in logs]


submission_service = SubmissionService()

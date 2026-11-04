from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.checkpoint import Checkpoint
from app.repositories.checkpoint_repo import checkpoint_repo
from app.schemas.checkpoint import (
    CheckpointCreateRequest,
    CheckpointResponse,
    CheckpointStatus,
    CheckpointTimeGatedStatusResponse,
    CheckpointUpdateRequest,
    ValidateSubmissionWindowResponse,
)

# Thời gian ân hạn mạng (Grace Period) quy định cố định theo SRS (HF-23): 5 giây
GRACE_PERIOD_SECONDS = 5


def ensure_utc(dt: datetime) -> datetime:
    """
    Chuẩn hóa datetime về timezone UTC (hỗ trợ cả naive và timezone-aware).
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class CheckpointService:
    """
    Business service layer managing Hackathon Checkpoints, milestones,
    and Strict Time-gated validation with Network Latency Grace Period (5s).
    """

    @staticmethod
    def calculate_time_gate_info(
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
    ) -> dict:
        """
        Tính toán trạng thái time-gated của một Checkpoint tại thời điểm 'now'.
        """
        current_time = ensure_utc(now or datetime.now(timezone.utc))
        start_time = ensure_utc(checkpoint.start_time)
        deadline = ensure_utc(checkpoint.deadline)
        grace_sec = getattr(checkpoint, "grace_period_seconds", GRACE_PERIOD_SECONDS)
        if grace_sec is None:
            grace_sec = GRACE_PERIOD_SECONDS
        grace_deadline = deadline + timedelta(seconds=grace_sec)
        is_final = getattr(checkpoint, "is_final_checkpoint", False)

        time_remaining_sec = max(0, int((deadline - current_time).total_seconds()))
        time_until_start_sec = max(0, int((start_time - current_time).total_seconds()))

        # 1. Ban tổ chức khóa checkpoint
        if not checkpoint.is_active:
            return {
                "status": CheckpointStatus.CLOSED.value,
                "is_open": False,
                "can_submit": False,
                "is_late_window": False,
                "grace_period_applied": False,
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
                "message": "Checkpoint này đang tạm khóa hoặc đã bị vô hiệu hóa bởi Ban tổ chức.",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": 0,
                "time_until_start_seconds": time_until_start_sec,
            }

        # 2. Chưa đến thời gian mở cổng
        if current_time < start_time:
            return {
                "status": CheckpointStatus.UPCOMING.value,
                "is_open": False,
                "can_submit": False,
                "is_late_window": False,
                "grace_period_applied": False,
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
                "message": "Cổng nộp bài cho checkpoint này chưa đến giờ mở.",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": time_remaining_sec,
                "time_until_start_seconds": time_until_start_sec,
            }

        # 3. Đang trong khung giờ nộp bài hợp lệ
        if start_time <= current_time <= deadline:
            return {
                "status": CheckpointStatus.OPEN.value,
                "is_open": True,
                "can_submit": True,
                "is_late_window": False,
                "grace_period_applied": False,
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
                "message": "Cổng nộp bài đang mở hợp lệ.",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": time_remaining_sec,
                "time_until_start_seconds": 0,
            }

        # 4. Trong khoảng ân hạn mạng (Grace Period)
        if deadline < current_time <= grace_deadline:
            return {
                "status": CheckpointStatus.GRACE_PERIOD.value,
                "is_open": True,
                "can_submit": True,
                "is_late_window": False,
                "grace_period_applied": True,
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
                "message": f"Nộp bài trong thời gian ân hạn mạng (Grace Period {grace_sec} giây).",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": 0,
                "time_until_start_seconds": 0,
            }

        # 5. Đã qua thời hạn chuẩn (Sau deadline + grace_period_seconds) -> Vẫn mở cổng tiếp nhận bài nộp muộn
        return {
            "status": CheckpointStatus.LATE.value,
            "is_open": True,
            "can_submit": True,
            "is_late_window": True,
            "grace_period_applied": False,
            "grace_period_seconds": grace_sec,
            "is_final_checkpoint": is_final,
            "message": "Đã qua thời hạn chuẩn — Cổng đang mở tiếp nhận bài nộp muộn (sẽ gắn cờ Nộp muộn).",
            "server_time": current_time,
            "start_time": start_time,
            "deadline": deadline,
            "time_remaining_seconds": 0,
            "time_until_start_seconds": 0,
        }

    @staticmethod
    def validate_checkpoint_submission_window(
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
    ) -> Tuple[bool, bool, str]:
        """
        Kiểm tra nghiêm ngặt time-gated cho việc nộp bài:
        - Ném HTTP 403 Forbidden nếu:
          + Checkpoint inactive -> CHECKPOINT_INACTIVE
          + now < start_time -> CHECKPOINT_NOT_OPEN
          + now > deadline + grace_period -> DEADLINE_EXCEEDED
        - Trả về (is_valid=True, grace_period_applied=bool, message=str) nếu hợp lệ.
        """
        info = CheckpointService.calculate_time_gate_info(checkpoint, now)
        grace_sec = info.get("grace_period_seconds", GRACE_PERIOD_SECONDS)

        if not checkpoint.is_active:
            raise ForbiddenException(
                message="Checkpoint này đang tạm khóa hoặc đã bị vô hiệu hóa bởi Ban tổ chức.",
                error_code="CHECKPOINT_INACTIVE",
            )

        if info["status"] == CheckpointStatus.UPCOMING.value:
            raise ForbiddenException(
                message="Cổng nộp bài cho checkpoint này chưa đến giờ mở.",
                error_code="CHECKPOINT_NOT_OPEN",
            )

        if info["status"] == CheckpointStatus.CLOSED.value:
            raise ForbiddenException(
                message=f"Đã quá thời hạn nộp bài cho checkpoint này (kể cả thời gian ân hạn mạng {grace_sec} giây).",
                error_code="DEADLINE_EXCEEDED",
            )

        return True, info["grace_period_applied"], info["message"]

    @classmethod
    def build_checkpoint_response(
        cls,
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
        latest_submission: Optional[dict] = None,
        order: Optional[int] = None,
        submission_block_reason: Optional[str] = None,
    ) -> CheckpointResponse:
        info = cls.calculate_time_gate_info(checkpoint, now)
        resolved_order = order if order is not None else (int(checkpoint.display_order or 0) + 1)
        contest_allows = submission_block_reason is None
        effective_can_submit = bool(info["can_submit"] and contest_allows)
        return CheckpointResponse(
            id=str(checkpoint.id),
            weight=checkpoint.weight,
            display_order=checkpoint.display_order,
            order=resolved_order,
            checkpoint_number=resolved_order,
            title=checkpoint.title,
            description=checkpoint.description,
            start_time=info["start_time"],
            deadline=info["deadline"],
            requirements=checkpoint.requirements,
            is_active=checkpoint.is_active,
            is_final_checkpoint=info["is_final_checkpoint"],
            submission_fields=checkpoint.submission_fields,
            status=info["status"],
            is_open=info["is_open"],
            can_submit=effective_can_submit,
            is_late_window=bool(info.get("is_late_window", False)),
            contest_allows_submission=contest_allows,
            submission_block_reason=submission_block_reason,
            grace_period_seconds=info["grace_period_seconds"],
            time_remaining_seconds=info["time_remaining_seconds"],
            time_until_start_seconds=info["time_until_start_seconds"],
            server_time=info["server_time"],
            latest_submission=latest_submission,
            created_at=checkpoint.created_at,
            updated_at=checkpoint.updated_at,
        )

    @classmethod
    def build_status_response(
        cls,
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
        submission_block_reason: Optional[str] = None,
    ) -> CheckpointTimeGatedStatusResponse:
        info = cls.calculate_time_gate_info(checkpoint, now)
        contest_allows = submission_block_reason is None
        effective_can_submit = bool(info["can_submit"] and contest_allows)
        effective_message = submission_block_reason or info["message"]
        return CheckpointTimeGatedStatusResponse(
            checkpoint_id=str(checkpoint.id),
            title=checkpoint.title,
            server_time=info["server_time"],
            start_time=info["start_time"],
            deadline=info["deadline"],
            is_active=checkpoint.is_active,
            is_open=info["is_open"],
            status=info["status"],
            can_submit=effective_can_submit,
            is_late_window=bool(info.get("is_late_window", False)),
            contest_allows_submission=contest_allows,
            submission_block_reason=submission_block_reason,
            grace_period_applied=info["grace_period_applied"],
            grace_period_seconds=info["grace_period_seconds"],
            is_final_checkpoint=info["is_final_checkpoint"],
            time_remaining_seconds=info["time_remaining_seconds"],
            time_until_start_seconds=info["time_until_start_seconds"],
            message=effective_message,
        )

    async def _resolve_submission_block_reason(
        self,
        db: AsyncSession,
        user_id: Optional[str] = None,
    ) -> Optional[str]:
        from app.repositories.topic_repo import topic_repo
        from app.services.contest_policy_service import get_contest_runtime_state

        cfg = await topic_repo.get_config(db)
        runtime = get_contest_runtime_state(cfg)
        if runtime["submission_block_reason"]:
            return runtime["submission_block_reason"]

        if user_id:
            from app.models.team import TeamStatus
            from app.repositories.team_repo import team_repo

            membership = await team_repo.get_user_membership(db, str(user_id))
            if membership:
                team_obj = await team_repo.get_by_id(db, str(membership.team_id))
                if team_obj:
                    team_meta = (
                        team_obj.admin_meta
                        if isinstance(getattr(team_obj, "admin_meta", None), dict)
                        else {}
                    )
                    if (
                        getattr(team_obj, "status", None) == TeamStatus.REJECTED
                        or str(team_meta.get("approval_status", "")).lower() == "rejected"
                    ):
                        return "Đội thi của bạn đã bị Ban Tổ Chức từ chối hoặc đình chỉ tư cách thi đấu."
        return None

    async def _resolve_effective_now(
        self,
        db: AsyncSession,
        now: Optional[datetime] = None,
    ) -> Optional[datetime]:
        if now is not None:
            return now
        from app.repositories.topic_repo import topic_repo
        from app.services.contest_policy_service import get_contest_runtime_state

        cfg = await topic_repo.get_config(db)
        runtime = get_contest_runtime_state(cfg)
        if runtime.get("is_paused") and runtime.get("paused_at"):
            try:
                raw_paused = str(runtime["paused_at"]).strip()
                if raw_paused.endswith("Z"):
                    raw_paused = raw_paused[:-1] + "+00:00"
                return ensure_utc(datetime.fromisoformat(raw_paused))
            except Exception:
                return None
        return None

    async def list_checkpoints(
        self,
        db: AsyncSession,
        only_active: bool = False,
        now: Optional[datetime] = None,
        user_id: Optional[str] = None,
    ) -> List[CheckpointResponse]:
        checkpoints = await checkpoint_repo.get_all(db, only_active=only_active)
        submissions_by_cp: dict = {}
        block_reason = await self._resolve_submission_block_reason(db, user_id=user_id)
        effective_now = await self._resolve_effective_now(db, now=now)
        if user_id:
            from app.repositories.team_repo import team_repo
            from app.repositories.submission_repo import submission_repo
            from app.services.submission_service import submission_service

            membership = await team_repo.get_user_membership(db, str(user_id))
            if membership:
                team_subs = await submission_repo.list_submissions(
                    db, team_id=str(membership.team_id)
                )
                for sub in team_subs:
                    submissions_by_cp[str(sub.checkpoint_id)] = (
                        submission_service.build_submission_response(sub).model_dump(mode="json")
                    )

        return [
            self.build_checkpoint_response(
                cp,
                effective_now,
                latest_submission=submissions_by_cp.get(str(cp.id)),
                order=idx + 1,
                submission_block_reason=block_reason,
            )
            for idx, cp in enumerate(checkpoints)
        ]

    async def get_checkpoint_by_id(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        now: Optional[datetime] = None,
        user_id: Optional[str] = None,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        block_reason = await self._resolve_submission_block_reason(db, user_id=user_id)
        effective_now = await self._resolve_effective_now(db, now=now)
        latest_sub = None
        if user_id:
            from app.repositories.team_repo import team_repo
            from app.repositories.submission_repo import submission_repo
            from app.services.submission_service import submission_service

            membership = await team_repo.get_user_membership(db, str(user_id))
            if membership:
                sub = await submission_repo.get_by_team_and_checkpoint(
                    db, team_id=str(membership.team_id), checkpoint_id=str(cp.id)
                )
                if sub:
                    latest_sub = submission_service.build_submission_response(sub).model_dump(
                        mode="json"
                    )

        return self.build_checkpoint_response(
            cp,
            effective_now,
            latest_submission=latest_sub,
            submission_block_reason=block_reason,
        )


    async def get_time_gated_status(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        now: Optional[datetime] = None,
    ) -> CheckpointTimeGatedStatusResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")
        block_reason = await self._resolve_submission_block_reason(db)
        effective_now = await self._resolve_effective_now(db, now=now)
        return self.build_status_response(cp, effective_now, submission_block_reason=block_reason)

    async def verify_submission_window(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        simulate_time: Optional[datetime] = None,
    ) -> ValidateSubmissionWindowResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        block_reason = await self._resolve_submission_block_reason(db)
        if block_reason:
            raise ForbiddenException(
                message=block_reason,
                error_code="CONTEST_SUBMISSION_LOCKED",
            )
        is_valid, grace_applied, message = self.validate_checkpoint_submission_window(
            cp, now=simulate_time
        )
        gate_info = self.calculate_time_gate_info(cp, now=simulate_time)
        server_time = ensure_utc(simulate_time or datetime.now(timezone.utc))

        return ValidateSubmissionWindowResponse(
            is_valid=is_valid,
            grace_period_applied=grace_applied,
            is_late_window=bool(gate_info.get("is_late_window", False)),
            checkpoint_id=str(cp.id),
            checkpoint_title=cp.title,
            server_time=server_time,
            message=message,
        )

    @staticmethod
    def _normalize_submission_fields(
        is_final_checkpoint: bool,
        raw_fields: Optional[List[dict]],
    ) -> Optional[List[dict]]:
        """
        SRS HF-23 Mục 1.1:
        - Nếu is_final_checkpoint = False: Tự động bỏ qua (ép apply_sha_freeze = False) trên mọi trường.
        - Nếu is_final_checkpoint = True: Trường có apply_sha_freeze = True bắt buộc phải có required = True,
          và tối đa chỉ có 1 trường được bật apply_sha_freeze = True.
        """
        if raw_fields is None:
            return None

        normalized: List[dict] = []
        freeze_count = 0

        for item in raw_fields:
            field_copy = dict(item)
            if not is_final_checkpoint:
                field_copy["apply_sha_freeze"] = False
            else:
                if field_copy.get("apply_sha_freeze"):
                    freeze_count += 1
                    field_copy["required"] = True
            normalized.append(field_copy)

        if is_final_checkpoint and freeze_count > 1:
            raise BadRequestException(
                message="Checkpoint chốt sản phẩm cuối cùng chỉ được phép cấu hình tối đa 1 trường apply_sha_freeze = true."
            )

        return normalized

    async def create_checkpoint(
        self,
        db: AsyncSession,
        data: CheckpointCreateRequest,
    ) -> CheckpointResponse:
        start_utc = ensure_utc(data.start_time)
        deadline_utc = ensure_utc(data.deadline)

        if deadline_utc <= start_utc:
            raise BadRequestException(message="Hạn chót (deadline) phải diễn ra sau thời điểm mở cổng (start_time).")

        existing_cps = await checkpoint_repo.get_all(db)
        if data.is_final_checkpoint:
            existing_finals = [fcp for fcp in existing_cps if fcp.is_final_checkpoint]
            if existing_finals:
                raise BadRequestException(
                    message="Hệ thống chỉ cho phép duy nhất 1 Chặng Chung kết (is_final_checkpoint=true)."
                )
            for pcp in existing_cps:
                if not pcp.is_final_checkpoint and deadline_utc < ensure_utc(pcp.deadline):
                    raise BadRequestException(
                        message="Hạn chót của Chặng Chung kết không được sớm hơn hạn chót của các chặng tiến độ."
                    )
        else:
            final_deadlines = [
                ensure_utc(fcp.deadline)
                for fcp in existing_cps
                if fcp.is_final_checkpoint and fcp.is_active
            ]
            if final_deadlines and deadline_utc > max(final_deadlines):
                raise BadRequestException(
                    message="Hạn chót của chặng tiến độ không được muộn hơn hạn chót của Chặng Chung kết."
                )
            eff_order = int(data.display_order or 0)
            if eff_order > 0:
                for neighbor in existing_cps:
                    if neighbor.is_final_checkpoint:
                        continue
                    n_order = int(neighbor.display_order or 0)
                    if n_order <= 0:
                        continue
                    n_deadline = ensure_utc(neighbor.deadline)
                    if n_order == eff_order - 1 and deadline_utc < n_deadline:
                        raise BadRequestException(
                            message=f"Hạn chót của chặng #{eff_order} không được sớm hơn hạn chót của chặng đứng trước ({neighbor.title})."
                        )
                    if n_order == eff_order + 1 and deadline_utc > n_deadline:
                        raise BadRequestException(
                            message=f"Hạn chót của chặng #{eff_order} không được vượt quá hạn chót của chặng kế tiếp ({neighbor.title})."
                        )

        from sqlalchemy import select
        from app.models.config import HackathonConfig
        cfg_res = await db.execute(select(HackathonConfig).order_by(HackathonConfig.created_at.asc()))
        cfg = cfg_res.scalars().first()
        if cfg and data.is_final_checkpoint:
            if cfg.start_time and deadline_utc <= ensure_utc(cfg.start_time):
                raise BadRequestException(
                    message="Hạn chót của Chặng Chung kết phải diễn ra sau thời gian bắt đầu cuộc thi."
                )
            cfg.end_time = deadline_utc
            db.add(cfg)

        raw_fields = (
            [f.model_dump() for f in data.submission_fields]
            if data.submission_fields is not None
            else None
        )
        fields_dump = self._normalize_submission_fields(data.is_final_checkpoint, raw_fields)

        checkpoint = await checkpoint_repo.create(
            db=db,
            title=data.title,
            start_time=start_utc,
            deadline=deadline_utc,
            description=data.description,
            requirements=data.requirements,
            is_active=data.is_active,
            is_final_checkpoint=data.is_final_checkpoint,
            grace_period_seconds=data.grace_period_seconds,
            submission_fields=fields_dump,
            weight=data.weight or 0,
            display_order=data.display_order or 0,
        )
        await db.commit()
        await db.refresh(checkpoint)
        return self.build_checkpoint_response(checkpoint)

    async def update_checkpoint(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        data: CheckpointUpdateRequest,
        admin_user_id: Optional[str] = None,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        old_deadline = ensure_utc(cp.deadline)
        old_start = ensure_utc(cp.start_time)

        update_fields = {}
        if data.weight is not None:
            update_fields["weight"] = data.weight
        if data.display_order is not None:
            update_fields["display_order"] = data.display_order
        if data.title is not None:
            update_fields["title"] = data.title.strip()
        if data.description is not None:
            update_fields["description"] = data.description
        if data.requirements is not None:
            update_fields["requirements"] = data.requirements
        if data.is_active is not None:
            update_fields["is_active"] = data.is_active

        effective_is_final = (
            data.is_final_checkpoint
            if data.is_final_checkpoint is not None
            else bool(cp.is_final_checkpoint)
        )
        if data.is_final_checkpoint is not None:
            update_fields["is_final_checkpoint"] = data.is_final_checkpoint
        if data.grace_period_seconds is not None:
            update_fields["grace_period_seconds"] = data.grace_period_seconds

        if data.submission_fields is not None:
            raw_fields = [f.model_dump() for f in data.submission_fields]
            update_fields["submission_fields"] = self._normalize_submission_fields(
                effective_is_final, raw_fields
            )
        elif data.is_final_checkpoint is False and cp.submission_fields:
            update_fields["submission_fields"] = self._normalize_submission_fields(
                False, list(cp.submission_fields)
            )

        new_start = ensure_utc(data.start_time) if data.start_time is not None else old_start
        new_deadline = ensure_utc(data.deadline) if data.deadline is not None else old_deadline

        if new_deadline <= new_start:
            raise BadRequestException(message="Hạn chót (deadline) phải diễn ra sau thời điểm mở cổng (start_time).")

        now_utc = datetime.now(timezone.utc)
        if (
            data.deadline is not None
            and old_start <= now_utc
            and new_deadline < old_deadline
        ):
            raise BadRequestException(
                message="Chặng nộp bài đang diễn ra hoặc đã qua chỉ được phép gia hạn thêm thời gian, không được thu ngắn hạn chót gây thiệt hại cho thí sinh."
            )

        existing_cps = await checkpoint_repo.get_all(db)
        eff_order = int(
            data.display_order if data.display_order is not None else (cp.display_order or 0)
        )
        if not effective_is_final:
            final_deadlines = [
                ensure_utc(fcp.deadline)
                for fcp in existing_cps
                if fcp.is_final_checkpoint and fcp.is_active and str(fcp.id) != str(cp.id)
            ]
            if final_deadlines and new_deadline > max(final_deadlines):
                raise BadRequestException(
                    message="Hạn chót của chặng tiến độ không được muộn hơn hạn chót của Chặng Chung kết."
                )
            if eff_order > 0 and data.deadline is not None and data.display_order is None:
                for neighbor in existing_cps:
                    if str(neighbor.id) == str(cp.id) or neighbor.is_final_checkpoint:
                        continue
                    n_order = int(neighbor.display_order or 0)
                    if n_order <= 0:
                        continue
                    n_deadline = ensure_utc(neighbor.deadline)
                    if n_order == eff_order - 1 and new_deadline < n_deadline:
                        raise BadRequestException(
                            message=f"Hạn chót của chặng #{eff_order} không được sớm hơn hạn chót của chặng đứng trước ({neighbor.title})."
                        )
                    if n_order == eff_order + 1 and new_deadline > n_deadline:
                        raise BadRequestException(
                            message=f"Hạn chót của chặng #{eff_order} không được vượt quá hạn chót của chặng kế tiếp ({neighbor.title})."
                        )
        else:
            other_finals = [
                fcp for fcp in existing_cps if fcp.is_final_checkpoint and str(fcp.id) != str(cp.id)
            ]
            if other_finals:
                raise BadRequestException(
                    message="Hệ thống chỉ cho phép duy nhất 1 Chặng Chung kết (is_final_checkpoint=true)."
                )
            for pcp in existing_cps:
                if not pcp.is_final_checkpoint and str(pcp.id) != str(cp.id) and new_deadline < ensure_utc(pcp.deadline):
                    raise BadRequestException(
                        message="Hạn chót của Chặng Chung kết không được sớm hơn hạn chót của các chặng tiến độ."
                    )
            from sqlalchemy import select
            from app.models.config import HackathonConfig
            cfg_res = await db.execute(select(HackathonConfig).order_by(HackathonConfig.created_at.asc()))
            cfg = cfg_res.scalars().first()
            if cfg:
                if cfg.start_time and new_deadline <= ensure_utc(cfg.start_time):
                    raise BadRequestException(
                        message="Hạn chót của Chặng Chung kết phải diễn ra sau thời gian bắt đầu cuộc thi."
                    )
                if data.deadline is not None:
                    cfg.end_time = new_deadline
                    db.add(cfg)

        if data.start_time is not None:
            update_fields["start_time"] = new_start
        if data.deadline is not None:
            update_fields["deadline"] = new_deadline

        updated_cp = await checkpoint_repo.update(db, cp, **update_fields)

        # Ghi Audit Log khi Admin gia hạn deadline hoặc cập nhật checkpoint (UAT-CP-13)
        from app.repositories.submission_repo import submission_repo

        is_deadline_extended = data.deadline is not None and new_deadline > old_deadline
        audit_action = (
            "CHECKPOINT_DEADLINE_EXTENDED"
            if is_deadline_extended
            else "CHECKPOINT_UPDATED"
        )
        await submission_repo.create_audit_log(
            db=db,
            user_id=admin_user_id,
            team_id=None,
            checkpoint_id=str(updated_cp.id),
            submission_id=None,
            action=audit_action,
            status="updated",
            late_grace_period=False,
            details={
                "old_deadline": old_deadline.isoformat(),
                "new_deadline": new_deadline.isoformat(),
                "is_deadline_extended": is_deadline_extended,
                "updated_fields": list(update_fields.keys()),
            },
        )

        await db.commit()
        await db.refresh(updated_cp)
        return self.build_checkpoint_response(updated_cp)


    async def toggle_active(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        is_active: bool,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        updated_cp = await checkpoint_repo.toggle_active(db, cp, is_active)
        await db.commit()
        await db.refresh(updated_cp)
        return self.build_checkpoint_response(updated_cp)

    async def delete_checkpoint(
        self,
        db: AsyncSession,
        checkpoint_id: str,
    ) -> None:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        if cp.is_final_checkpoint:
            raise BadRequestException(message="Không thể xóa Chặng Chung kết của cuộc thi.")

        from sqlalchemy import select, func
        from app.models.checkpoint import Submission

        sub_count = await db.scalar(
            select(func.count()).select_from(Submission).where(Submission.checkpoint_id == str(cp.id))
        )
        if sub_count and sub_count > 0:
            raise BadRequestException(
                message="Không thể xóa chặng nộp bài đã có dữ liệu bài nộp của đội thi."
            )

        if cp.is_active and self.calculate_time_gate_info(cp)["status"] == CheckpointStatus.CLOSED.value:
            raise BadRequestException(
                message="Không thể xóa chặng nộp bài đã kết thúc (Đã đóng)."
            )

        await checkpoint_repo.delete(db, cp)
        await db.commit()


checkpoint_service = CheckpointService()

from datetime import datetime, timedelta, timezone
import hashlib
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, Query, Request
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import BadRequestException, ForbiddenException
from app.models.checkpoint import Checkpoint, Submission, SubmissionStatus
from app.models.user import User, UserRole
from app.repositories.team_repo import team_repo
from app.schemas.response import ApiResponse, success_response
from app.schemas.submission import (
    AuditLogResponse,
    SubmissionCreateRequest,
    SubmissionResponse,
)
from app.services.submission_service import submission_service

router = APIRouter()


class FinalProjectSubmitRequest(BaseModel):
    team_id: Optional[str] = None
    github_url: str
    demo_url: Optional[str] = ""
    slide_url: Optional[str] = ""
    description: Optional[str] = ""
    commit_sha: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            normalized = dict(data)
            if "github_url" not in normalized:
                if "repository_url" in normalized:
                    normalized["github_url"] = normalized["repository_url"]
                elif "repo_url" in normalized:
                    normalized["github_url"] = normalized["repo_url"]
            if "demo_url" not in normalized and "demo_video_url" in normalized:
                normalized["demo_url"] = normalized["demo_video_url"]
            if "description" not in normalized and "executive_summary" in normalized:
                normalized["description"] = normalized["executive_summary"]
            return normalized
        return data


def extract_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


@router.post(
    "/final",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Bàn giao sản phẩm cuối cùng (Final Project Submission)",
)
async def submit_final_project(
    body: FinalProjectSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_team_id = body.team_id
    if not effective_team_id:
        mem = await team_repo.get_user_membership(db, str(current_user.id))
        if mem:
            effective_team_id = str(mem.team_id)

    if not effective_team_id:
        raise BadRequestException(message="Không xác định được đội thi cần nộp sản phẩm cuối.")

    if current_user.role == UserRole.CANDIDATE.value:
        mem = await team_repo.get_user_membership(db, str(current_user.id))
        if not mem or str(mem.team_id) != str(effective_team_id):
            raise ForbiddenException(message="Bạn không thuộc đội thi này.")

    # Ensure a Final Checkpoint exists
    cp_stmt = select(Checkpoint).where(Checkpoint.is_final_checkpoint == True).limit(1)  # noqa: E712
    cp_res = await db.execute(cp_stmt)
    final_cp = cp_res.scalar_one_or_none()
    now_utc = datetime.now(timezone.utc)

    if not final_cp:
        final_cp = Checkpoint(
            title="Bàn giao Sản phẩm Cuối cùng (Final Submission)",
            description="Cổng nộp mã nguồn GitHub, Slide thuyết trình và Video Demo chung cuộc.",
            start_time=now_utc - timedelta(hours=2),
            deadline=now_utc + timedelta(days=7),
            is_active=True,
            is_final_checkpoint=True,
            grace_period_seconds=5,
        )
        db.add(final_cp)
        await db.flush()

    clean_repo = body.github_url.strip()
    clean_demo = (body.demo_url or "").strip() or None
    clean_slide = (body.slide_url or "").strip() or None
    clean_desc = (body.description or "").strip() or None
    sha_val = (
        body.commit_sha.strip()
        if body.commit_sha and body.commit_sha.strip()
        else hashlib.sha1(f"{clean_repo}:{now_utc.isoformat()}".encode("utf-8")).hexdigest()[:40]
    )

    sub_data = {
        "repo_url": clean_repo,
        "demo_url": clean_demo or "",
        "slide_url": clean_slide or "",
        "description": clean_desc or "",
    }

    sub_stmt = select(Submission).where(
        Submission.team_id == str(effective_team_id),
        Submission.checkpoint_id == str(final_cp.id),
    )
    sub_res = await db.execute(sub_stmt)
    existing_sub = sub_res.scalar_one_or_none()

    if existing_sub:
        existing_sub.submitted_by = str(current_user.id)
        existing_sub.repo_url = clean_repo
        existing_sub.demo_url = clean_demo or clean_slide
        existing_sub.commit_sha = sha_val
        existing_sub.submission_data = sub_data
        existing_sub.note = clean_desc
        existing_sub.status = SubmissionStatus.SUBMITTED.value
        existing_sub.version = (existing_sub.version or 1) + 1
        existing_sub.submitted_at = now_utc
        target_sub = existing_sub
    else:
        target_sub = Submission(
            checkpoint_id=str(final_cp.id),
            team_id=str(effective_team_id),
            submitted_by=str(current_user.id),
            repo_url=clean_repo,
            demo_url=clean_demo or clean_slide,
            commit_sha=sha_val,
            submission_data=sub_data,
            note=clean_desc,
            status=SubmissionStatus.SUBMITTED.value,
            grace_period_applied=False,
            version=1,
            version_history=[],
            submitted_at=now_utc,
        )
        db.add(target_sub)

    await db.commit()
    await db.refresh(target_sub)

    return success_response(
        data={
            "id": str(target_sub.id),
            "submission_id": str(target_sub.id),
            "team_id": str(target_sub.team_id),
            "checkpoint_id": str(target_sub.checkpoint_id),
            "github_url": clean_repo,
            "repo_url": clean_repo,
            "commit_sha": sha_val,
            "demo_url": clean_demo or "",
            "slide_url": clean_slide or "",
            "description": clean_desc or "",
            "submitted_at": now_utc.isoformat(),
        },
        message="Bàn giao sản phẩm cuối cùng thành công.",
    )


@router.post(
    "",
    response_model=ApiResponse[SubmissionResponse],
    summary="Nộp bài hoặc cập nhật bài nộp cho Checkpoint (HF-34 & SRS HF-23)",
)
async def create_or_update_submission(
    request: Request,
    body: SubmissionCreateRequest,
    idempotency_key: Optional[str] = Header(
        None,
        alias="Idempotency-Key",
        description="Khóa chống gửi trùng lặp (UUID) từ phía Client",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[SubmissionResponse]:
    client_ip = extract_client_ip(request)
    submission_res, message = await submission_service.submit_checkpoint(
        db=db,
        user=current_user,
        payload=body,
        idempotency_key=idempotency_key,
        client_ip=client_ip,
    )
    return success_response(
        data=submission_res,
        message=message,
    )


@router.get(
    "",
    response_model=ApiResponse[List[SubmissionResponse]],
    summary="Lấy danh sách bài nộp và lịch sử phiên bản (HF-31 & HF-34)",
)
async def list_submissions(
    checkpoint_id: Optional[str] = Query(None, description="Lọc theo UUID của Checkpoint"),
    team_id: Optional[str] = Query(None, description="Lọc theo UUID của Đội thi (Dành cho Admin/Judge/Mentor)"),
    include_history: bool = Query(
        True,
        description="True: Trả kèm các phiên bản lịch sử trước đó (phục vụ bảng lịch sử nộp bài HF-31)",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[SubmissionResponse]]:
    submissions = await submission_service.list_submissions(
        db=db,
        user=current_user,
        checkpoint_id=checkpoint_id,
        team_id=team_id,
        include_history=include_history,
    )
    return success_response(
        data=submissions,
        message=f"Lấy danh sách lịch sử bài nộp thành công ({len(submissions)} bản ghi).",
    )


@router.get(
    "/audit-logs",
    response_model=ApiResponse[List[AuditLogResponse]],
    summary="Truy vấn nhật ký Audit Log nộp bài & gia hạn Checkpoint (HF-34)",
)
async def list_submission_audit_logs(
    checkpoint_id: Optional[str] = Query(None, description="Lọc theo UUID của Checkpoint"),
    team_id: Optional[str] = Query(None, description="Lọc theo UUID của Đội thi"),
    submission_id: Optional[str] = Query(None, description="Lọc theo UUID của Bài nộp"),
    action: Optional[str] = Query(None, description="Lọc theo mã hành động (vd: SUBMISSION_CREATED, SUBMISSION_RESUBMITTED)"),
    late_grace_period: Optional[bool] = Query(None, description="Lọc các lượt nộp bài trong khoảng ân hạn mạng (Grace Period)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[AuditLogResponse]]:
    logs = await submission_service.list_audit_logs(
        db=db,
        user=current_user,
        checkpoint_id=checkpoint_id,
        team_id=team_id,
        submission_id=submission_id,
        action=action,
        late_grace_period=late_grace_period,
    )
    return success_response(
        data=logs,
        message=f"Lấy danh sách Audit Log thành công ({len(logs)} bản ghi).",
    )


@router.get(
    "/{submission_id}",
    response_model=ApiResponse[SubmissionResponse],
    summary="Xem chi tiết một bản ghi bài nộp theo ID",
)
async def get_submission_detail(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[SubmissionResponse]:
    submission = await submission_service.get_submission_by_id(
        db=db,
        user=current_user,
        submission_id=submission_id,
    )
    return success_response(
        data=submission,
        message="Lấy chi tiết bài nộp thành công.",
    )

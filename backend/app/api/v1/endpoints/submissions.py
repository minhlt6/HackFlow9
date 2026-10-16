from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.response import ApiResponse, success_response
from app.schemas.submission import (
    AuditLogResponse,
    SubmissionCreateRequest,
    SubmissionResponse,
)
from app.services.submission_service import submission_service

router = APIRouter()


def extract_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


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
    """
    API tiếp nhận, xác thực và lưu trữ bài nộp Checkpoint (HF-34 & SRS HF-23 Mục 2, 3, 4, 5, 6):
    - Kiểm tra tài khoản `APPROVED` (403 `ACCOUNT_NOT_APPROVED`) và vai trò `TEAM_LEADER` (403 `FORBIDDEN_NOT_TEAM_LEADER`).
    - Kiểm tra trạng thái mở cổng Checkpoint (400 `INVALID_CHECKPOINT_STATUS`) và hạn chót kèm Grace Period (400 `DEADLINE_EXCEEDED`).
    - Hỗ trợ `Idempotency-Key` và phát hiện request trùng lặp trong cửa sổ 10 giây.
    - Kiểm tra đầy đủ trường động `submission_fields` (422 `MISSING_REQUIRED_FIELD`).
    - Ghi nhận trạng thái trung gian `pending_sha_freeze` kèm `submitted_at` của Server trước khi gọi GitHub API.
    - Đối với `is_final_checkpoint = true`: đóng băng HEAD Commit SHA từ GitHub (HF-33); tự động rollback về bản `submitted` hợp lệ trước đó nếu repo lỗi 422; hoặc kích hoạt Graceful Fallback (`sha_verification_failed`, 200 OK) nếu GitHub API gián đoạn 503.
    - Ghi vết vào bảng `audit_logs` kèm cờ `late_grace_period`.
    """
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
    """
    Truy vấn danh sách bài nộp và lịch sử các phiên bản nộp lại (Resubmission Version History).
    """
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
    """
    Truy vấn bảng `audit_logs` phục vụ rà soát của Ban tổ chức và đối chiếu cờ `late_grace_period`.
    """
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
    """
    Xem chi tiết thông tin bài nộp, Commit SHA đóng băng và lịch sử các phiên bản trước đó.
    """
    submission = await submission_service.get_submission_by_id(
        db=db,
        user=current_user,
        submission_id=submission_id,
    )
    return success_response(
        data=submission,
        message="Lấy chi tiết bài nộp thành công.",
    )

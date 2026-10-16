from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_current_user, require_role
from app.api.v1.endpoints.submissions import extract_client_ip
from app.core.database import get_db
from app.models.user import User
from app.schemas.checkpoint import (
    CheckpointCreateRequest,
    CheckpointResponse,
    CheckpointTimeGatedStatusResponse,
    CheckpointToggleActiveRequest,
    CheckpointUpdateRequest,
    CheckpointValidateWindowRequest,
    ValidateSubmissionWindowResponse,
)
from app.schemas.github import VerifyGitHubRepoRequest, VerifyGitHubRepoResponse
from app.schemas.response import ApiResponse, success_response
from app.schemas.submission import SubmissionCreateRequest, SubmissionResponse
from app.services.checkpoint_service import checkpoint_service
from app.services.github_service import github_service
from app.services.submission_service import submission_service

router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[List[CheckpointResponse]],
    summary="Lấy danh sách các mốc Checkpoint của cuộc thi",
)
async def list_checkpoints(
    only_active: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> ApiResponse[List[CheckpointResponse]]:
    """
    Hiển thị danh sách các mốc nộp bài (Milestones/Checkpoints) kèm thông tin
    trạng thái time-gated (upcoming, open, grace_period, closed), số giây còn lại
    và bài nộp mới nhất của đội thi (nếu đã đăng nhập).
    """
    user_id = str(current_user.id) if current_user else None
    checkpoints = await checkpoint_service.list_checkpoints(
        db, only_active=only_active, user_id=user_id
    )
    return success_response(
        data=checkpoints,
        message=f"Lấy danh sách checkpoint thành công ({len(checkpoints)} mốc).",
    )


@router.post(
    "/verify-github-repo",
    response_model=ApiResponse[VerifyGitHubRepoResponse],
    summary="Xác thực kho mã nguồn GitHub và trích xuất HEAD Commit SHA (HF-33)",
)
async def verify_github_repo(
    body: VerifyGitHubRepoRequest,
    _: User = Depends(get_current_user),
) -> ApiResponse[VerifyGitHubRepoResponse]:
    """
    Module xác thực repository GitHub công khai và trích xuất HEAD Commit SHA mới nhất (HF-33):
    - Parse owner/repo từ URL hợp lệ (hỗ trợ .git, tree/branch, format shorthand).
    - Gọi GitHub REST API xác thực trạng thái public và commit mới nhất.
    - Cơ chế Retry 3 lần đối với sự cố kết nối / timeout.
    - Graceful Fallback (bảo lưu trạng thái đối soát thủ công) nếu hạ tầng GitHub gặp sự cố.
    - Từ chối HTTP 422 (GITHUB_REPO_INACCESSIBLE) nếu repo là Private hoặc không tồn tại.
    """
    result = await github_service.fetch_head_commit(
        repo_url=body.repo_url,
        branch=body.branch,
    )
    return success_response(
        data=result,
        message=result.message,
    )


@router.get(
    "/{checkpoint_id}",
    response_model=ApiResponse[CheckpointResponse],
    summary="Xem chi tiết một Checkpoint",
)
async def get_checkpoint(
    checkpoint_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> ApiResponse[CheckpointResponse]:
    """
    Lấy thông tin chi tiết một mốc Checkpoint theo UUID.
    """
    user_id = str(current_user.id) if current_user else None
    checkpoint = await checkpoint_service.get_checkpoint_by_id(
        db, checkpoint_id, user_id=user_id
    )
    return success_response(
        data=checkpoint,
        message=f"Lấy chi tiết checkpoint '{checkpoint.title}' thành công.",
    )


@router.get(
    "/{checkpoint_id}/status",
    response_model=ApiResponse[CheckpointTimeGatedStatusResponse],
    summary="Kiểm tra trạng thái Time-gated của Checkpoint (Mở/Khóa cổng)",
)
async def get_checkpoint_time_gated_status(
    checkpoint_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[CheckpointTimeGatedStatusResponse]:
    """
    Truy vấn trạng thái time-gated thời gian thực:
    - Server Time (UTC)
    - Trạng thái: 'upcoming' | 'open' | 'grace_period' | 'closed'
    - Cờ can_submit, grace_period_applied (5s network latency), thời gian đếm ngược.
    """
    status_info = await checkpoint_service.get_time_gated_status(db, checkpoint_id)
    return success_response(
        data=status_info,
        message=status_info.message,
    )


@router.post(
    "/{checkpoint_id}/validate-window",
    response_model=ApiResponse[ValidateSubmissionWindowResponse],
    summary="Kiểm tra điều kiện hợp lệ để nộp bài (Time-gated Validation)",
)
async def validate_submission_window(
    checkpoint_id: str,
    body: CheckpointValidateWindowRequest = CheckpointValidateWindowRequest(),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[ValidateSubmissionWindowResponse]:
    """
    API xác thực cửa sổ thời gian nộp bài nghiêm ngặt theo Acceptance Criteria HF-32:
    - Trả về HTTP 200 OK nếu nằm trong khung giờ hợp lệ [start_time, deadline] hoặc Grace Period [deadline, deadline + 5s].
    - Ném HTTP 403 Forbidden nếu:
      + Chưa đến giờ mở cổng: error_code="CHECKPOINT_NOT_OPEN"
      + Quá hạn nộp bài: error_code="DEADLINE_EXCEEDED"
      + BTC đã khóa checkpoint: error_code="CHECKPOINT_INACTIVE"
    """
    result = await checkpoint_service.verify_submission_window(
        db, checkpoint_id, simulate_time=body.simulate_time
    )
    return success_response(
        data=result,
        message=result.message,
    )


@router.post(
    "/{checkpoint_id}/submissions",
    response_model=ApiResponse[SubmissionResponse],
    summary="Nộp bài cho một Checkpoint cụ thể (Tương thích Frontend HF-30 & SRS HF-23)",
)
async def submit_checkpoint_by_path(
    checkpoint_id: str,
    request: Request,
    body: SubmissionCreateRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[SubmissionResponse]:
    """
    Endpoint nộp bài theo đường dẫn `/checkpoints/{checkpoint_id}/submissions` (HF-30 & HF-34).
    """
    client_ip = extract_client_ip(request)
    submission_res, message = await submission_service.submit_checkpoint(
        db=db,
        user=current_user,
        payload=body,
        checkpoint_id_override=checkpoint_id,
        idempotency_key=idempotency_key,
        client_ip=client_ip,
    )
    return success_response(
        data=submission_res,
        message=message,
    )


@router.get(
    "/{checkpoint_id}/submissions",
    response_model=ApiResponse[List[SubmissionResponse]],
    summary="Lấy lịch sử bài nộp của một Checkpoint cụ thể (HF-31 & HF-34)",
)
async def list_checkpoint_submissions_by_path(
    checkpoint_id: str,
    include_history: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[SubmissionResponse]]:
    """
    Lấy danh sách bài nộp và lịch sử phiên bản của một Checkpoint cụ thể.
    """
    submissions = await submission_service.list_submissions(
        db=db,
        user=current_user,
        checkpoint_id=checkpoint_id,
        include_history=include_history,
    )
    return success_response(
        data=submissions,
        message=f"Lấy lịch sử bài nộp thành công ({len(submissions)} bản ghi).",
    )


@router.post(
    "",
    response_model=ApiResponse[CheckpointResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới mốc Checkpoint (Chỉ Admin)",
)
async def create_checkpoint(
    body: CheckpointCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[CheckpointResponse]:
    """
    Ban Tổ Chức (BTC) cấu hình mốc Checkpoint mới kèm thời gian bắt đầu và hạn chót.
    """
    checkpoint = await checkpoint_service.create_checkpoint(db, body)
    return success_response(
        data=checkpoint,
        message=f"Tạo checkpoint '{checkpoint.title}' thành công.",
        status_code=status.HTTP_201_CREATED,
    )


@router.put(
    "/{checkpoint_id}",
    response_model=ApiResponse[CheckpointResponse],
    summary="Cập nhật mốc Checkpoint (Chỉ Admin)",
)
async def update_checkpoint(
    checkpoint_id: str,
    body: CheckpointUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_role("admin")),
) -> ApiResponse[CheckpointResponse]:
    """
    Ban Tổ Chức (BTC) gia hạn thời gian nộp bài hoặc sửa đổi thông tin Checkpoint.
    """
    checkpoint = await checkpoint_service.update_checkpoint(
        db, checkpoint_id, body, admin_user_id=str(admin_user.id)
    )
    return success_response(
        data=checkpoint,
        message=f"Cập nhật checkpoint '{checkpoint.title}' thành công.",
    )


@router.patch(
    "/{checkpoint_id}/toggle-active",
    response_model=ApiResponse[CheckpointResponse],
    summary="Khóa hoặc Mở kích hoạt mốc Checkpoint (Chỉ Admin)",
)
async def toggle_active_checkpoint(
    checkpoint_id: str,
    body: CheckpointToggleActiveRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[CheckpointResponse]:
    """
    Ban Tổ Chức (BTC) chủ động khóa khẩn cấp hoặc mở lại cổng Checkpoint.
    """
    checkpoint = await checkpoint_service.toggle_active(db, checkpoint_id, body.is_active)
    state_str = "kích hoạt" if body.is_active else "tạm khóa"
    return success_response(
        data=checkpoint,
        message=f"Đã {state_str} checkpoint '{checkpoint.title}'.",
    )


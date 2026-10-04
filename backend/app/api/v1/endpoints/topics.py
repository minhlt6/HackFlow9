from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_approved
from app.core.database import get_db
from app.models.user import User
from app.schemas.response import ApiResponse, success_response
from app.schemas.topic import (
    TopicCancelRequest,
    TopicResponse,
    TopicSelectRequest,
    TopicSelectResponse,
)
from app.services.topic_service import topic_service

router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[List[TopicResponse]],
    summary="Xem danh sách đề tài và chỉ tiêu đăng ký (Quota)",
)
async def list_topics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[List[TopicResponse]]:
    """
    Hiển thị toàn bộ danh sách đề tài đang mở kèm thông tin quota và subtopics.
    """
    topics = await topic_service.list_topics(db)
    return success_response(
        data=topics,
        message=f"Lấy danh sách đề tài thành công ({len(topics)} đề tài).",
    )


@router.post(
    "/select",
    response_model=ApiResponse[TopicSelectResponse],
    summary="Đăng ký chọn đề tài cho đội thi",
)
async def select_topic(
    body: TopicSelectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved()),
) -> ApiResponse[TopicSelectResponse]:
    """
    Đăng ký đề tài bằng giao dịch nguyên tử (SELECT FOR UPDATE) để chống tranh chấp đồng thời (race condition).
    Yêu cầu:
    - Tài khoản APPROVED
    - Đội thi hợp lệ (tối thiểu 3 thành viên)
    - Đề tài còn quota
    """
    result = await topic_service.select_topic(db, current_user, body)
    return success_response(
        data=result,
        message=f"Đăng ký đề tài '{result.topic_title}' thành công.",
    )


@router.post(
    "/cancel",
    response_model=ApiResponse[dict],
    summary="Hủy chọn đề tài cho đội thi",
)
async def cancel_topic(
    body: TopicCancelRequest = TopicCancelRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved()),
) -> ApiResponse[dict]:
    """
    Hủy đề tài đã đăng ký (chỉ Đội trưởng được thao tác trong thời hạn cho phép).
    """
    result = await topic_service.cancel_topic_selection(db, current_user, body.team_id)
    return success_response(
        data=result,
        message="Hủy chọn đề tài thành công.",
    )

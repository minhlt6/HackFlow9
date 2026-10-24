from typing import List, Optional
from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_approved, require_role
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.response import ApiResponse
from app.schemas.topic import (
    SubtopicCreateRequest,
    SubtopicResponse,
    SubtopicUpdateRequest,
    TopicCancelRequest,
    TopicCreateRequest,
    TopicResponse,
    TopicSelectRequest,
    TopicSelectResponse,
)
from app.services.topic_service import topic_service

router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[List[TopicResponse]],
    summary="Danh sách đề tài và trạng thái quota (HF-21)",
)
async def list_topics(
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách toàn bộ đề tài cuộc thi cùng số lượng slot còn lại và danh sách subtopics.
    """
    topics = await topic_service.list_topics(db)
    return ApiResponse.ok(
        data=topics,
        message="Tải danh sách đề tài thành công.",
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiResponse[TopicResponse],
    summary="Tạo mảng đề tài chính mới (Admin)",
)
async def create_topic(
    req: TopicCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value])),
):
    result = await topic_service.create_topic(db, req)
    return ApiResponse.ok(
        data=result,
        message=f"Đã tạo mảng đề tài '{result.title}' thành công.",
    )


@router.put(
    "/{topic_id}",
    response_model=ApiResponse[TopicResponse],
    summary="Cập nhật mảng đề tài chính hoặc subtopic (Admin)",
)
async def update_topic(
    topic_id: str,
    req: SubtopicUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value])),
):
    result = await topic_service.update_topic(db, topic_id, req)
    return ApiResponse.ok(
        data=result,
        message="Cập nhật đề tài thành công.",
    )


@router.delete(
    "/subtopics/{subtopic_id}",
    response_model=ApiResponse[dict],
    summary="Xóa đề tài chi tiết (subtopic) (Admin)",
)
async def delete_subtopic(
    subtopic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value])),
):
    result = await topic_service.delete_subtopic(db, subtopic_id)
    return ApiResponse.ok(
        data=result,
        message="Đã xóa đề tài chi tiết thành công.",
    )


@router.delete(
    "/{topic_id}",
    response_model=ApiResponse[dict],
    summary="Xóa mảng đề tài chính (Admin)",
)
async def delete_topic(
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value])),
):
    result = await topic_service.delete_topic(db, topic_id)
    return ApiResponse.ok(
        data=result,
        message="Đã xóa mảng đề tài thành công.",
    )


@router.post(
    "/{topic_id}/subtopics",
    status_code=status.HTTP_201_CREATED,
    response_model=ApiResponse[TopicResponse],
    summary="Thêm đề tài chi tiết (subtopic) vào mảng đề tài chính (Admin)",
)
async def create_subtopic(
    topic_id: str,
    req: SubtopicCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value])),
):
    result = await topic_service.create_subtopic(db, topic_id, req)
    return ApiResponse.ok(
        data=result,
        message=f"Đã thêm đề tài chi tiết '{req.title}' thành công.",
    )


@router.patch(
    "/subtopics/{subtopic_id}",
    response_model=ApiResponse[SubtopicResponse],
    summary="Cập nhật quota / thông tin đề tài chi tiết (Admin)",
)
async def update_subtopic(
    subtopic_id: str,
    req: SubtopicUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN.value])),
):
    result = await topic_service.update_subtopic(db, subtopic_id, req)
    return ApiResponse.ok(
        data=result,
        message="Cập nhật đề tài chi tiết thành công.",
    )


@router.post(
    "/select",
    response_model=ApiResponse[TopicSelectResponse],
    summary="Chọn đề tài cho đội thi (Atomic Transaction / Concurrency Safe)",
)
async def select_topic(
    req: TopicSelectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved()),
):
    """
    Đăng ký đề tài cho đội thi của người dùng hiện tại.
    Chỉ đội trưởng (leader) của đội đã đủ tối thiểu 3 thành viên mới được phép chọn.
    Áp dụng khóa bi quan (SELECT FOR UPDATE) để chống race condition khi nhiều đội cùng chọn slot cuối.
    """
    result = await topic_service.select_topic(db, current_user, req)
    return ApiResponse.ok(
        data=result,
        message=f"Đã đăng ký đề tài '{result.topic_title}' thành công.",
    )


@router.post(
    "/cancel",
    response_model=ApiResponse[dict],
    summary="Hủy đề tài đã chọn trong thời gian cho phép",
)
async def cancel_topic(
    req: Optional[TopicCancelRequest] = Body(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hủy đăng ký đề tài của đội thi trong thời gian cho phép và hoàn trả slot vào quota đề tài.
    """
    team_id = req.team_id if req else None
    result = await topic_service.cancel_topic_selection(db, current_user, team_id=team_id)
    return ApiResponse.ok(
        data=result,
        message="Đã hủy đăng ký đề tài thành công.",
    )

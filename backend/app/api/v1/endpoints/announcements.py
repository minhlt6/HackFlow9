from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementPaginationResponse,
    AnnouncementResponse,
    AnnouncementUpdate,
)
from app.schemas.response import ApiResponse, success_response
from app.services.announcement_service import announcement_service

router = APIRouter()


@router.post(
    "",
    response_model=ApiResponse[AnnouncementResponse],
    summary="Tạo thông báo mới (Chỉ Admin/BTC)",
    status_code=201,
)
async def create_announcement(
    body: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role("admin")),
):
    """
    Tạo thông báo mới cho cuộc thi.
    Yêu cầu quyền Admin/BTC — trả 403 FORBIDDEN nếu không đủ quyền.
    Dữ liệu không hợp lệ sẽ trả 422.
    """
    announcement = await announcement_service.create_announcement(db, body)
    return success_response(
        data=AnnouncementResponse.model_validate(announcement),
        message="Tạo thông báo thành công.",
        status_code=201,
    )


@router.get(
    "",
    response_model=ApiResponse[AnnouncementPaginationResponse],
    summary="Xem danh sách thông báo (phân trang)",
)
async def list_announcements(
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Số bản ghi mỗi trang"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách thông báo với phân trang.
    Mọi User đã đăng nhập đều có quyền truy cập.
    Kết quả sắp xếp theo thời gian tạo giảm dần (mới nhất lên trước).
    """
    items, total = await announcement_service.list_announcements(
        db, page=page, page_size=page_size, role=_current_user.role,
    )
    pagination = AnnouncementPaginationResponse(
        items=[AnnouncementResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )
    return success_response(
        data=pagination,
        message=f"Lấy danh sách thông báo thành công ({total} bản ghi).",
    )


@router.put(
    "/{announcement_id}",
    response_model=ApiResponse[AnnouncementResponse],
    summary="Cập nhật thông báo (Chỉ Admin/BTC)",
)
async def update_announcement(
    announcement_id: str,
    body: AnnouncementUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role("admin")),
):
    """
    Cập nhật nội dung thông báo theo ID.
    Yêu cầu quyền Admin/BTC — trả 403 nếu không đủ quyền, 404 nếu không tìm thấy.
    """
    updated = await announcement_service.update_announcement(db, announcement_id, body)
    return success_response(
        data=AnnouncementResponse.model_validate(updated),
        message="Cập nhật thông báo thành công.",
    )


@router.delete(
    "/{announcement_id}",
    response_model=ApiResponse[AnnouncementResponse],
    summary="Xóa thông báo (Chỉ Admin/BTC)",
)
async def delete_announcement(
    announcement_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_role("admin")),
):
    """
    Xóa thông báo theo ID.
    Yêu cầu quyền Admin/BTC — trả 403 nếu không đủ quyền, 404 nếu không tìm thấy.
    """
    deleted = await announcement_service.delete_announcement(db, announcement_id)
    return success_response(
        data=AnnouncementResponse.model_validate(deleted),
        message="Xóa thông báo thành công.",
    )

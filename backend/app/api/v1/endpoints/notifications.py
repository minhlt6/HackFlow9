from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_current_user
from app.core.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.response import ApiResponse

router = APIRouter()

# Per-user read and dismiss sets in memory (keyed by user_id or "anonymous")
_READ_BY_USER: Dict[str, Set[str]] = {}
_DISMISSED_BY_USER: Dict[str, Set[str]] = {}


def _user_key(user: Optional[User]) -> str:
    return str(user.id) if user else "anonymous"


def _build_notification_item(
    ann: Announcement,
    read_ids: Set[str],
    dismissed_ids: Set[str],
) -> Dict[str, Any]:
    ann_id = str(ann.id)
    priority_val = (ann.priority or "info").lower()
    if priority_val not in ("info", "warning", "urgent"):
        priority_val = "info"
    created_at_str = (
        ann.created_at.isoformat()
        if ann.created_at
        else datetime.now(timezone.utc).isoformat()
    )
    return {
        "id": ann_id,
        "title": ann.title,
        "content": ann.content,
        "type": priority_val,
        "target_roles": ["all"],
        "target_team_ids": [],
        "created_by": "BTC HackFlow",
        "created_at": created_at_str,
        "is_read": ann_id in read_ids,
        "is_dismissed": ann_id in dismissed_ids,
    }


@router.get(
    "/me",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="Lấy danh sách thông báo của người dùng hiện tại",
)
async def get_my_notifications(
    type_filter: Optional[str] = Query(None, alias="type"),
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    stmt = select(Announcement).order_by(Announcement.created_at.desc())
    res = await db.execute(stmt)
    announcements = list(res.scalars().all())

    u_key = _user_key(current_user)
    read_ids = _READ_BY_USER.setdefault(u_key, set())
    dismissed_ids = _DISMISSED_BY_USER.setdefault(u_key, set())

    items = [_build_notification_item(a, read_ids, dismissed_ids) for a in announcements]

    if type_filter and type_filter != "all":
        items = [i for i in items if i["type"] == type_filter]
    if unread_only:
        items = [i for i in items if not i["is_read"]]

    start = (page - 1) * page_size
    paged = items[start : start + page_size]

    return ApiResponse.ok(
        data=paged,
        message="Tải danh sách thông báo thành công.",
    )


@router.get(
    "/unread-count",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Đếm số lượng thông báo chưa đọc",
)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    stmt = select(Announcement).order_by(Announcement.created_at.desc())
    res = await db.execute(stmt)
    announcements = list(res.scalars().all())

    u_key = _user_key(current_user)
    read_ids = _READ_BY_USER.setdefault(u_key, set())

    unread_items = [a for a in announcements if str(a.id) not in read_ids]
    has_urgent = any((a.priority or "").lower() == "urgent" for a in unread_items)

    return ApiResponse.ok(
        data={
            "unread_count": len(unread_items),
            "has_urgent_unread": has_urgent,
        },
        message="Lấy số lượng thông báo chưa đọc thành công.",
    )


@router.patch(
    "/read-all",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Đánh dấu tất cả thông báo là đã đọc",
)
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    stmt = select(Announcement.id)
    res = await db.execute(stmt)
    all_ids = {str(r) for r in res.scalars().all()}

    u_key = _user_key(current_user)
    read_ids = _READ_BY_USER.setdefault(u_key, set())
    before_len = len(read_ids)
    read_ids.update(all_ids)
    updated_count = max(0, len(read_ids) - before_len)

    return ApiResponse.ok(
        data={"updated_count": updated_count},
        message="Đã đánh dấu tất cả thông báo là đã đọc.",
    )


@router.patch(
    "/{notification_id}/read",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Đánh dấu 1 thông báo là đã đọc",
)
async def mark_as_read(
    notification_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    u_key = _user_key(current_user)
    read_ids = _READ_BY_USER.setdefault(u_key, set())
    read_ids.add(notification_id)

    return ApiResponse.ok(
        data={
            "id": notification_id,
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat(),
        },
        message="Đã đánh dấu thông báo là đã đọc.",
    )


@router.post(
    "/{notification_id}/dismiss",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Ẩn / đóng thông báo",
)
async def dismiss_notification(
    notification_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    u_key = _user_key(current_user)
    read_ids = _READ_BY_USER.setdefault(u_key, set())
    dismissed_ids = _DISMISSED_BY_USER.setdefault(u_key, set())
    read_ids.add(notification_id)
    dismissed_ids.add(notification_id)

    return ApiResponse.ok(
        data={
            "id": notification_id,
            "is_dismissed": True,
            "dismissed_at": datetime.now(timezone.utc).isoformat(),
        },
        message="Đã đóng thông báo.",
    )

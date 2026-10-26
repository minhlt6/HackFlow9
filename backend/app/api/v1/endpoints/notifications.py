from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.response import ApiResponse

router = APIRouter()

async def _visible_announcement(db: AsyncSession, user: User, notification_id: str):
    from app.core.exceptions import NotFoundException
    ann = await db.get(Announcement, notification_id)
    if not ann or (user.role != "admin" and ann.target_audience not in ("all", user.role)):
        raise NotFoundException(message="Không tìm thấy thông báo.", error_code="TARGET_NOT_FOUND")
    return ann


def _receipt_sets(user: User):
    state = user.notification_state or {}
    return set(state.get("read", [])), set(state.get("dismissed", []))


async def _save_receipts(db: AsyncSession, user: User, read_ids: Set[str], dismissed_ids: Set[str]):
    user.notification_state = {"read": sorted(read_ids), "dismissed": sorted(dismissed_ids)}
    db.add(user)
    await db.commit()


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
        "target_roles": [ann.target_audience],
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
    current_user: User = Depends(get_current_user),
):
    stmt = select(Announcement).order_by(Announcement.created_at.desc())
    if not current_user or current_user.role != "admin":
        stmt = stmt.where(Announcement.target_audience.in_(["all", current_user.role if current_user else "anonymous"]))
    res = await db.execute(stmt)
    announcements = list(res.scalars().all())

    read_ids, dismissed_ids = _receipt_sets(current_user)

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
    current_user: User = Depends(get_current_user),
):
    stmt = select(Announcement).order_by(Announcement.created_at.desc())
    if not current_user or current_user.role != "admin":
        stmt = stmt.where(Announcement.target_audience.in_(["all", current_user.role if current_user else "anonymous"]))
    res = await db.execute(stmt)
    announcements = list(res.scalars().all())

    read_ids, dismissed_ids = _receipt_sets(current_user)

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
    current_user: User = Depends(get_current_user),
):
    stmt = select(Announcement.id)
    if not current_user or current_user.role != "admin":
        stmt = stmt.where(Announcement.target_audience.in_(["all", current_user.role if current_user else "anonymous"]))
    res = await db.execute(stmt)
    all_ids = {str(r) for r in res.scalars().all()}

    read_ids, dismissed_ids = _receipt_sets(current_user)
    before_len = len(read_ids)
    read_ids.update(all_ids)
    updated_count = max(0, len(read_ids) - before_len)
    await _save_receipts(db, current_user, read_ids, dismissed_ids)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    read_ids, dismissed_ids = _receipt_sets(current_user)
    await _visible_announcement(db, current_user, notification_id)
    read_ids.add(notification_id)
    await _save_receipts(db, current_user, read_ids, dismissed_ids)

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    read_ids, dismissed_ids = _receipt_sets(current_user)
    await _visible_announcement(db, current_user, notification_id)
    read_ids.add(notification_id)
    dismissed_ids.add(notification_id)
    await _save_receipts(db, current_user, read_ids, dismissed_ids)

    return ApiResponse.ok(
        data={
            "id": notification_id,
            "is_dismissed": True,
            "dismissed_at": datetime.now(timezone.utc).isoformat(),
        },
        message="Đã đóng thông báo.",
    )

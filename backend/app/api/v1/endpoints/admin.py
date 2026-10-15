from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.user import ApprovalStatus, User
from app.repositories.user_repo import user_repo
from app.repositories.whitelist_repo import whitelist_repo
from app.schemas.admin import (
    CandidateApprovalRequest,
    CandidatePendingResponse,
    WhitelistAddRequest,
    WhitelistBulkAddRequest,
    WhitelistBulkAddResponse,
    WhitelistDeactivateResponse,
    WhitelistEntryResponse,
)
from app.schemas.auth import UserResponse
from app.schemas.response import ApiResponse, success_response

router = APIRouter(prefix="/admin", tags=["Admin"])

# ─── Whitelist Management ────────────────────────────────────────────────────


@router.get(
    "/whitelist",
    response_model=ApiResponse[List[WhitelistEntryResponse]],
    summary="Xem toàn bộ Whitelist",
)
async def list_whitelist(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[List[WhitelistEntryResponse]]:
    """BTC xem danh sách email được phép đăng nhập."""
    entries = await whitelist_repo.get_all(db, include_inactive=include_inactive)
    data = [
        WhitelistEntryResponse(
            id=str(e.id),
            email=e.email,
            is_active=e.is_active,
            note=e.note,
            added_by=str(e.added_by) if e.added_by else None,
            created_at=e.created_at.isoformat() if e.created_at else None,
        )
        for e in entries
    ]
    return success_response(data=data, message=f"Có {len(data)} email trong whitelist.")


@router.post(
    "/whitelist",
    response_model=ApiResponse[WhitelistEntryResponse],
    summary="Thêm 1 email vào Whitelist",
    status_code=201,
)
async def add_to_whitelist(
    body: WhitelistAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistEntryResponse]:
    """BTC thêm 1 email đơn lẻ vào Whitelist."""
    entry = await whitelist_repo.add_email(
        db, body.email, added_by=str(current_user.id), note=body.note
    )
    existing_user = await user_repo.get_by_email(db, body.email)
    if existing_user and existing_user.approval_status == ApprovalStatus.PENDING.value:
        existing_user.approval_status = ApprovalStatus.APPROVED.value
        db.add(existing_user)
    await db.commit()
    await db.refresh(entry)
    data = WhitelistEntryResponse(
        id=str(entry.id),
        email=entry.email,
        is_active=entry.is_active,
        note=entry.note,
        added_by=str(entry.added_by) if entry.added_by else None,
        created_at=entry.created_at.isoformat() if entry.created_at else None,
    )
    return success_response(
        data=data,
        message="Email đã được thêm vào whitelist.",
        status_code=201,
    )


@router.post(
    "/whitelist/bulk",
    response_model=ApiResponse[WhitelistBulkAddResponse],
    summary="Import nhiều email vào Whitelist",
    status_code=201,
)
async def bulk_add_whitelist(
    body: WhitelistBulkAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistBulkAddResponse]:
    """BTC import danh sách email từ kết quả chọn lọc thí sinh."""
    entries = await whitelist_repo.bulk_add(
        db, body.emails, added_by=str(current_user.id), note=body.note
    )
    for email_str in body.emails:
        existing_user = await user_repo.get_by_email(db, email_str)
        if existing_user and existing_user.approval_status == ApprovalStatus.PENDING.value:
            existing_user.approval_status = ApprovalStatus.APPROVED.value
            db.add(existing_user)
    await db.commit()
    data = WhitelistBulkAddResponse(
        imported=len(entries),
        emails=[e.email for e in entries],
    )
    return success_response(
        data=data,
        message=f"Đã import {len(entries)} email vào whitelist.",
        status_code=201,
    )


@router.delete(
    "/whitelist/{entry_id}",
    response_model=ApiResponse[WhitelistDeactivateResponse],
    summary="Vô hiệu hóa 1 email khỏi Whitelist",
)
async def deactivate_whitelist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistDeactivateResponse]:
    """BTC vô hiệu hóa (soft-delete) 1 email khỏi Whitelist."""
    entry = await whitelist_repo.deactivate(db, entry_id)
    if not entry:
        raise NotFoundException(message="Không tìm thấy entry Whitelist.")
    await db.commit()
    return success_response(
        data=WhitelistDeactivateResponse(id=entry_id, email=entry.email, is_active=False),
        message="Email đã bị vô hiệu hóa khỏi whitelist.",
    )


@router.patch(
    "/whitelist/{entry_id}/reactivate",
    response_model=ApiResponse[WhitelistDeactivateResponse],
    summary="Kích hoạt lại 1 email",
)
async def reactivate_whitelist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[WhitelistDeactivateResponse]:
    """BTC kích hoạt lại email đã tắt trong Whitelist."""
    entry = await whitelist_repo.reactivate(db, entry_id)
    if not entry:
        raise NotFoundException(message="Không tìm thấy entry Whitelist.")
    await db.commit()
    return success_response(
        data=WhitelistDeactivateResponse(id=entry_id, email=entry.email, is_active=True),
        message="Email đã được kích hoạt lại trong whitelist.",
    )


# ─── Candidate Approval ──────────────────────────────────────────────────────


@router.get(
    "/candidates/pending",
    response_model=ApiResponse[List[CandidatePendingResponse]],
    summary="Danh sách thí sinh chờ duyệt",
)
async def list_pending_candidates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> ApiResponse[List[CandidatePendingResponse]]:
    """BTC xem toàn bộ tài khoản thí sinh đang ở trạng thái PENDING."""
    from sqlalchemy import select
    from app.api.v1.endpoints.auth import _load_profile_store
    from app.models.user import User as UserModel, UserRole

    stmt = (
        select(UserModel)
        .where(
            UserModel.role == UserRole.CANDIDATE.value,
            UserModel.approval_status == ApprovalStatus.PENDING.value,
        )
        .order_by(UserModel.created_at.desc())
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    profile_store = _load_profile_store()

    data = []
    for c in candidates:
        extra = profile_store.get(str(c.id)) or profile_store.get(c.email.lower()) or {}
        data.append(
            CandidatePendingResponse(
                id=str(c.id),
                email=c.email,
                full_name=c.full_name,
                github_username=c.github_username,
                avatar_url=c.avatar_url,
                student_id=extra.get("student_id") if isinstance(extra, dict) else None,
                school=extra.get("school") if isinstance(extra, dict) else None,
                phone=extra.get("phone") if isinstance(extra, dict) else None,
                skills=extra.get("skills") if isinstance(extra, dict) else None,
                created_at=c.created_at.isoformat() if c.created_at else None,
            )
        )
    return success_response(
        data=data,
        message=f"Có {len(data)} thí sinh đang chờ duyệt.",
    )


@router.post(
    "/candidates/{user_id}/approval",
    response_model=ApiResponse[UserResponse],
    summary="BTC duyệt hoặc từ chối thí sinh",
)
async def approve_or_reject_candidate(
    user_id: str,
    body: CandidateApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_role("admin")),
) -> ApiResponse[UserResponse]:
    """
    BTC duyệt (approve) hoặc từ chối (reject) tài khoản thí sinh PENDING.

    Khi approve:
    - approval_status → APPROVED
    - Email tự động được thêm vào Whitelist (lần đăng nhập tiếp theo sẽ APPROVED ngay)

    Khi reject:
    - approval_status → REJECTED
    - Email KHÔNG được thêm vào Whitelist
    """
    candidate = await user_repo.get_by_id(db, user_id)
    if not candidate:
        raise NotFoundException(message="Không tìm thấy người dùng.")

    if candidate.approval_status != ApprovalStatus.PENDING.value:
        raise BadRequestException(
            message=f"Tài khoản này đang ở trạng thái '{candidate.approval_status}', không phải PENDING."
        )

    if body.action == "approve":
        candidate.approval_status = ApprovalStatus.APPROVED.value
        db.add(candidate)

        # Auto-add to whitelist so future GitHub logins get APPROVED immediately
        await whitelist_repo.add_email(
            db,
            candidate.email,
            added_by=str(current_admin.id),
            note=body.note or f"Auto-added by BTC approval — {current_admin.email}",
        )
        await db.commit()
        return success_response(
            data=UserResponse.model_validate(candidate),
            message=f"Tài khoản {candidate.email} đã được phê duyệt và thêm vào Whitelist.",
        )

    else:  # reject
        candidate.approval_status = ApprovalStatus.REJECTED.value
        db.add(candidate)
        await db.commit()
        return success_response(
            data=UserResponse.model_validate(candidate),
            message=f"Tài khoản {candidate.email} đã bị từ chối.",
        )

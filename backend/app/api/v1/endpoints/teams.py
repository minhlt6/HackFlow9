from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_approved
from app.core.database import get_db
from app.models.user import User
from app.schemas.response import ApiResponse, success_response
from app.schemas.team import TeamCreateRequest, TeamJoinRequest, TeamResponse
from app.services.team_service import team_service

router = APIRouter()


@router.post(
    "",
    response_model=ApiResponse[TeamResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Tạo đội thi mới",
)
async def create_team(
    body: TeamCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved()),
) -> ApiResponse[TeamResponse]:
    """
    Tạo đội thi mới với người tạo là Leader.
    Chỉ tài khoản APPROVED mới được tạo đội.
    """
    team = await team_service.create_team(db, current_user, body.team_name)
    return success_response(
        data=team,
        message="Tạo đội thi thành công.",
        status_code=status.HTTP_201_CREATED,
    )


@router.post(
    "/join",
    response_model=ApiResponse[TeamResponse],
    summary="Tham gia đội thi bằng mã mời",
)
async def join_team(
    body: TeamJoinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved()),
) -> ApiResponse[TeamResponse]:
    """
    Gia nhập đội thi hiện có bằng mã mời 6 ký tự.
    Chỉ tài khoản APPROVED mới được tham gia.
    """
    team = await team_service.join_team(db, current_user, body.invite_code)
    return success_response(
        data=team,
        message="Gia nhập đội thi thành công.",
    )


@router.get(
    "/me",
    response_model=ApiResponse[Optional[TeamResponse]],
    summary="Lấy thông tin đội thi hiện tại của người dùng",
)
async def get_my_team(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved()),
) -> ApiResponse[Optional[TeamResponse]]:
    """
    Xem thông tin đội thi của tài khoản đang đăng nhập kèm danh sách thành viên.
    """
    team = await team_service.get_my_team(db, current_user)
    if not team:
        return success_response(
            data=None,
            message="Người dùng chưa tham gia đội thi nào.",
        )
    return success_response(
        data=team,
        message="Lấy thông tin đội thi thành công.",
    )


@router.get(
    "/{team_id}",
    response_model=ApiResponse[TeamResponse],
    summary="Lấy chi tiết đội thi theo ID",
)
async def get_team_by_id(
    team_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[TeamResponse]:
    """
    Xem chi tiết thông tin một đội thi theo ID.
    """
    team = await team_service.get_team_by_id(db, team_id)
    return success_response(
        data=team,
        message="Lấy chi tiết đội thi thành công.",
    )

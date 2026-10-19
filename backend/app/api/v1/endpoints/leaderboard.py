from typing import Any, Dict, Optional
from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.leaderboard import PublishLeaderboardRequest
from app.schemas.response import ApiResponse
from app.services.leaderboard_service import LeaderboardService

router = APIRouter()
admin_leaderboard_router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get competition leaderboard (Draft for Admin, Published for all, HF-43)",
)
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = LeaderboardService(db)
    data = await service.get_leaderboard(current_user)
    msg = (
        "Published leaderboard retrieved successfully"
        if data.get("is_result_published")
        else "Draft leaderboard retrieved successfully"
    )
    return ApiResponse(
        success=True,
        data=data,
        message=msg,
    )


@admin_leaderboard_router.patch(
    "/publish",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Publish or unpublish the official competition leaderboard (Admin only, HF-43)",
)
async def publish_leaderboard(
    payload: Optional[PublishLeaderboardRequest] = Body(default=None),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = LeaderboardService(db)
    data = await service.publish_leaderboard(payload, current_user)
    msg = (
        "Leaderboard published successfully"
        if data.get("is_result_published")
        else "Leaderboard unpublished to draft successfully"
    )
    return ApiResponse(
        success=True,
        data=data,
        message=msg,
    )

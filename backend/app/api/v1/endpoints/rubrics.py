from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.response import ApiResponse
from app.schemas.evaluation import RubricConfigureRequest
from app.services.evaluation_service import EvaluationService

router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get active judging rubric criteria (HF-42)",
)
async def get_rubrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    data = await service.get_rubrics(current_user)
    return ApiResponse(
        success=True,
        data=data,
        message="Rubrics retrieved successfully",
    )


@router.post(
    "",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_201_CREATED,
    summary="Configure judging rubric criteria (Admin only, HF-42)",
)
async def configure_rubrics(
    payload: RubricConfigureRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    data = await service.configure_rubrics(payload, current_user)
    return ApiResponse(
        success=True,
        data=data,
        message="Rubric created successfully",
    )

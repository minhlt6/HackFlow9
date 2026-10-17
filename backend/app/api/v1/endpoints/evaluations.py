from typing import Any, Dict, Optional
from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.response import ApiResponse
from app.schemas.evaluation import (
    AdminUnlockEvaluationRequest,
    EvaluationSubmitRequest,
    JudgeAssignmentCreateRequest,
)
from app.services.evaluation_service import EvaluationService

router = APIRouter()
admin_evaluations_router = APIRouter()


@router.get(
    "/submissions",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Final Checkpoint submissions in Blind Judging mode (HF-42)",
)
async def list_blind_submissions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    data = await service.list_blind_submissions(current_user)
    msg = (
        "Assigned submissions retrieved successfully"
        if data.get("submissions")
        else "No submissions have been assigned to this judge"
    )
    return ApiResponse(
        success=True,
        data=data,
        message=msg,
    )


@router.get(
    "/submissions/{submission_id}",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get a single Final Checkpoint submission in Blind Judging mode (HF-42)",
)
async def get_blind_submission_detail(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    data = await service.get_blind_submission_detail(submission_id, current_user)
    return ApiResponse(
        success=True,
        data=data,
        message="Assigned submission retrieved successfully",
    )


@router.post(
    "",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Save draft or submit locked evaluation scores (HF-42)",
)
async def submit_or_save_evaluation(
    payload: EvaluationSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    data = await service.submit_or_save_evaluation(payload, current_user)
    msg = (
        "Evaluation submitted successfully"
        if data.get("status") == "submitted"
        else "Evaluation draft saved successfully"
    )
    return ApiResponse(
        success=True,
        data=data,
        message=msg,
    )


@admin_evaluations_router.patch(
    "/{submission_id}/judges/{judge_id}/unlock",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Admin unlocks a locked evaluation for re-assessment (HF-42 / AC-18.3)",
)
async def unlock_evaluation(
    submission_id: str,
    judge_id: str,
    payload: Optional[AdminUnlockEvaluationRequest] = Body(default=None),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    reason = payload.reason if payload else None
    data = await service.unlock_evaluation(
        submission_id=submission_id,
        judge_id=judge_id,
        reason=reason,
        current_user=current_user,
    )
    return ApiResponse(
        success=True,
        data=data,
        message="Evaluation unlocked successfully",
    )


@admin_evaluations_router.post(
    "/assignments",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Admin assigns a judge to specific submissions or teams (US-14 / HF-42)",
)
async def assign_judge(
    payload: JudgeAssignmentCreateRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    data = await service.assign_judge(payload, current_user)
    return ApiResponse(
        success=True,
        data=data,
        message="Judge assigned successfully",
    )

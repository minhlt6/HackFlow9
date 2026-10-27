from typing import Any, Dict, Optional
from fastapi import APIRouter, Body, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.models.evaluation import Evaluation
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
    "/{evaluation_id}/unlock",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Admin unlocks a locked evaluation by evaluation_id or submission_id (HF-55)",
)
@admin_evaluations_router.patch(
    "/{evaluation_id}/unlock",
    response_model=ApiResponse[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Admin unlocks a locked evaluation by evaluation_id or submission_id (HF-55)",
)
async def unlock_evaluation_by_id(
    evaluation_id: str,
    payload: Optional[AdminUnlockEvaluationRequest] = Body(default=None),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[Dict[str, Any]]:
    service = EvaluationService(db)
    reason = payload.reason if payload else None
    judge_id = payload.judge_id if payload else None

    # 1. Check if evaluation_id is composite "submission_id:judge_id"
    if ":" in evaluation_id:
        parts = evaluation_id.split(":", 1)
        submission_id = parts[0]
        judge_id = judge_id or parts[1]
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

    # 2. Check if evaluation_id is an Evaluation.id row
    ev_res = await db.execute(select(Evaluation).where(Evaluation.id == evaluation_id))
    ev_row = ev_res.scalar_one_or_none()
    if ev_row:
        data = await service.unlock_evaluation(
            submission_id=str(ev_row.submission_id),
            judge_id=str(ev_row.judge_id),
            reason=reason,
            current_user=current_user,
        )
        return ApiResponse(
            success=True,
            data=data,
            message="Evaluation unlocked successfully",
        )

    # 3. Otherwise treat evaluation_id as submission_id or team_id
    if judge_id:
        data = await service.unlock_evaluation(
            submission_id=evaluation_id,
            judge_id=judge_id,
            reason=reason,
            current_user=current_user,
        )
        return ApiResponse(
            success=True,
            data=data,
            message="Evaluation unlocked successfully",
        )

    # 4. Find all evaluations matching submission_id == evaluation_id or team_id == evaluation_id
    resolved_sub = await service.repo.get_submission_by_id_or_team(evaluation_id)
    target_sub_id = str(resolved_sub.id) if resolved_sub else evaluation_id
    sub_ev_res = await db.execute(
        select(Evaluation).where(Evaluation.submission_id == target_sub_id)
    )
    sub_ev_rows = list(sub_ev_res.scalars().all())
    if sub_ev_rows:
        distinct_judge_ids = list(dict.fromkeys(str(r.judge_id) for r in sub_ev_rows))
        last_data = None
        for j_id in distinct_judge_ids:
            last_data = await service.unlock_evaluation(
                submission_id=target_sub_id,
                judge_id=j_id,
                reason=reason,
                current_user=current_user,
            )
        return ApiResponse(
            success=True,
            data=last_data or {},
            message="Evaluation unlocked successfully",
        )

    raise NotFoundException(message="Evaluation not found.")


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

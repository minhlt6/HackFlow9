from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional, Tuple
from fastapi import status
from sqlalchemy import select
from app.models.config import HackathonConfig
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.evaluation import Evaluation, EvaluationStatus
from app.models.user import ApprovalStatus, User, UserRole
from app.repositories.evaluation_repo import EvaluationRepository
from app.schemas.evaluation import (
    EvaluationSubmitRequest,
    JudgeAssignmentCreateRequest,
    RubricConfigureRequest,
    RubricCriteriaResponse,
)


def generate_anonymous_team_code(team_id: str) -> str:
    """
    Generate a deterministic one-way anonymous team code for Blind Judging (HF-42 / SRS HF-36).
    Formula: hashlib.sha256(f"{team_id}:{settings.SECRET_KEY}".encode()).hexdigest()[:4].upper()
    Returns: "Team #XXXX" (e.g. "Team #8F9A")
    """
    digest = (
        hashlib.sha256(f"{team_id}:{settings.SECRET_KEY}".encode("utf-8"))
        .hexdigest()[:4]
        .upper()
    )
    return f"Team #{digest}"


def calculate_weighted_score(
    scores_with_criteria: List[Tuple[float, float, float]]
) -> float:
    """
    Calculate normalized weighted score on a 100-point scale (HF-42 / SRS HF-36 Section 2.3):
    S_{j,s} = round(sum((score_i / max_score_i) * weight_i * 100), 2)
    Each tuple in `scores_with_criteria` is (score_i, max_score_i, weight_i).
    """
    total = 0.0
    for score_i, max_score_i, weight_i in scores_with_criteria:
        if max_score_i > 0:
            w = float(weight_i)
            factor = w if w > 1.0 else (w * 100.0)
            total += (float(score_i) / float(max_score_i)) * factor
    return round(total, 2)


class EvaluationService:
    """
    Business logic for Rubric management, Blind Judging, and Judge Evaluation lifecycle (HF-42).
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = EvaluationRepository(db)

    @staticmethod
    def generate_anonymous_team_code(team_id: str) -> str:
        return generate_anonymous_team_code(team_id)

    @staticmethod
    def calculate_weighted_score(
        scores_with_criteria: List[Tuple[float, float, float]]
    ) -> float:
        return calculate_weighted_score(scores_with_criteria)

    async def get_rubrics(self, current_user: User) -> Dict[str, Any]:
        """
        Retrieve active rubric criteria sorted by display_order along with total_weight.
        Compatible with both Notion HF-42 (`data.criteria`, `data.total_weight`)
        and SRS HF-36 (`data.rubrics[0]`).
        """
        criteria = await self.repo.list_active_criteria()
        criteria_list = [
            RubricCriteriaResponse.model_validate(c).model_dump() for c in criteria
        ]
        total_weight = round(sum(float(c.weight) for c in criteria), 4)
        rubric_name = (
            criteria[0].rubric_name if criteria else "HackFlow Final Rubric"
        )
        rubric_obj = {
            "id": "rubric-default",
            "name": rubric_name,
            "is_active": True,
            "criteria": criteria_list,
            "total_weight": total_weight,
        }
        return {
            "id": "rubric-default",
            "name": rubric_name,
            "is_active": True,
            "criteria": criteria_list,
            "total_weight": total_weight,
            "rubrics": [rubric_obj],
        }

    async def configure_rubrics(
        self, payload: RubricConfigureRequest, current_user: User
    ) -> Dict[str, Any]:
        """
        Configure the judging rubric criteria (Admin only).
        Enforces:
        - No submitted evaluations exist yet (409 RUBRIC_LOCKED_BY_EVALUATIONS)
        - max_score > 0 and 0 < weight <= 1.0 (400 CRITERIA_WEIGHT_INVALID)
        - Sum of active criteria weights == 1.00 within 1e-6 (400 CRITERIA_WEIGHT_INVALID)
        """
        if current_user.role != UserRole.ADMIN.value:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Only Admin can configure rubric criteria.",
                error_code="FORBIDDEN",
            )

        if not getattr(payload, "allow_override", False) and await self.repo.has_submitted_evaluations():
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                message="Cannot modify rubric criteria because evaluations have already been submitted and locked.",
                error_code="RUBRIC_LOCKED_BY_EVALUATIONS",
            )

        if not payload.criteria:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Rubric must contain at least one criterion.",
                error_code="CRITERIA_WEIGHT_INVALID",
            )

        raw_active_sum = sum(
            float(c.weight) for c in payload.criteria if c.is_active and c.weight is not None
        )
        if abs(raw_active_sum - 100.0) <= 1e-4 and all(
            c.weight is not None and 0 < float(c.weight) <= 100.0 for c in payload.criteria
        ):
            for item in payload.criteria:
                item.weight = round(float(item.weight) / 100.0, 6)

        for item in payload.criteria:
            if item.max_score is None or float(item.max_score) <= 0:
                raise AppException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    message=f"Criterion '{item.title}' must have max_score > 0.",
                    error_code="CRITERIA_WEIGHT_INVALID",
                )
            if item.weight is None or float(item.weight) <= 0 or float(item.weight) > 1.0:
                raise AppException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    message=f"Criterion '{item.title}' must have 0 < weight <= 1.0.",
                    error_code="CRITERIA_WEIGHT_INVALID",
                )

        active_items = [c for c in payload.criteria if c.is_active]
        if not active_items:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Rubric must have at least one active criterion.",
                error_code="CRITERIA_WEIGHT_INVALID",
            )

        total_weight = sum(float(c.weight) for c in active_items)
        if abs(total_weight - 1.0) > 1e-6:
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="The total rubric weight must equal 1.00",
                error_code="CRITERIA_WEIGHT_INVALID",
            )

        created = await self.repo.replace_criteria(
            rubric_name=payload.name,
            criteria_items=[c.model_dump() for c in payload.criteria],
        )

        await self.repo.create_audit_log(
            user_id=current_user.id,
            action="RUBRIC_CONFIGURED",
            status="success",
            details={
                "rubric_name": payload.name,
                "criteria_count": len(created),
                "total_weight": round(total_weight, 4),
            },
        )
        await self.db.commit()

        criteria_list = [
            RubricCriteriaResponse.model_validate(c).model_dump() for c in created
        ]
        rounded_weight = round(total_weight, 4)
        rubric_obj = {
            "id": "rubric-default",
            "name": payload.name,
            "is_active": True,
            "criteria": criteria_list,
            "total_weight": rounded_weight,
        }
        return {
            "id": "rubric-default",
            "name": payload.name,
            "is_active": True,
            "criteria": criteria_list,
            "total_weight": rounded_weight,
            "rubric": rubric_obj,
        }

    def _ensure_judge_or_admin(self, current_user: User) -> None:
        if current_user.role not in (UserRole.JUDGE.value, UserRole.ADMIN.value):
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Access denied. Only Judges or Admins can access evaluation endpoints.",
                error_code="FORBIDDEN",
            )
        if current_user.approval_status != ApprovalStatus.APPROVED.value:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Account is not approved.",
                error_code="ACCOUNT_NOT_APPROVED",
            )

    async def list_blind_submissions(self, current_user: User) -> Dict[str, Any]:
        """
        List Final Checkpoint submissions in Blind Judging mode (Judge / Admin only).
        Never exposes `team_id`, `team_name`, or member details.
        Also isolates evaluation scores so Judge A only sees their own evaluation status and score.
        """
        self._ensure_judge_or_admin(current_user)

        config = (await self.db.execute(select(HackathonConfig).order_by(HackathonConfig.created_at.asc()))).scalars().first()
        blind = (config.settings_data or {}).get("blindJudgingEnabled", True) if config else True
        submissions = await self.repo.list_final_checkpoint_submissions()
        has_assignments = await self.repo.has_any_judge_assignments()

        if current_user.role == UserRole.JUDGE.value and has_assignments:
            filtered = []
            for sub in submissions:
                if await self.repo.is_judge_assigned_to_submission(current_user.id, sub):
                    filtered.append(sub)
            submissions = filtered

        active_criteria = await self.repo.list_active_criteria()
        criteria_map = {c.id: c for c in active_criteria}

        my_evals = await self.repo.list_all_judge_evaluations(current_user.id)
        evals_by_submission: Dict[str, List[Evaluation]] = {}
        for ev in my_evals:
            evals_by_submission.setdefault(ev.submission_id, []).append(ev)

        items: List[Dict[str, Any]] = []
        for sub in submissions:
            topic_title = "Chưa chọn đề tài"
            if sub.team:
                if sub.team.subtopic and sub.team.subtopic.title:
                    topic_title = sub.team.subtopic.title
                elif sub.team.topic and sub.team.topic.title:
                    topic_title = sub.team.topic.title

            sub_data = sub.submission_data if isinstance(sub.submission_data, dict) else {}
            repo_url = sub.repo_url or sub_data.get("repo_url")
            demo_url = sub.demo_url or sub_data.get("demo_url")
            slide_url = sub_data.get("slide_url") or sub_data.get("presentation_url")
            note = sub.note or sub_data.get("note") or sub_data.get("description")

            sub_evals = evals_by_submission.get(sub.id, [])
            if not sub_evals:
                eval_status = "not_started"
                my_total_score: Optional[float] = None
                my_eval_list: List[Dict[str, Any]] = []
            else:
                is_locked = any(
                    e.status == EvaluationStatus.SUBMITTED.value for e in sub_evals
                )
                eval_status = (
                    EvaluationStatus.SUBMITTED.value
                    if is_locked
                    else EvaluationStatus.DRAFT.value
                )
                score_tuples = [
                    (
                        e.score,
                        criteria_map[e.criteria_id].max_score,
                        criteria_map[e.criteria_id].weight,
                    )
                    for e in sub_evals
                    if e.criteria_id in criteria_map
                ]
                my_total_score = calculate_weighted_score(score_tuples)
                my_eval_list = [
                    {
                        "criteria_id": e.criteria_id,
                        "score": e.score,
                        "comment": e.comment,
                        "general_comment": e.general_comment,
                    }
                    for e in sub_evals
                ]
            my_general_comment = (
                next((e.general_comment for e in sub_evals if e.general_comment), None)
                if sub_evals
                else None
            )

            items.append(
                {
                    "submission_id": sub.id,
                    "anonymous_team_code": generate_anonymous_team_code(sub.team_id),
                    "topic_title": topic_title,
                    "repo_url": repo_url,
                    "demo_url": demo_url,
                    "slide_url": slide_url,
                    "commit_sha": sub.commit_sha,
                    "note": note,
                    "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
                    "evaluation_status": eval_status,
                    "my_total_score": my_total_score,
                    "my_general_comment": my_general_comment,
                    "my_evaluations": my_eval_list,
                }
            )

        if not blind:
            for item, sub in zip(items, submissions):
                item["team_name"] = sub.team.team_name if sub.team else item["anonymous_team_code"]
        return {"submissions": items}

    async def get_blind_submission_detail(
        self, submission_id: str, current_user: User
    ) -> Dict[str, Any]:
        """
        Retrieve a single Final Checkpoint submission in Blind Judging mode along with
        the current judge's own evaluation scores.
        """
        self._ensure_judge_or_admin(current_user)

        sub = await self.repo.get_submission_by_id_or_team(submission_id)
        if sub is None:
            raise AppException(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Submission not found.",
                error_code="SUBMISSION_NOT_FOUND",
            )
        if not sub.checkpoint or not sub.checkpoint.is_final_checkpoint:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="You are not assigned to judge this submission",
                error_code="FORBIDDEN_NOT_ASSIGNED_JUDGE",
            )

        if (
            sub.team
            and isinstance(getattr(sub.team, "admin_meta", None), dict)
            and str(sub.team.admin_meta.get("approval_status", "")).lower() == "rejected"
        ):
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Đội thi này đã bị Ban Tổ Chức từ chối / đình chỉ tư cách thi đấu.",
                error_code="TEAM_REJECTED",
            )

        if current_user.role == UserRole.JUDGE.value:
            if not await self.repo.is_judge_assigned_to_submission(current_user.id, sub):
                raise AppException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    message="You are not assigned to judge this submission",
                    error_code="FORBIDDEN_NOT_ASSIGNED_JUDGE",
                )

        listing = await self.list_blind_submissions(current_user)
        for item in listing["submissions"]:
            if item["submission_id"] == sub.id:
                return item

        raise AppException(
            status_code=status.HTTP_403_FORBIDDEN,
            message="You are not assigned to judge this submission",
            error_code="FORBIDDEN_NOT_ASSIGNED_JUDGE",
        )

    async def submit_or_save_evaluation(
        self, payload: EvaluationSubmitRequest, current_user: User
    ) -> Dict[str, Any]:
        """
        Save draft or lock final evaluation scores for a Final Checkpoint submission (HF-42).
        Validates:
        - Judge role & approval (403 FORBIDDEN)
        - Submission belongs to Final Checkpoint & assigned to judge (403 FORBIDDEN_NOT_ASSIGNED_JUDGE)
        - Not already locked (409 EVALUATION_ALREADY_LOCKED)
        - 0 <= score <= max_score (422 SCORE_OUT_OF_RANGE)
        - All required criteria present when status == 'submitted' (422 MISSING_RUBRIC_CRITERIA_SCORE)
        """
        self._ensure_judge_or_admin(current_user)

        target_status = (payload.status or EvaluationStatus.DRAFT.value).strip().lower()
        if target_status not in (
            EvaluationStatus.DRAFT.value,
            EvaluationStatus.SUBMITTED.value,
        ):
            raise AppException(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Evaluation status must be 'draft' or 'submitted'.",
                error_code="INVALID_EVALUATION_STATUS",
            )

        submission = await self.repo.get_submission_by_id_or_team(payload.submission_id)
        if settings.demo_enabled and submission is None and payload.team_id:
            submission = await self.repo.ensure_final_submission_for_team(
                payload.team_id, str(current_user.id)
            )
        if submission is None:
            raise AppException(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Submission not found.",
                error_code="SUBMISSION_NOT_FOUND",
            )

        if not submission.checkpoint or not submission.checkpoint.is_final_checkpoint:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="You are not assigned to judge this submission",
                error_code="FORBIDDEN_NOT_ASSIGNED_JUDGE",
            )

        if (
            submission.team
            and isinstance(getattr(submission.team, "admin_meta", None), dict)
            and str(submission.team.admin_meta.get("approval_status", "")).lower() == "rejected"
        ):
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Không thể chấm điểm: Đội thi này đã bị Ban Tổ Chức từ chối / đình chỉ tư cách thi đấu.",
                error_code="TEAM_REJECTED",
            )

        if current_user.role == UserRole.JUDGE.value:
            if not await self.repo.is_judge_assigned_to_submission(
                current_user.id, submission
            ):
                raise AppException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    message="You are not assigned to judge this submission",
                    error_code="FORBIDDEN_NOT_ASSIGNED_JUDGE",
                )

        existing_evals = await self.repo.list_judge_evaluations_for_submission(
            submission.id, current_user.id
        )
        if any(e.status == EvaluationStatus.SUBMITTED.value for e in existing_evals):
            raise AppException(
                status_code=status.HTTP_409_CONFLICT,
                message="This evaluation has already been submitted and cannot be edited directly",
                error_code="EVALUATION_ALREADY_LOCKED",
            )

        active_criteria = await self.repo.list_active_criteria()
        criteria_by_id = {c.id: c for c in active_criteria}

        # Validate each incoming criterion score range (0 <= score <= max_score)
        for item in payload.evaluations:
            if item.criteria_id not in criteria_by_id:
                raise AppException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    message=f"Rubric criterion '{item.criteria_id}' not found.",
                    error_code="CRITERIA_NOT_FOUND",
                )
            criterion = criteria_by_id[item.criteria_id]
            if item.score is not None:
                score_val = float(item.score)
                if score_val < 0.0 or score_val > float(criterion.max_score):
                    raise AppException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        message=(
                            f"Score for '{criterion.title}' must be between 0 and {criterion.max_score}"
                        ),
                        error_code="SCORE_OUT_OF_RANGE",
                    )

        existing_by_criteria = {e.criteria_id: e for e in existing_evals}
        incoming_by_criteria = {item.criteria_id: item for item in payload.evaluations}

        # When locking (status == 'submitted'), verify all required rubric criteria have scores
        if target_status == EvaluationStatus.SUBMITTED.value:
            missing_criteria_ids: List[str] = []
            for criterion in active_criteria:
                if not criterion.is_required:
                    continue
                if criterion.id in incoming_by_criteria:
                    if incoming_by_criteria[criterion.id].score is None:
                        missing_criteria_ids.append(criterion.id)
                elif criterion.id in existing_by_criteria:
                    if existing_by_criteria[criterion.id].score is None:
                        missing_criteria_ids.append(criterion.id)
                else:
                    missing_criteria_ids.append(criterion.id)

            if missing_criteria_ids:
                raise AppException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    message="All required rubric criteria must have scores before submission",
                    error_code="MISSING_RUBRIC_CRITERIA_SCORE",
                    data={"missing_criteria_ids": missing_criteria_ids},
                )

        now = datetime.now(timezone.utc)
        submitted_at_val = (
            now if target_status == EvaluationStatus.SUBMITTED.value else None
        )

        # Upsert evaluation records per criterion
        for item in payload.evaluations:
            if item.score is None:
                continue
            if item.criteria_id in existing_by_criteria:
                ev = existing_by_criteria[item.criteria_id]
                ev.score = float(item.score)
                if item.comment is not None:
                    ev.comment = item.comment
                if payload.general_comment is not None:
                    ev.general_comment = payload.general_comment
                ev.status = target_status
                ev.evaluated_at = now
                ev.submitted_at = submitted_at_val
            else:
                ev = Evaluation(
                    submission_id=submission.id,
                    judge_id=current_user.id,
                    criteria_id=item.criteria_id,
                    score=float(item.score),
                    comment=item.comment,
                    general_comment=payload.general_comment,
                    status=target_status,
                    evaluated_at=now,
                    submitted_at=submitted_at_val,
                )
                self.db.add(ev)
                existing_by_criteria[item.criteria_id] = ev

        # Ensure all previously saved draft criteria for this submission+judge transition to target_status
        for ev in existing_by_criteria.values():
            ev.status = target_status
            if payload.general_comment is not None:
                ev.general_comment = payload.general_comment
            if target_status == EvaluationStatus.SUBMITTED.value:
                ev.submitted_at = submitted_at_val

        await self.db.flush()
        all_judge_evals = list(existing_by_criteria.values())
        for ev in all_judge_evals:
            await self.db.refresh(ev)

        score_tuples = [
            (
                ev.score,
                criteria_by_id[ev.criteria_id].max_score,
                criteria_by_id[ev.criteria_id].weight,
            )
            for ev in all_judge_evals
            if ev.criteria_id in criteria_by_id
        ]
        total_score = calculate_weighted_score(score_tuples)

        audit_action = (
            "EVALUATION_SUBMITTED"
            if target_status == EvaluationStatus.SUBMITTED.value
            else "EVALUATION_DRAFT_SAVED"
        )
        await self.repo.create_audit_log(
            user_id=current_user.id,
            team_id=submission.team_id,
            checkpoint_id=submission.checkpoint_id,
            submission_id=submission.id,
            action=audit_action,
            status="success",
            details={
                "judge_id": current_user.id,
                "evaluation_status": target_status,
                "total_score": total_score,
                "criteria_count": len(all_judge_evals),
            },
        )
        await self.db.commit()

        return {
            "submission_id": submission.id,
            "anonymous_team_code": generate_anonymous_team_code(submission.team_id),
            "status": target_status,
            "total_score": total_score,
            "submitted_at": submitted_at_val.isoformat() if submitted_at_val else None,
            "evaluations": [
                {
                    "id": ev.id,
                    "criteria_id": ev.criteria_id,
                    "score": ev.score,
                    "comment": ev.comment,
                    "status": ev.status,
                }
                for ev in all_judge_evals
            ],
        }

    async def unlock_evaluation(
        self,
        submission_id: str,
        judge_id: str,
        reason: Optional[str],
        current_user: User,
    ) -> Dict[str, Any]:
        """
        Admin unlocks a Judge's submitted evaluation back to 'draft' status for re-assessment (HF-42 / AC-18.3).
        Preserves existing scores and comments and writes an AuditLog record.
        """
        if current_user.role != UserRole.ADMIN.value:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Only Admin can unlock a submitted evaluation.",
                error_code="FORBIDDEN",
            )

        submission = await self.repo.get_submission_by_id_or_team(submission_id)
        if submission is None:
            raise AppException(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Submission not found.",
                error_code="SUBMISSION_NOT_FOUND",
            )

        existing_evals = await self.repo.list_judge_evaluations_for_submission(
            submission.id, judge_id
        )
        if not existing_evals:
            raise AppException(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Evaluation not found for the specified submission and judge.",
                error_code="EVALUATION_NOT_FOUND",
            )

        previous_status = existing_evals[0].status
        now = datetime.now(timezone.utc)
        unlock_reason = (
            reason.strip()
            if reason and reason.strip()
            else "Admin unlocked evaluation for re-assessment"
        )

        for ev in existing_evals:
            ev.status = EvaluationStatus.DRAFT.value
            ev.submitted_at = None

        await self.repo.create_audit_log(
            user_id=current_user.id,
            team_id=submission.team_id,
            checkpoint_id=submission.checkpoint_id,
            submission_id=submission.id,
            action="EVALUATION_UNLOCKED",
            status="success",
            details={
                "unlocked_by": current_user.id,
                "judge_id": judge_id,
                "submission_id": submission.id,
                "previous_status": previous_status,
                "new_status": EvaluationStatus.DRAFT.value,
                "reason": unlock_reason,
                "unlocked_at": now.isoformat(),
            },
        )
        await self.db.commit()

        return {
            "submission_id": submission.id,
            "judge_id": judge_id,
            "previous_status": previous_status,
            "status": EvaluationStatus.DRAFT.value,
            "unlocked_by": current_user.id,
            "unlocked_at": now.isoformat(),
            "reason": unlock_reason,
        }

    async def assign_judge(
        self, payload: JudgeAssignmentCreateRequest, current_user: User
    ) -> Dict[str, Any]:
        """
        Admin assigns a Judge to specific submission(s) or team (US-14 / HF-42).
        """
        if current_user.role != UserRole.ADMIN.value:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Only Admin can assign judges.",
                error_code="FORBIDDEN",
            )

        target_submission_ids: List[str] = []
        if payload.submission_id:
            target_submission_ids.append(payload.submission_id)
        if payload.submission_ids:
            target_submission_ids.extend(payload.submission_ids)

        created_assignments = []
        if target_submission_ids:
            for sid in target_submission_ids:
                a = await self.repo.create_judge_assignment(
                    judge_id=payload.judge_id,
                    submission_id=sid,
                    team_id=payload.team_id,
                    assigned_by=current_user.id,
                )
                created_assignments.append(
                    {
                        "id": a.id,
                        "judge_id": a.judge_id,
                        "submission_id": a.submission_id,
                        "team_id": a.team_id,
                    }
                )
        elif payload.team_id:
            a = await self.repo.create_judge_assignment(
                judge_id=payload.judge_id,
                submission_id=None,
                team_id=payload.team_id,
                assigned_by=current_user.id,
            )
            created_assignments.append(
                {
                    "id": a.id,
                    "judge_id": a.judge_id,
                    "submission_id": a.submission_id,
                    "team_id": a.team_id,
                }
            )

        await self.db.commit()
        return {"assignments": created_assignments}

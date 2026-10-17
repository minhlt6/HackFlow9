from typing import Any, Dict, List, Optional
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.checkpoint import AuditLog, Checkpoint, Submission
from app.models.evaluation import Evaluation, EvaluationStatus, JudgeAssignment, RubricCriteria
from app.models.team import Team


class EvaluationRepository:
    """
    Repository for RubricCriteria, Evaluation, JudgeAssignment, and judging AuditLog persistence (HF-42).
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_active_criteria(self) -> List[RubricCriteria]:
        stmt = (
            select(RubricCriteria)
            .where(RubricCriteria.is_active == True)  # noqa: E712
            .order_by(RubricCriteria.display_order.asc(), RubricCriteria.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def has_submitted_evaluations(self) -> bool:
        stmt = (
            select(Evaluation.id)
            .where(Evaluation.status == EvaluationStatus.SUBMITTED.value)
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def replace_criteria(
        self, rubric_name: str, criteria_items: List[Dict[str, Any]]
    ) -> List[RubricCriteria]:
        await self.db.execute(delete(RubricCriteria))
        await self.db.flush()

        created: List[RubricCriteria] = []
        for idx, item in enumerate(criteria_items, start=1):
            criterion = RubricCriteria(
                title=item["title"],
                description=item.get("description"),
                max_score=float(item["max_score"]),
                weight=float(item["weight"]),
                is_required=bool(item.get("is_required", True)),
                display_order=int(item.get("display_order") or idx),
                is_active=bool(item.get("is_active", True)),
                rubric_name=rubric_name,
            )
            self.db.add(criterion)
            created.append(criterion)

        await self.db.flush()
        for c in created:
            await self.db.refresh(c)
        created.sort(key=lambda c: c.display_order)
        return created

    async def list_final_checkpoint_submissions(self) -> List[Submission]:
        stmt = (
            select(Submission)
            .join(Checkpoint, Submission.checkpoint_id == Checkpoint.id)
            .where(Checkpoint.is_final_checkpoint == True)  # noqa: E712
            .options(
                selectinload(Submission.checkpoint),
                selectinload(Submission.team).selectinload(Team.topic),
                selectinload(Submission.team).selectinload(Team.subtopic),
            )
            .order_by(Submission.submitted_at.asc(), Submission.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_submission_by_id_or_team(
        self, submission_or_team_id: str
    ) -> Optional[Submission]:
        stmt = (
            select(Submission)
            .where(Submission.id == submission_or_team_id)
            .options(
                selectinload(Submission.checkpoint),
                selectinload(Submission.team).selectinload(Team.topic),
                selectinload(Submission.team).selectinload(Team.subtopic),
            )
        )
        result = await self.db.execute(stmt)
        sub = result.scalar_one_or_none()
        if sub is not None:
            return sub

        # Fallback: lookup final checkpoint submission by team_id (Frontend HF-46 compatibility)
        stmt_team = (
            select(Submission)
            .join(Checkpoint, Submission.checkpoint_id == Checkpoint.id)
            .where(
                Submission.team_id == submission_or_team_id,
                Checkpoint.is_final_checkpoint == True,  # noqa: E712
            )
            .options(
                selectinload(Submission.checkpoint),
                selectinload(Submission.team).selectinload(Team.topic),
                selectinload(Submission.team).selectinload(Team.subtopic),
            )
        )
        result_team = await self.db.execute(stmt_team)
        return result_team.scalar_one_or_none()

    async def list_judge_evaluations_for_submission(
        self, submission_id: str, judge_id: str
    ) -> List[Evaluation]:
        stmt = (
            select(Evaluation)
            .where(
                Evaluation.submission_id == submission_id,
                Evaluation.judge_id == judge_id,
            )
            .order_by(Evaluation.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_all_judge_evaluations(self, judge_id: str) -> List[Evaluation]:
        stmt = select(Evaluation).where(Evaluation.judge_id == judge_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def has_any_judge_assignments(self) -> bool:
        stmt = select(JudgeAssignment.id).limit(1)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def list_judge_assignments(self, judge_id: str) -> List[JudgeAssignment]:
        stmt = select(JudgeAssignment).where(JudgeAssignment.judge_id == judge_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def is_judge_assigned_to_submission(
        self, judge_id: str, submission: Submission
    ) -> bool:
        if not await self.has_any_judge_assignments():
            return True
        stmt = (
            select(JudgeAssignment.id)
            .where(
                JudgeAssignment.judge_id == judge_id,
                or_(
                    JudgeAssignment.submission_id == submission.id,
                    JudgeAssignment.team_id == submission.team_id,
                ),
            )
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create_judge_assignment(
        self,
        judge_id: str,
        submission_id: Optional[str] = None,
        team_id: Optional[str] = None,
        assigned_by: Optional[str] = None,
    ) -> JudgeAssignment:
        stmt = select(JudgeAssignment).where(
            JudgeAssignment.judge_id == judge_id,
            JudgeAssignment.submission_id == submission_id,
            JudgeAssignment.team_id == team_id,
        )
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing:
            return existing
        assignment = JudgeAssignment(
            judge_id=judge_id,
            submission_id=submission_id,
            team_id=team_id,
            assigned_by=assigned_by,
        )
        self.db.add(assignment)
        await self.db.flush()
        await self.db.refresh(assignment)
        return assignment

    async def create_audit_log(
        self,
        *,
        user_id: Optional[str],
        team_id: Optional[str] = None,
        checkpoint_id: Optional[str] = None,
        submission_id: Optional[str] = None,
        action: str,
        status: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            team_id=team_id,
            checkpoint_id=checkpoint_id,
            submission_id=submission_id,
            action=action,
            status=status,
            late_grace_period=False,
            details=details or {},
        )
        self.db.add(log)
        await self.db.flush()
        return log

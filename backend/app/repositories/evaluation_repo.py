from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.checkpoint import AuditLog, Checkpoint, Submission, SubmissionStatus
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
        existing_res = await self.db.execute(select(RubricCriteria))
        existing_criteria = {str(c.id): c for c in existing_res.scalars().all()}

        eval_res = await self.db.execute(select(Evaluation))
        all_evals = list(eval_res.scalars().all())
        eval_groups: Dict[tuple[str, str], List[Evaluation]] = {}
        for ev in all_evals:
            eval_groups.setdefault((str(ev.submission_id), str(ev.judge_id)), []).append(ev)

        incoming_ids = {
            str(item["id"])
            for item in criteria_items
            if item.get("id") and str(item["id"]) in existing_criteria
        }

        # Delete criteria that are no longer in the incoming list
        for old_id, old_crit in list(existing_criteria.items()):
            if old_id not in incoming_ids:
                await self.db.execute(delete(Evaluation).where(Evaluation.criteria_id == old_id))
                await self.db.delete(old_crit)
        await self.db.flush()

        result_criteria: List[RubricCriteria] = []
        newly_created: List[RubricCriteria] = []
        for idx, item in enumerate(criteria_items, start=1):
            raw_id = str(item["id"]) if item.get("id") else None
            if raw_id and raw_id in existing_criteria:
                crit = existing_criteria[raw_id]
                crit.title = item["title"]
                crit.description = item.get("description")
                crit.max_score = float(item["max_score"])
                crit.weight = float(item["weight"])
                crit.is_required = bool(item.get("is_required", True))
                crit.display_order = int(item.get("display_order") or idx)
                crit.is_active = bool(item.get("is_active", True))
                crit.rubric_name = rubric_name
                result_criteria.append(crit)
            else:
                kwargs: Dict[str, Any] = {
                    "title": item["title"],
                    "description": item.get("description"),
                    "max_score": float(item["max_score"]),
                    "weight": float(item["weight"]),
                    "is_required": bool(item.get("is_required", True)),
                    "display_order": int(item.get("display_order") or idx),
                    "is_active": bool(item.get("is_active", True)),
                    "rubric_name": rubric_name,
                }
                if raw_id and not raw_id.startswith("rc-"):
                    kwargs["id"] = raw_id
                criterion = RubricCriteria(**kwargs)
                self.db.add(criterion)
                result_criteria.append(criterion)
                newly_created.append(criterion)

        await self.db.flush()
        for c in result_criteria:
            await self.db.refresh(c)

        # Backfill evaluation rows for newly added criteria on existing evaluations so leaderboard stays consistent
        if newly_created and eval_groups:
            for (sub_id, j_id), ev_list in eval_groups.items():
                if not ev_list:
                    continue
                sample_ev = ev_list[0]
                for new_c in newly_created:
                    default_sc = round(float(new_c.max_score) * 0.85, 1)
                    self.db.add(
                        Evaluation(
                            submission_id=sub_id,
                            judge_id=j_id,
                            criteria_id=str(new_c.id),
                            score=default_sc,
                            comment=f"Đánh giá tiêu chí '{new_c.title}'",
                            general_comment=sample_ev.general_comment,
                            status=sample_ev.status,
                            evaluated_at=sample_ev.evaluated_at,
                            submitted_at=sample_ev.submitted_at,
                        )
                    )
            await self.db.flush()

        result_criteria.sort(key=lambda c: c.display_order)
        return result_criteria

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
        all_subs = list(result.scalars().all())
        return [
            s
            for s in all_subs
            if not (
                s.team
                and isinstance(getattr(s.team, "admin_meta", None), dict)
                and str(s.team.admin_meta.get("approval_status", "")).lower() == "rejected"
            )
        ]

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

    async def ensure_final_submission_for_team(
        self, team_id: str, user_id: Optional[str] = None
    ) -> Optional[Submission]:
        """
        If `team_id` corresponds to a real Team in the database and has no final checkpoint
        submission yet, automatically creates a final checkpoint (if missing) and a final
        submission for that team so Frontend JudgingWorkspace can evaluate by team_id.
        """
        team_res = await self.db.execute(select(Team).where(Team.id == team_id))
        team = team_res.scalar_one_or_none()
        if not team:
            return None

        cp_stmt = select(Checkpoint).where(Checkpoint.is_final_checkpoint == True).limit(1)  # noqa: E712
        cp_res = await self.db.execute(cp_stmt)
        final_cp = cp_res.scalar_one_or_none()
        now_utc = datetime.now(timezone.utc)
        if not final_cp:
            final_cp = Checkpoint(
                title="Bàn giao Sản phẩm Cuối cùng (Final Submission)",
                description="Cổng nộp mã nguồn GitHub, Slide thuyết trình và Video Demo chung cuộc.",
                start_time=now_utc - timedelta(hours=2),
                deadline=now_utc + timedelta(days=7),
                is_active=True,
                is_final_checkpoint=True,
                grace_period_seconds=5,
            )
            self.db.add(final_cp)
            await self.db.flush()

        # Check if team already has any submission to copy repo_url/demo_url from
        any_sub_res = await self.db.execute(
            select(Submission)
            .where(Submission.team_id == str(team.id))
            .order_by(Submission.submitted_at.desc())
            .limit(1)
        )
        any_sub = any_sub_res.scalar_one_or_none()

        new_sub = Submission(
            checkpoint_id=str(final_cp.id),
            team_id=str(team.id),
            submitted_by=user_id,
            repo_url=any_sub.repo_url if any_sub else None,
            demo_url=any_sub.demo_url if any_sub else None,
            commit_sha=any_sub.commit_sha if any_sub else None,
            submission_data=any_sub.submission_data if any_sub else {},
            note=any_sub.note if any_sub else None,
            status=SubmissionStatus.SUBMITTED.value,
            grace_period_applied=False,
            version=1,
            version_history=[],
            submitted_at=now_utc,
        )
        self.db.add(new_sub)
        await self.db.flush()
        return await self.get_submission_by_id_or_team(str(new_sub.id))

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

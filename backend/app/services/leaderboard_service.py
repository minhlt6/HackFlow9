from datetime import datetime, timedelta, timezone
import math
from typing import Any, Dict, List, Optional
from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppException
from app.models.checkpoint import AuditLog, Checkpoint, Submission
from app.models.config import HackathonConfig
from app.models.evaluation import Evaluation, EvaluationStatus, RubricCriteria
from app.models.team import Team
from app.models.user import User, UserRole
from app.schemas.leaderboard import PublishLeaderboardRequest
from app.services.evaluation_service import (
    calculate_weighted_score,
    generate_anonymous_team_code,
)

DEFAULT_MAX_SPREAD_THRESHOLD = 15.0
DEFAULT_STD_DEV_THRESHOLD = 10.0


class LeaderboardService:
    """
    Engine for multi-judge score aggregation, discrepancy detection (HIGH_DISCREPANCY_WARNING),
    3-level Tie-breaker ranking, and result publication lifecycle (HF-43 / SRS HF-36).
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_or_create_config(self, create_if_missing: bool = False) -> Optional[HackathonConfig]:
        stmt = select(HackathonConfig).order_by(HackathonConfig.created_at.asc()).limit(1)
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()
        if config is None and create_if_missing:
            now = datetime.now(timezone.utc)
            config = HackathonConfig(
                name="HackFlow 2026 — AI & Web3 Innovation",
                start_time=now - timedelta(days=7),
                end_time=now + timedelta(days=7),
                is_topic_published=True,
                is_result_published=False,
            )
            self.db.add(config)
            await self.db.flush()
            await self.db.refresh(config)
        return config

    async def _list_active_criteria(self) -> List[RubricCriteria]:
        stmt = (
            select(RubricCriteria)
            .where(RubricCriteria.is_active == True)  # noqa: E712
            .order_by(RubricCriteria.display_order.asc(), RubricCriteria.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def _list_final_submissions(self) -> List[Submission]:
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

    async def _list_submitted_evaluations(
        self, submission_ids: List[str]
    ) -> List[Evaluation]:
        if not submission_ids:
            return []
        stmt = (
            select(Evaluation)
            .where(
                Evaluation.submission_id.in_(submission_ids),
                Evaluation.status == EvaluationStatus.SUBMITTED.value,
            )
            .options(selectinload(Evaluation.judge))
            .order_by(Evaluation.evaluated_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def aggregate_and_rank(self) -> List[Dict[str, Any]]:
        """
        Aggregate locked judge evaluations for all Final Checkpoint submissions,
        compute final_score, max_spread, std_dev, discrepancy flags, and rank
        teams using the 3-level Tie-breaker rule (SRS HF-36 Section 5.1 - 5.3).
        """
        active_criteria = await self._list_active_criteria()
        criteria_map = {c.id: c for c in active_criteria}

        # Identify the highest-weight criterion for Tie-breaker Level 1
        top_criterion: Optional[RubricCriteria] = None
        if active_criteria:
            top_criterion = max(
                active_criteria,
                key=lambda c: (float(c.weight), -int(c.display_order)),
            )

        submissions = await self._list_final_submissions()
        submission_ids = [s.id for s in submissions]
        submitted_evals = await self._list_submitted_evaluations(submission_ids)

        # Group evaluations by submission_id -> judge_id -> list[Evaluation]
        evals_by_sub_and_judge: Dict[str, Dict[str, List[Evaluation]]] = {}
        for ev in submitted_evals:
            evals_by_sub_and_judge.setdefault(ev.submission_id, {}).setdefault(
                ev.judge_id, []
            ).append(ev)

        entries: List[Dict[str, Any]] = []
        for sub in submissions:
            team_name = sub.team.team_name if sub.team else f"Team {sub.team_id[:6]}"
            topic_title = "Chưa chọn đề tài"
            if sub.team:
                if sub.team.subtopic and sub.team.subtopic.title:
                    topic_title = sub.team.subtopic.title
                elif sub.team.topic and sub.team.topic.title:
                    topic_title = sub.team.topic.title

            judge_groups = evals_by_sub_and_judge.get(sub.id, {})
            judge_scores_list: List[Dict[str, Any]] = []
            judge_totals: List[float] = []
            top_criterion_scores: List[float] = []

            for judge_id, j_evals in judge_groups.items():
                score_tuples = [
                    (
                        e.score,
                        criteria_map[e.criteria_id].max_score,
                        criteria_map[e.criteria_id].weight,
                    )
                    for e in j_evals
                    if e.criteria_id in criteria_map
                ]
                s_j = calculate_weighted_score(score_tuples)
                judge_totals.append(s_j)

                judge_name = (
                    j_evals[0].judge.full_name
                    if j_evals and j_evals[0].judge
                    else None
                )
                judge_scores_list.append(
                    {
                        "judge_id": judge_id,
                        "judge_name": judge_name,
                        "total_score": s_j,
                    }
                )

                if top_criterion is not None:
                    top_ev = next(
                        (e for e in j_evals if e.criteria_id == top_criterion.id),
                        None,
                    )
                    if top_ev is not None and top_criterion.max_score > 0:
                        norm_top = (
                            float(top_ev.score) / float(top_criterion.max_score)
                        ) * 100.0
                        top_criterion_scores.append(round(norm_top, 2))
                    else:
                        top_criterion_scores.append(0.0)

            m_count = len(judge_totals)
            if m_count == 0:
                final_score = 0.0
                max_spread = 0.0
                std_dev = 0.0
                top_criteria_score = 0.0
                has_discrepancy = False
                warning_code: Optional[str] = None
            else:
                mean_score = sum(judge_totals) / m_count
                final_score = round(mean_score, 2)
                top_criteria_score = (
                    round(sum(top_criterion_scores) / len(top_criterion_scores), 2)
                    if top_criterion_scores
                    else 0.0
                )
                if m_count >= 2:
                    max_spread = round(max(judge_totals) - min(judge_totals), 2)
                    variance = sum((val - mean_score) ** 2 for val in judge_totals) / m_count
                    std_dev = round(math.sqrt(variance), 2)
                    has_discrepancy = bool(
                        max_spread > DEFAULT_MAX_SPREAD_THRESHOLD
                        or std_dev > DEFAULT_STD_DEV_THRESHOLD
                    )
                    warning_code = (
                        "HIGH_DISCREPANCY_WARNING" if has_discrepancy else None
                    )
                else:
                    max_spread = 0.0
                    std_dev = 0.0
                    has_discrepancy = False
                    warning_code = None

            entries.append(
                {
                    "submission_id": sub.id,
                    "team_id": sub.team_id,
                    "team_name": team_name,
                    "anonymous_team_code": generate_anonymous_team_code(sub.team_id),
                    "topic_title": topic_title,
                    "final_score": final_score,
                    "total_score": final_score,
                    "eval_count": m_count,
                    "max_spread": max_spread,
                    "std_dev": std_dev,
                    "top_criteria_score": top_criteria_score,
                    "has_discrepancy": has_discrepancy,
                    "warning_code": warning_code,
                    "judge_scores": judge_scores_list,
                    "submitted_at": (
                        sub.submitted_at.isoformat() if sub.submitted_at else None
                    ),
                    "_submitted_at_dt": sub.submitted_at,
                }
            )

        # Sort using 3-level Tie-breaker:
        # 1. final_score DESC
        # 2. top_criteria_score (highest weight criterion average) DESC
        # 3. std_dev ASC (higher judge consensus wins)
        # 4. submitted_at ASC (earlier valid Final Checkpoint submission wins)
        def _tie_breaker_key(item: Dict[str, Any]):
            dt: Optional[datetime] = item["_submitted_at_dt"]
            if dt is not None:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                ts = dt.timestamp()
            else:
                ts = float("inf")
            return (
                -round(float(item["final_score"]), 2),
                -round(float(item["top_criteria_score"]), 2),
                round(float(item["std_dev"]), 2),
                ts,
                item["submission_id"],
            )

        entries.sort(key=_tie_breaker_key)

        ranked_entries: List[Dict[str, Any]] = []
        for idx, entry in enumerate(entries, start=1):
            entry_copy = {k: v for k, v in entry.items() if k != "_submitted_at_dt"}
            entry_copy["rank"] = idx
            ranked_entries.append(entry_copy)

        return ranked_entries

    async def get_leaderboard(self, current_user: User) -> Dict[str, Any]:
        """
        Retrieve the competition leaderboard (GET /api/v1/leaderboard).
        - If is_result_published == False (DRAFT):
          * Candidate / Mentor / Judge -> 403 RESULTS_NOT_PUBLISHED
          * Admin -> 200 OK with full internal fields (judge_scores, max_spread, std_dev, has_discrepancy)
        - If is_result_published == True (PUBLISHED):
          * Admin -> 200 OK with full internal fields
          * Candidate / Mentor / Judge -> 200 OK with public fields only (no judge_scores or has_discrepancy)
        """
        config = await self._get_or_create_config(create_if_missing=False)
        is_published = bool(config and config.is_result_published)
        is_admin = current_user.role == UserRole.ADMIN.value

        if not is_published and not is_admin:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Results have not been published yet. Please wait for the official announcement.",
                error_code="RESULTS_NOT_PUBLISHED",
                data={
                    "is_result_published": False,
                    "status": "DRAFT",
                },
            )

        ranked = await self.aggregate_and_rank()

        if is_admin:
            return {
                "is_result_published": is_published,
                "status": "PUBLISHED" if is_published else "DRAFT",
                "leaderboard": ranked,
            }

        # Public view for non-admin users when published: strip internal judge_scores and discrepancy flags
        public_entries = [
            {
                "rank": item["rank"],
                "submission_id": item["submission_id"],
                "team_id": item["team_id"],
                "team_name": item["team_name"],
                "topic_title": item["topic_title"],
                "final_score": item["final_score"],
                "total_score": item["total_score"],
                "eval_count": item["eval_count"],
                "submitted_at": item["submitted_at"],
            }
            for item in ranked
        ]
        return {
            "is_result_published": True,
            "status": "PUBLISHED",
            "leaderboard": public_entries,
        }

    async def publish_leaderboard(
        self,
        payload: Optional[PublishLeaderboardRequest],
        current_user: User,
    ) -> Dict[str, Any]:
        """
        Publish or unpublish the official competition leaderboard (PATCH /api/v1/admin/leaderboard/publish).
        - Admin only (403 FORBIDDEN for others).
        - If already published and not unpublishing -> 409 RESULTS_ALREADY_PUBLISHED.
        - Records LEADERBOARD_PUBLISHED / LEADERBOARD_UNPUBLISHED in AuditLog.
        """
        if current_user.role != UserRole.ADMIN.value:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                message="You do not have permission to publish the leaderboard",
                error_code="FORBIDDEN",
            )

        config = await self._get_or_create_config(create_if_missing=True)
        assert config is not None

        wants_unpublish = bool(
            payload is not None
            and (payload.unpublish is True or payload.is_result_published is False)
        )
        now = datetime.now(timezone.utc)

        if not wants_unpublish:
            if config.is_result_published:
                raise AppException(
                    status_code=status.HTTP_409_CONFLICT,
                    message="The leaderboard has already been published",
                    error_code="RESULTS_ALREADY_PUBLISHED",
                )

            config.is_result_published = True
            audit = AuditLog(
                user_id=current_user.id,
                action="LEADERBOARD_PUBLISHED",
                status="success",
                late_grace_period=False,
                details={
                    "published_by": current_user.id,
                    "published_at": now.isoformat(),
                    "result_version": 1,
                },
            )
            self.db.add(audit)
            await self.db.commit()
            await self.db.refresh(config)

            return {
                "is_result_published": True,
                "status": "PUBLISHED",
                "published_by": current_user.id,
                "published_at": now.isoformat(),
                "result_version": 1,
            }

        # Unpublish back to DRAFT
        config.is_result_published = False
        audit = AuditLog(
            user_id=current_user.id,
            action="LEADERBOARD_UNPUBLISHED",
            status="success",
            late_grace_period=False,
            details={
                "unpublished_by": current_user.id,
                "unpublished_at": now.isoformat(),
            },
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(config)

        return {
            "is_result_published": False,
            "status": "DRAFT",
            "published_by": current_user.id,
            "published_at": None,
            "result_version": 1,
        }

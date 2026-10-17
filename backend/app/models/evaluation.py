from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.checkpoint import Submission


class EvaluationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"


class RubricCriteria(BaseModel):
    """
    Judging rubric criteria model with weight, max score, required flag, and display order (HF-42).
    """
    __tablename__ = "rubric_criteria"

    title: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_score: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rubric_name: Mapped[str] = mapped_column(
        String(128), default="HackFlow Final Rubric", nullable=False
    )

    # Relationships
    evaluations: Mapped[List["Evaluation"]] = relationship(
        back_populates="criteria", cascade="all, delete-orphan"
    )


class Evaluation(BaseModel):
    """
    Evaluation score and commentary given by a Judge for a submission (HF-42).
    Enforces one record per (submission_id, judge_id, criteria_id).
    """
    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "judge_id",
            "criteria_id",
            name="uq_eval_submission_judge_criteria",
        ),
    )

    submission_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    judge_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    criteria_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rubric_criteria.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    general_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), default=EvaluationStatus.DRAFT.value, nullable=False, index=True
    )
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    submission: Mapped["Submission"] = relationship(back_populates="evaluations")
    judge: Mapped["User"] = relationship(back_populates="evaluations")
    criteria: Mapped["RubricCriteria"] = relationship(back_populates="evaluations")


class JudgeAssignment(BaseModel):
    """
    Optional explicit assignment linking a Judge to specific submissions or teams (US-14 / HF-42).
    If no rows exist in this table, all Final Checkpoint submissions are open to all Judges by default.
    """
    __tablename__ = "judge_assignments"
    __table_args__ = (
        UniqueConstraint(
            "judge_id",
            "submission_id",
            name="uq_judge_assignment_judge_submission",
        ),
    )

    judge_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submission_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    team_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=True, index=True
    )
    assigned_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


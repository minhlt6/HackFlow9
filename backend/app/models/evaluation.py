from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.checkpoint import Submission


class RubricCriteria(BaseModel):
    """
    Judging rubric criteria model with weight and max score.
    """
    __tablename__ = "rubric_criteria"

    title: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_score: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    evaluations: Mapped[List["Evaluation"]] = relationship(
        back_populates="criteria", cascade="all, delete-orphan"
    )


class Evaluation(BaseModel):
    """
    Evaluation score and commentary given by a Judge for a submission.
    """
    __tablename__ = "evaluations"

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
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    submission: Mapped["Submission"] = relationship(back_populates="evaluations")
    judge: Mapped["User"] = relationship(back_populates="evaluations")
    criteria: Mapped["RubricCriteria"] = relationship(back_populates="evaluations")

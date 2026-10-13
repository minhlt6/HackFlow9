from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Any, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.team import Team
    from app.models.evaluation import Evaluation


class SubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
    PENDING_SHA_FREEZE = "pending_sha_freeze"
    SHA_VERIFICATION_FAILED = "sha_verification_failed"
    EVALUATED = "evaluated"
    LATE = "late"
    INVALID = "invalid"


class Checkpoint(BaseModel):
    """
    Hackathon time-gated checkpoint / milestone.
    """
    __tablename__ = "checkpoints"

    title: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_final_checkpoint: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    grace_period_seconds: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    submission_fields: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    # Relationships
    submissions: Mapped[List["Submission"]] = relationship(
        back_populates="checkpoint", cascade="all, delete-orphan"
    )


class Submission(BaseModel):
    """
    Team submission per checkpoint, capturing frozen GitHub Commit SHA.
    """
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("team_id", "checkpoint_id", name="uq_submission_team_checkpoint"),
    )

    checkpoint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("checkpoints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    demo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    submission_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default=SubmissionStatus.SUBMITTED.value, nullable=False, index=True
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    checkpoint: Mapped["Checkpoint"] = relationship(back_populates="submissions")
    team: Mapped["Team"] = relationship(back_populates="submissions")
    evaluations: Mapped[List["Evaluation"]] = relationship(
        back_populates="submission", cascade="all, delete-orphan"
    )

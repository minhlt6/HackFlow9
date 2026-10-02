from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.team import Team
    from app.models.evaluation import Evaluation


class SubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
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

    # Relationships
    submissions: Mapped[List["Submission"]] = relationship(
        back_populates="checkpoint", cascade="all, delete-orphan"
    )


class Submission(BaseModel):
    """
    Team submission per checkpoint, capturing frozen GitHub Commit SHA.
    """
    __tablename__ = "submissions"

    checkpoint_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("checkpoints.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repo_url: Mapped[str] = mapped_column(String(255), nullable=False)
    demo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    commit_sha: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
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

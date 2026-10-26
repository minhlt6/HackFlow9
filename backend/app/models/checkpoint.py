from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Any, List, Optional
from sqlalchemy import Boolean, Float, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
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

    weight: Mapped[float] = mapped_column(Float, nullable=False, default=0, server_default="0")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
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
    submitted_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    repo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    demo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    submission_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default=SubmissionStatus.SUBMITTED.value, nullable=False, index=True
    )
    grace_period_applied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    version_history: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
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


class AuditLog(BaseModel):
    """
    Audit trail for checkpoint submissions, resubmissions, SHA fallbacks, rollbacks,
    and administrative checkpoint modifications (HF-34 & SRS HF-23).
    """
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    team_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    checkpoint_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("checkpoints.id", ondelete="SET NULL"), nullable=True, index=True
    )
    submission_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    late_grace_period: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    details: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)


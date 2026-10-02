from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.topic import Topic, Subtopic
    from app.models.checkpoint import Submission
    from app.models.support import SupportTicket


class TeamMemberRole(str, Enum):
    LEADER = "leader"
    MEMBER = "member"


class Team(BaseModel):
    """
    Hackathon competition team model.
    """
    __tablename__ = "teams"

    team_name: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    topic_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subtopic_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("subtopics.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    members: Mapped[List["TeamMember"]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )
    topic: Mapped[Optional["Topic"]] = relationship(
        foreign_keys=[topic_id], back_populates="teams"
    )
    subtopic: Mapped[Optional["Subtopic"]] = relationship(
        foreign_keys=[subtopic_id], back_populates="teams"
    )
    submissions: Mapped[List["Submission"]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )
    support_tickets: Mapped[List["SupportTicket"]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )


class TeamMember(BaseModel):
    """
    Many-to-many junction model linking Users to Teams with specific role (leader/member).
    """
    __tablename__ = "team_members"

    team_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(
        String(32), default=TeamMemberRole.MEMBER.value, nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    team: Mapped["Team"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="team_memberships")

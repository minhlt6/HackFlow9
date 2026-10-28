from enum import Enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey, String, Text, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.team import Team
    from app.models.user import User


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class SupportTicket(BaseModel):
    """
    Candidate helpdesk / mentor support ticket model.
    """
    __tablename__ = "support_tickets"

    team_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default=TicketStatus.OPEN.value, nullable=False, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(16), default=TicketPriority.NORMAL.value, nullable=False
    )
    category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    messages: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    team: Mapped[Optional["Team"]] = relationship(back_populates="support_tickets")
    user: Mapped["User"] = relationship(foreign_keys=[user_id], back_populates="support_tickets")
    assignee: Mapped[Optional["User"]] = relationship(
        foreign_keys=[assigned_to], back_populates="assigned_tickets"
    )

    @property
    def team_name(self) -> Optional[str]:
        team_obj = self.__dict__.get("team")
        if team_obj and getattr(team_obj, "team_name", None):
            return team_obj.team_name
        user_obj = self.__dict__.get("user")
        if user_obj:
            memberships = user_obj.__dict__.get("team_memberships") or []
            for tm in memberships:
                tm_team = tm.__dict__.get("team")
                if tm_team and getattr(tm_team, "team_name", None):
                    return tm_team.team_name
        return None

    @property
    def creator_name(self) -> Optional[str]:
        user_obj = self.__dict__.get("user")
        if user_obj:
            return user_obj.full_name or user_obj.github_username or user_obj.email
        return None

    @property
    def assignee_name(self) -> Optional[str]:
        assignee_obj = self.__dict__.get("assignee")
        if assignee_obj:
            return assignee_obj.full_name or assignee_obj.github_username or assignee_obj.email
        return None

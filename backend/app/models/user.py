from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.team import TeamMember
    from app.models.evaluation import Evaluation
    from app.models.support import SupportTicket


class UserRole(str, Enum):
    ADMIN = "admin"
    JUDGE = "judge"
    CANDIDATE = "candidate"
    MENTOR = "mentor"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(BaseModel):
    """
    User account model supporting GitHub OAuth and traditional password credentials.
    """
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default=UserRole.CANDIDATE.value, nullable=False, index=True)
    approval_status: Mapped[str] = mapped_column(
        String(32), default=ApprovalStatus.PENDING.value, nullable=False, index=True
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    github_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    github_username: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    team_memberships: Mapped[List["TeamMember"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    evaluations: Mapped[List["Evaluation"]] = relationship(
        back_populates="judge", cascade="all, delete-orphan"
    )
    support_tickets: Mapped[List["SupportTicket"]] = relationship(
        foreign_keys="SupportTicket.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    assigned_tickets: Mapped[List["SupportTicket"]] = relationship(
        foreign_keys="SupportTicket.assigned_to",
        back_populates="assignee",
    )

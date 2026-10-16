from enum import Enum
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AnnouncementPriority(str, Enum):
    """Priority levels for announcements matching BA spec HF-24."""
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"


class Announcement(BaseModel):
    """
    Announcement model for organization-wide notifications.
    Only Admin/BTC users may create, update, or delete announcements.
    """
    __tablename__ = "announcements"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(
        String(32),
        default=AnnouncementPriority.INFO.value,
        nullable=False,
        index=True,
    )

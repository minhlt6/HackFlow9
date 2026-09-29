import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TimestampMixin:
    """
    Mixin that adds created_at and updated_at timestamp columns to models.
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class UUIDMixin:
    """
    Mixin that adds a UUID string primary key.
    """
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )


class BaseModel(Base, UUIDMixin, TimestampMixin):
    """
    Abstract declarative base model with UUID primary key and timestamps.
    Subclasses define their own table attributes.
    """
    __abstract__ = True

    def to_dict(self) -> dict:
        """
        Convert SQLAlchemy model instance columns to a dictionary.
        """
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class WhitelistEntry(BaseModel):
    """
    Stores emails pre-approved by BTC for candidate participation.

    Lifecycle:
      1. BTC imports emails in bulk (before registration opens) → is_active=True
      2. OR BTC approves a PENDING candidate → system auto-inserts their email here
      3. On GitHub OAuth: email found here → account gets APPROVED immediately
                          email NOT found  → account gets PENDING, waits for BTC review
    """

    __tablename__ = "whitelists"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    note: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="BTC note, e.g. 'SV CNTT K21 - ĐH ABC'"
    )

    # Who added this entry (nullable to support bulk-import without user context)
    added_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationship back to the admin who added this entry
    added_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[added_by],
        lazy="select",
    )

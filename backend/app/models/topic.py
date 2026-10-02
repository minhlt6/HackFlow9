from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.team import Team


class Topic(BaseModel):
    """
    Main Hackathon topic / track model.
    """
    __tablename__ = "topics"

    title: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_teams: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    current_teams: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    subtopics: Mapped[List["Subtopic"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
    teams: Mapped[List["Team"]] = relationship(
        foreign_keys="Team.topic_id", back_populates="topic"
    )


class Subtopic(BaseModel):
    """
    Detailed subtopic / specific problem statement under a main Topic.
    """
    __tablename__ = "subtopics"

    topic_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_teams: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    current_teams: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship(back_populates="subtopics")
    teams: Mapped[List["Team"]] = relationship(
        foreign_keys="Team.subtopic_id", back_populates="subtopic"
    )

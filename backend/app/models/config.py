from datetime import datetime
from sqlalchemy import Boolean, DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class HackathonConfig(BaseModel):
    """
    Hackathon competition general configuration and phase state.
    """
    __tablename__ = "hackathon_config"

    settings_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    name: Mapped[str] = mapped_column(String(128), default="HackFlow Competition", nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_topic_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_result_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

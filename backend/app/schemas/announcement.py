from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementPriorityEnum(str, Enum):
    """Mirror of model enum for schema validation."""
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"


class AnnouncementCreate(BaseModel):
    """Schema for creating a new announcement (POST request body)."""
    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Tiêu đề thông báo",
    )
    content: str = Field(
        ...,
        min_length=1,
        description="Nội dung thông báo",
    )
    priority: AnnouncementPriorityEnum = Field(
        default=AnnouncementPriorityEnum.INFO,
        description="Mức độ ưu tiên: info | warning | urgent",
    )


class AnnouncementUpdate(BaseModel):
    """Schema for updating an announcement (PUT request body). All fields optional."""
    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Tiêu đề thông báo",
    )
    content: Optional[str] = Field(
        None,
        min_length=1,
        description="Nội dung thông báo",
    )
    priority: Optional[AnnouncementPriorityEnum] = Field(
        None,
        description="Mức độ ưu tiên: info | warning | urgent",
    )


class AnnouncementResponse(BaseModel):
    """Schema for returning a single announcement."""
    id: str
    title: str
    content: str
    priority: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnnouncementPaginationResponse(BaseModel):
    """Paginated list response for announcements."""
    items: List[AnnouncementResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True)

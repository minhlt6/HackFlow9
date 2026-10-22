from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AnnouncementPriorityEnum(str, Enum):
    """Mirror of model enum for schema validation."""
    INFO = "info"
    WARNING = "warning"
    URGENT = "urgent"


class AnnouncementCreate(BaseModel):
    """Schema for creating a new announcement (POST request body)."""
    model_config = ConfigDict(str_strip_whitespace=True)

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

    @model_validator(mode="before")
    @classmethod
    def map_type_to_priority(cls, values: Any) -> Any:
        if isinstance(values, dict):
            values = dict(values)
            if "priority" not in values and "type" in values and values["type"]:
                t_val = str(values["type"]).lower().strip()
                if t_val in ("info", "warning", "urgent"):
                    values["priority"] = t_val
        return values


class AnnouncementUpdate(BaseModel):
    """Schema for updating an announcement (PUT request body). All fields optional."""
    model_config = ConfigDict(str_strip_whitespace=True)

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

    @model_validator(mode="before")
    @classmethod
    def map_type_to_priority(cls, values: Any) -> Any:
        if isinstance(values, dict):
            values = dict(values)
            if "priority" not in values and "type" in values and values["type"]:
                t_val = str(values["type"]).lower().strip()
                if t_val in ("info", "warning", "urgent"):
                    values["priority"] = t_val
        return values


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

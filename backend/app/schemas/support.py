from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.support import TicketPriority, TicketStatus


class TicketCreate(BaseModel):
    """Schema for creating a new support ticket (POST /tickets)."""
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(
        ...,
        min_length=5,
        max_length=128,
        description="Tiêu đề yêu cầu hỗ trợ",
    )
    content: str = Field(
        ...,
        min_length=10,
        description="Nội dung chi tiết yêu cầu hỗ trợ",
    )
    category: Optional[str] = Field(
        default="technical",
        description="Phân loại hỗ trợ kỹ thuật",
    )
    priority: TicketPriority = Field(
        default=TicketPriority.NORMAL,
        description="Mức độ ưu tiên: low | normal | high | urgent",
    )


class TicketUpdate(BaseModel):
    """Schema for updating a support ticket (PATCH /tickets/{id})."""
    model_config = ConfigDict(str_strip_whitespace=True)

    action: Optional[str] = Field(
        default=None,
        description="Hành động theo SRS HF-37: accept | update_response | resolve | close | reopen | escalate",
    )
    status: Optional[TicketStatus] = Field(
        default=None,
        description="Trạng thái xử lý: open | in_progress | resolved | closed",
    )
    response: Optional[str] = Field(
        default=None,
        description="Nội dung phản hồi từ Mentor hoặc BTC/Admin",
    )
    note: Optional[str] = Field(
        default=None,
        description="Ghi chú chuyển giao (escalate) lên Admin",
    )
    target_admin_id: Optional[str] = Field(
        default=None,
        description="ID Admin nhận chuyển giao trực tiếp",
    )
    assigned_to: Optional[str] = Field(
        default=None,
        description="ID người xử lý được phân công (Mentor/Admin)",
    )
    priority: Optional[TicketPriority] = Field(
        default=None,
        description="Mức độ ưu tiên",
    )


class TicketResponse(BaseModel):
    """Schema for returning support ticket information."""
    id: str
    team_id: Optional[str] = None
    user_id: str
    assigned_to: Optional[str] = None
    title: str
    content: str
    category: Optional[str] = None
    priority: TicketPriority
    status: TicketStatus
    response: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

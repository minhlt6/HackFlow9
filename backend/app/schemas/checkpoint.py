from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CheckpointStatus(str, Enum):
    UPCOMING = "upcoming"
    OPEN = "open"
    GRACE_PERIOD = "grace_period"
    CLOSED = "closed"


# ─── Request Schemas ────────────────────────────────────────────────────────

class CheckpointCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=128, description="Tên mốc checkpoint / milestone")
    description: Optional[str] = Field(None, description="Mô tả chi tiết yêu cầu mốc nộp bài")
    start_time: datetime = Field(..., description="Thời điểm mở cổng nộp bài (ISO 8601 UTC)")
    deadline: datetime = Field(..., description="Hạn chót đóng cổng nộp bài (ISO 8601 UTC)")
    requirements: Optional[str] = Field(None, description="Chi tiết các tiêu chí/tệp cần nộp (Markdown)")
    is_active: bool = Field(True, description="Trạng thái kích hoạt mốc checkpoint của BTC")

    @field_validator("deadline")
    @classmethod
    def validate_deadline_after_start(cls, v: datetime, info) -> datetime:
        start_time = info.data.get("start_time")
        if start_time and v <= start_time:
            raise ValueError("Thời hạn chót (deadline) phải sau thời điểm mở cổng (start_time).")
        return v


class CheckpointUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=128)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    deadline: Optional[datetime] = None
    requirements: Optional[str] = None
    is_active: Optional[bool] = None


class CheckpointToggleActiveRequest(BaseModel):
    is_active: bool = Field(..., description="True: Mở kích hoạt; False: Tạm khóa bởi BTC")


class CheckpointValidateWindowRequest(BaseModel):
    simulate_time: Optional[datetime] = Field(
        None,
        description="Thời điểm giả lập để kiểm thử UAT/QA (Chỉ áp dụng khi Admin test). Mặc định là thời gian thực của server.",
    )


# ─── Response Schemas ────────────────────────────────────────────────────────

class CheckpointResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    deadline: datetime
    requirements: Optional[str] = None
    is_active: bool
    status: str = Field(..., description="upcoming | open | grace_period | closed")
    is_open: bool = Field(..., description="True nếu cổng đang mở hoặc đang trong thời gian ân hạn mạng")
    can_submit: bool = Field(..., description="True nếu cho phép nộp bài tại thời điểm hiện tại")
    grace_period_seconds: int = Field(5, description="Thời gian ân hạn mạng cho phép (giây)")
    time_remaining_seconds: int = Field(0, description="Số giây còn lại đến deadline chính thức (0 nếu đã quá hạn)")
    time_until_start_seconds: int = Field(0, description="Số giây đếm ngược đến lúc mở cổng (0 nếu đã mở)")
    server_time: datetime = Field(..., description="Thời gian hiện tại của Server chuẩn UTC")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CheckpointTimeGatedStatusResponse(BaseModel):
    checkpoint_id: str
    title: str
    server_time: datetime
    start_time: datetime
    deadline: datetime
    is_active: bool
    is_open: bool
    status: str
    can_submit: bool
    grace_period_applied: bool
    grace_period_seconds: int = 5
    time_remaining_seconds: int
    time_until_start_seconds: int
    message: str


class ValidateSubmissionWindowResponse(BaseModel):
    is_valid: bool
    grace_period_applied: bool
    checkpoint_id: str
    checkpoint_title: str
    server_time: datetime
    message: str

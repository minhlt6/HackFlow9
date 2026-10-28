from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SubtopicResponse(BaseModel):
    id: str
    topic_id: str
    mentor_id: Optional[str] = None
    mentor_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    max_teams: int
    current_teams: int
    remaining_slots: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TopicResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    max_teams: int
    current_teams: int
    remaining_slots: int
    is_active: bool
    status: str
    subtopics: List[SubtopicResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TopicCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    max_teams: int = Field(default=50, ge=1)
    is_active: bool = Field(default=True)


class SubtopicCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mentor_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    max_teams: int = Field(default=5, ge=1)
    quota_max: Optional[int] = Field(default=None, ge=1)
    is_active: bool = Field(default=True)


class SubtopicUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mentor_id: Optional[str] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=128)
    description: Optional[str] = None
    max_teams: Optional[int] = Field(default=None, ge=1)
    quota_max: Optional[int] = Field(default=None, ge=1)
    is_active: Optional[bool] = None


class TopicSelectRequest(BaseModel):
    topic_id: str = Field(..., description="ID của đề tài chính hoặc đề tài phụ cần chọn")
    subtopic_id: Optional[str] = Field(None, description="ID của đề tài phụ / subtopic (nếu có)")


class TopicCancelRequest(BaseModel):
    team_id: Optional[str] = Field(None, description="ID của đội thi cần hủy đề tài (mặc định lấy đội của user)")


class TopicSelectResponse(BaseModel):
    team_id: str
    topic_id: str
    subtopic_id: Optional[str] = None
    topic_title: str
    remaining_slots: int

    model_config = ConfigDict(from_attributes=True)

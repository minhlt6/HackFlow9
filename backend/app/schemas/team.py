from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TeamCreateRequest(BaseModel):
    team_name: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Tên đội thi (3-50 ký tự, không chứa khoảng trắng thừa)",
        examples=["CyberWarriors"],
    )

    @field_validator("team_name")
    @classmethod
    def validate_team_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("Tên đội phải có ít nhất 3 ký tự sau khi loại bỏ khoảng trắng.")
        if len(cleaned) > 50:
            raise ValueError("Tên đội không được vượt quá 50 ký tự.")
        return cleaned


class TeamJoinRequest(BaseModel):
    invite_code: str = Field(
        ...,
        min_length=6,
        max_length=16,
        description="Mã mời tham gia đội (6 ký tự)",
        examples=["A1B2C3"],
    )

    @field_validator("invite_code")
    @classmethod
    def validate_invite_code(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if len(cleaned) < 6:
            raise ValueError("Mã mời không hợp lệ.")
        return cleaned


class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    role: str
    avatar_url: Optional[str] = None
    github_username: Optional[str] = None
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamResponse(BaseModel):
    id: str
    team_name: str
    invite_code: str
    status: str
    is_locked: bool = False
    member_count: int
    min_members: int = 3
    max_members: int = 5
    leader_id: Optional[str] = None
    topic_id: Optional[str] = None
    topic_name: Optional[str] = None
    subtopic_id: Optional[str] = None
    members: List[TeamMemberResponse] = []
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

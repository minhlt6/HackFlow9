from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


# ─── Request Schemas ────────────────────────────────────────────────────────

class WhitelistAddRequest(BaseModel):
    email: EmailStr
    note: Optional[str] = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower().strip()


class WhitelistBulkAddRequest(BaseModel):
    emails: List[EmailStr]
    note: Optional[str] = None

    @field_validator("emails")
    @classmethod
    def normalize_emails(cls, v: List[str]) -> List[str]:
        return [e.lower().strip() for e in v]


# ─── Response Schemas ────────────────────────────────────────────────────────

class WhitelistEntryResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    note: Optional[str] = None
    added_by: Optional[str] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


class WhitelistBulkAddResponse(BaseModel):
    imported: int
    emails: List[str]


class WhitelistDeactivateResponse(BaseModel):
    id: str
    email: str
    is_active: bool


class CandidatePendingResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None
    student_id: Optional[str] = None
    school: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[List[str]] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Admin: Candidate Approval ───────────────────────────────────────────────

class CandidateApprovalRequest(BaseModel):
    """Body for BTC to approve or reject a PENDING candidate."""
    action: str  # "approve" | "reject"
    note: Optional[str] = None  # rejection reason or admin note

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ("approve", "reject"):
            raise ValueError("action must be 'approve' or 'reject'")
        return v


# ─── Admin: Hackathon Config & Stats (HF-51) ─────────────────────────────────

class HackathonConfigUpdateRequest(BaseModel):
    name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_topic_published: Optional[bool] = None
    is_result_published: Optional[bool] = None

    # Extended UI fields (camelCase compatibility with AdminConfigPage)
    eventName: Optional[str] = None
    season: Optional[str] = None
    status: Optional[str] = None
    startAt: Optional[datetime] = None
    endAt: Optional[datetime] = None
    registrationDeadline: Optional[str] = None
    blindJudgingEnabled: Optional[bool] = None
    leaderboardPublished: Optional[bool] = None
    topicSelectionLocked: Optional[bool] = None
    submissionFreezeEnabled: Optional[bool] = None
    maxTeamSize: Optional[int] = None
    minTeamSize: Optional[int] = None
    discrepancyThreshold: Optional[int] = None


class HackathonConfigResponse(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    is_topic_published: bool
    is_result_published: bool

    # Extended UI fields
    eventName: str
    season: str = "Fall 2026"
    status: str = "hacking"
    startAt: str
    endAt: str
    registrationDeadline: str = "2026-10-14T16:59:00.000Z"
    blindJudgingEnabled: bool = True
    leaderboardPublished: bool = False
    topicSelectionLocked: bool = False
    submissionFreezeEnabled: bool = True
    maxTeamSize: int = 5
    minTeamSize: int = 2
    discrepancyThreshold: int = 15


class AdminStatsResponse(BaseModel):
    total_candidates: int
    pending_approvals: int
    total_teams: int
    total_topics: int
    total_submissions: int
    open_tickets: int

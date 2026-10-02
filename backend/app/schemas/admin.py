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
    note: Optional[str]
    added_by: Optional[str]
    created_at: str

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

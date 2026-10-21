from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PublishLeaderboardRequest(BaseModel):
    """Request body for PATCH /api/v1/admin/leaderboard/publish (HF-43 / SRS HF-36)."""
    is_result_published: Optional[bool] = Field(default=True)
    unpublish: Optional[bool] = Field(default=False)


class JudgeScoreItem(BaseModel):
    """Individual judge score summary visible only to Admin on the draft/published leaderboard."""
    judge_id: str
    judge_name: Optional[str] = None
    total_score: float


class LeaderboardEntrySchema(BaseModel):
    """Schema for a ranked team entry on the leaderboard."""
    rank: int
    submission_id: str
    team_id: str
    team_name: str
    topic_title: str
    final_score: float
    total_score: float
    eval_count: int
    submitted_at: Optional[str] = None
    # Admin-only fields
    anonymous_team_code: Optional[str] = None
    max_spread: Optional[float] = None
    std_dev: Optional[float] = None
    top_criteria_score: Optional[float] = None
    has_discrepancy: Optional[bool] = None
    warning_code: Optional[str] = None
    judge_scores: Optional[List[Dict[str, Any]]] = None

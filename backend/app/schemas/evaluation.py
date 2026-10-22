from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class RubricCriterionInput(BaseModel):
    """Input schema for a single rubric criterion when configuring a rubric."""
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    max_score: float = Field(default=10.0)
    weight: float = Field(...)
    is_required: bool = Field(default=True)
    display_order: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True)

    @model_validator(mode="before")
    @classmethod
    def normalize_title_alias(cls, values: Any) -> Any:
        if isinstance(values, dict) and not values.get("title") and values.get("name"):
            values = dict(values)
            values["title"] = values["name"]
        return values


class RubricConfigureRequest(BaseModel):
    """Request schema for POST /api/v1/rubrics (Admin only)."""
    name: str = Field(default="HackFlow Final Rubric", min_length=1, max_length=128)
    criteria: List[RubricCriterionInput] = Field(default_factory=list)


class RubricCriteriaResponse(BaseModel):
    """Response schema for a single rubric criterion."""
    id: str
    title: str
    description: Optional[str] = None
    max_score: float
    weight: float
    is_required: bool
    display_order: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class EvaluationCriterionScoreInput(BaseModel):
    """Input score and commentary for a single rubric criterion."""
    criteria_id: str
    score: Optional[float] = None
    comment: Optional[str] = None


class EvaluationSubmitRequest(BaseModel):
    """Request schema for POST /api/v1/evaluations (Judge)."""
    submission_id: Optional[str] = None
    status: str = Field(default="draft")
    evaluations: List[EvaluationCriterionScoreInput] = Field(default_factory=list)
    general_comment: Optional[str] = None
    team_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_evaluations_alias(cls, values: Any) -> Any:
        if isinstance(values, dict):
            values = dict(values)
            if not values.get("submission_id") and values.get("team_id"):
                values["submission_id"] = str(values["team_id"])
            if "status" not in values and "is_draft" in values:
                values["status"] = "draft" if values["is_draft"] else "submitted"
            if "evaluations" not in values:
                raw_scores = values.get("scores") if "scores" in values else values.get("details")
                if isinstance(raw_scores, list):
                    values["evaluations"] = [
                        {
                            **item,
                            "criteria_id": item.get("criteria_id") or item.get("criteriaId"),
                        }
                        if isinstance(item, dict)
                        else item
                        for item in raw_scores
                    ]
                elif isinstance(raw_scores, dict):
                    values["evaluations"] = [
                        {"criteria_id": k, "score": v} for k, v in raw_scores.items()
                    ]
        return values


class BlindSubmissionResponse(BaseModel):
    """
    Blind Judging submission item returned to Judges via GET /api/v1/evaluations/submissions.
    Strictly omits team_id, team_name, and member identities.
    """
    submission_id: str
    anonymous_team_code: str
    topic_title: str
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    slide_url: Optional[str] = None
    commit_sha: Optional[str] = None
    note: Optional[str] = None
    submitted_at: Optional[datetime] = None
    evaluation_status: str
    my_total_score: Optional[float] = None
    my_evaluations: List[Dict[str, Any]] = Field(default_factory=list)


class AdminUnlockEvaluationRequest(BaseModel):
    """Optional request body for PATCH /api/v1/admin/evaluations/{submission_id}/judges/{judge_id}/unlock."""
    reason: Optional[str] = Field(default="Admin unlocked evaluation for re-assessment")


class JudgeAssignmentCreateRequest(BaseModel):
    """Request body for assigning a judge to one or more submissions/teams."""
    judge_id: str
    submission_id: Optional[str] = None
    submission_ids: Optional[List[str]] = None
    team_id: Optional[str] = None

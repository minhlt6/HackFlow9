from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SubmissionCreateRequest(BaseModel):
    """
    Request schema for POST /api/v1/submissions and POST /api/v1/checkpoints/{checkpoint_id}/submissions (HF-34 & SRS HF-23).
    Supports both structured `submission_data` dict and top-level dynamic fields for full Frontend & Postman compatibility.
    """
    checkpoint_id: Optional[str] = Field(
        None,
        description="UUID của mốc Checkpoint cần nộp bài (bắt buộc khi gọi POST /api/v1/submissions)",
    )
    submission_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Dữ liệu các trường động theo cấu hình submission_fields của checkpoint (vd: repo_url, demo_url, slide_url)",
    )
    repo_url: Optional[str] = Field(
        None,
        max_length=255,
        description="Đường dẫn kho mã nguồn GitHub (có thể truyền trực tiếp hoặc nằm trong submission_data)",
    )
    demo_url: Optional[str] = Field(
        None,
        max_length=255,
        description="Đường dẫn Live Demo / Tài liệu báo cáo (có thể truyền trực tiếp hoặc nằm trong submission_data)",
    )
    slide_url: Optional[str] = Field(
        None,
        max_length=255,
        description="Đường dẫn Slide thuyết trình (nếu truyền trực tiếp)",
    )
    presentation_pdf: Optional[str] = Field(
        None,
        max_length=255,
        description="Đường dẫn file thuyết trình PDF (nếu truyền trực tiếp)",
    )
    note: Optional[str] = Field(
        None,
        max_length=500,
        description="Ghi chú bổ sung cho lần nộp bài (tối đa 500 ký tự)",
    )
    simulate_time: Optional[datetime] = Field(
        None,
        description="Thời điểm giả lập của Server (ISO 8601 UTC) phục vụ kiểm thử UAT Time-Gated & Grace Period",
    )

    model_config = ConfigDict(extra="allow")


class SubmissionResponse(BaseModel):
    """
    Standardized response schema for Checkpoint Submission (HF-34, SRS HF-23 Mục 6 & HF-35 Mục 3).
    `status` uses lowercase snake_case ('submitted', 'pending_sha_freeze', 'sha_verification_failed', 'evaluated', 'late', 'invalid').
    """
    id: str = Field(..., description="UUID định danh bản ghi nộp bài")
    submission_id: str = Field(..., description="UUID định danh bản ghi nộp bài (alias chuẩn SRS Mục 6)")
    checkpoint_id: str = Field(..., description="UUID của mốc Checkpoint")
    team_id: str = Field(..., description="UUID của Đội thi")
    submitted_by: Optional[str] = Field(None, description="UUID của Đội trưởng thực hiện nộp bài")
    repo_url: Optional[str] = Field(None, description="URL kho mã nguồn GitHub đã chuẩn hóa")
    demo_url: Optional[str] = Field(None, description="URL bản Demo / Báo cáo tiến độ")
    commit_sha: Optional[str] = Field(
        None,
        description="Mã hash SHA-1 40 ký tự đóng băng tại thời điểm nộp (chỉ có ở Final Checkpoint)",
    )
    submission_data: Optional[Dict[str, Any]] = Field(
        None, description="Toàn bộ dữ liệu trường động đã nộp"
    )
    note: Optional[str] = Field(None, description="Ghi chú lần nộp bài của đội thi")
    feedback: Optional[str] = Field(None, description="Nhận xét từ Ban giám khảo / Mentor")
    status: str = Field(
        ...,
        description="Trạng thái bài nộp: 'submitted' | 'pending_sha_freeze' | 'sha_verification_failed' | 'evaluated' | 'late' | 'invalid'",
    )
    grace_period_applied: bool = Field(
        False,
        description="True nếu bài nộp được tiếp nhận trong khoảng thời gian ân hạn mạng (Grace Period)",
    )
    late_grace_period: bool = Field(
        False,
        description="Cờ đánh dấu bài nộp trong vùng Grace Period (tương đương grace_period_applied)",
    )
    version: int = Field(1, description="Số thứ tự phiên bản nộp bài (v1, v2, ...)")
    version_history: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Danh sách lịch sử các phiên bản nộp trước đó khi Đội trưởng nộp lại (Resubmission)",
    )
    is_duplicate: bool = Field(
        False,
        description="True nếu hệ thống phát hiện request trùng lặp trong cửa sổ Idempotency (10s hoặc Idempotency-Key)",
    )
    submitted_at: datetime = Field(..., description="Thời điểm Server tiếp nhận bài nộp (UTC)")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    """
    Response schema for Audit Log records (HF-34 & UAT-CP-05 / UAT-CP-13).
    """
    id: str
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    checkpoint_id: Optional[str] = None
    submission_id: Optional[str] = None
    action: str
    status: str
    ip_address: Optional[str] = None
    late_grace_period: bool = False
    commit_sha: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

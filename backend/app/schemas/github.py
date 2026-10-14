from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class VerifyGitHubRepoRequest(BaseModel):
    """
    Request model for inspecting public GitHub repository and latest HEAD commit.
    """
    repo_url: str = Field(
        ...,
        min_length=5,
        max_length=255,
        examples=["https://github.com/torvalds/linux"],
        description="Đường dẫn repository GitHub (vd: https://github.com/owner/repo hoặc đuôi .git)",
    )
    branch: Optional[str] = Field(
        None,
        max_length=64,
        description="Tên nhánh cần lấy SHA (tùy chọn). Mặc định lấy commit HEAD của default branch.",
    )


class VerifyGitHubRepoResponse(BaseModel):
    """
    Response model returning extracted commit metadata and verification status.
    """
    repo_url: str
    owner: str
    repo: str
    branch: Optional[str] = None
    commit_sha: Optional[str] = Field(
        None, description="Mã hash SHA-1 40 ký tự của commit HEAD mới nhất"
    )
    commit_message: Optional[str] = Field(None, description="Tiêu đề commit mới nhất")
    author: Optional[str] = Field(None, description="Tên tác giả commit")
    committed_at: Optional[datetime] = Field(None, description="Thời điểm commit chuẩn UTC")
    html_url: Optional[str] = Field(None, description="Link xem commit trực tiếp trên GitHub")
    is_verified: bool = Field(..., description="True nếu xác thực SHA thành công")
    is_fallback: bool = Field(
        False,
        description="True nếu GitHub API gặp sự cố và kích hoạt Graceful Fallback chuyển sang đối soát thủ công",
    )
    message: str = Field(..., description="Thông báo chi tiết kết quả xác thực")


class GitHubFreezeResult(BaseModel):
    """
    Internal result schema used by Checkpoint & Submission services (HF-33 / HF-34).
    """
    freeze_required: bool
    should_freeze: bool
    commit_sha: Optional[str] = None
    repo_url: Optional[str] = None
    status: str
    commit_message: Optional[str] = None
    author: Optional[str] = None
    committed_at: Optional[datetime] = None
    is_fallback: bool = False
    incident_note: Optional[str] = None

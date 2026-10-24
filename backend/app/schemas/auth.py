from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Email tài khoản")
    password: str = Field(..., min_length=6, description="Mật khẩu tài khoản (tối thiểu 6 ký tự)")


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="Email tài khoản")
    password: str = Field(..., min_length=6, description="Mật khẩu tối thiểu 6 ký tự")
    full_name: str = Field(..., min_length=2, description="Họ và tên đầy đủ")
    role: Optional[str] = Field("candidate", description="Vai trò: candidate, judge, mentor, admin")


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    approval_status: str
    avatar_url: Optional[str] = None
    github_id: Optional[str] = None
    github_username: Optional[str] = None
    student_id: Optional[str] = None
    school: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[list[str]] = None
    bio: Optional[str] = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class GitHubOAuthUrlResponse(BaseModel):
    url: str
    client_id: str


class GitHubOAuthCallbackRequest(BaseModel):
    code: str = Field(..., description="Mã xác thực code trả về từ GitHub OAuth redirect")
    state: Optional[str] = Field(None, description="State token chống CSRF")
    redirect_uri: Optional[str] = Field(None, description="URL callback động của Frontend hiện tại")


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Họ và tên thí sinh")
    student_id: Optional[str] = Field(None, description="Mã số sinh viên")
    school: Optional[str] = Field(None, description="Trường / Học viện")
    phone: Optional[str] = Field(None, description="Số điện thoại liên hệ")
    skills: Optional[list[str]] = Field(None, description="Danh sách kỹ năng")
    bio: Optional[str] = Field(None, description="Giới thiệu bản thân & chuyên môn")


class ProfileUpdateResponse(BaseModel):
    approval_status: str
    role: str
    message: str
    user: UserResponse

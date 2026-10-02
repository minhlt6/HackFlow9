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

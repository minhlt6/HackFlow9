from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_approved, require_role
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    GitHubOAuthCallbackRequest,
    GitHubOAuthUrlResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.response import ApiResponse, success_response
from app.services.auth_service import auth_service

router = APIRouter()


@router.post(
    "/login",
    response_model=ApiResponse[TokenResponse],
    summary="Đăng nhập tài khoản nội bộ (Admin/Judge/Mentor)",
)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TokenResponse]:
    """
    Xác thực bằng Email và Mật khẩu, trả về Bearer JWT Token và thông tin User.
    """
    user, token = await auth_service.authenticate_local(db, req.email, req.password)
    return success_response(
        data=TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        ),
        message="Đăng nhập thành công.",
    )


@router.post(
    "/register",
    response_model=ApiResponse[TokenResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản nội bộ mới",
)
async def register(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TokenResponse]:
    """
    Đăng ký tài khoản mới. Thí sinh mặc định có approval_status='pending'.
    """
    user, token = await auth_service.register_user(db, req)
    return success_response(
        data=TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        ),
        message="Đăng ký tài khoản thành công.",
        status_code=status.HTTP_201_CREATED,
    )



@router.get(
    "/github",
    response_model=ApiResponse[GitHubOAuthUrlResponse],
    summary="Lấy URL chuyển hướng GitHub OAuth 2.0",
)
async def get_github_oauth_url() -> ApiResponse[GitHubOAuthUrlResponse]:
    """
    Tạo URL chuyển hướng người dùng đến trang ủy quyền GitHub OAuth 2.0.
    """
    url = auth_service.get_github_oauth_url()
    client_id = settings.GITHUB_CLIENT_ID or "mock-github-client-id"
    return success_response(
        data=GitHubOAuthUrlResponse(url=url, client_id=client_id),
        message="Lấy liên kết GitHub OAuth thành công.",
    )


@router.post(
    "/github/callback",
    response_model=ApiResponse[TokenResponse],
    summary="Xử lý Callback từ GitHub OAuth",
)
async def github_oauth_callback(
    req: GitHubOAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[TokenResponse]:
    """
    Đổi authorization code lấy GitHub profile, tự động tạo tài khoản thí sinh
    (approval_status='pending') nếu lần đầu đăng nhập, và cấp JWT Bearer Token.
    """
    user, token = await auth_service.authenticate_github_code(db, req.code)
    return success_response(
        data=TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        ),
        message="Xác thực GitHub OAuth thành công.",
    )


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
    summary="Lấy thông tin tài khoản hiện tại",
)
async def get_profile(
    current_user: User = Depends(get_current_user),
) -> ApiResponse[UserResponse]:
    """
    Lấy thông tin hồ sơ của người dùng đang đăng nhập dựa trên JWT Bearer Token.
    """
    return success_response(
        data=UserResponse.model_validate(current_user),
        message="Lấy thông tin hồ sơ thành công.",
    )


@router.get(
    "/test-admin",
    response_model=ApiResponse[dict],
    summary="Endpoint kiểm tra phân quyền RBAC (Chỉ Admin)",
)
async def test_admin_access(
    admin_user: User = Depends(require_role(["admin"])),
) -> ApiResponse[dict]:
    """
    Endpoint bảo vệ chỉ cho phép vai trò 'admin'. Các vai trò khác trả 403 Forbidden.
    """
    return success_response(
        data={"user_id": admin_user.id, "role": admin_user.role},
        message="Chào mừng Admin.",
    )


@router.get(
    "/test-approved",
    response_model=ApiResponse[dict],
    summary="Endpoint kiểm tra trạng thái phê duyệt (Chỉ Approved)",
)
async def test_approved_access(
    approved_user: User = Depends(require_approved()),
) -> ApiResponse[dict]:
    """
    Endpoint kiểm tra tài khoản đã được BTC phê duyệt (approval_status == 'approved').
    Tài khoản pending/rejected sẽ bị chặn 403 Forbidden.
    """
    return success_response(
        data={
            "user_id": approved_user.id,
            "approval_status": approved_user.approval_status,
        },
        message="Tài khoản đã được phê duyệt hợp lệ.",
    )

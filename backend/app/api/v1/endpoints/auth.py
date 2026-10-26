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
    OnboardingStatusUpdateRequest,
    ProfileUpdateRequest,
    ProfileUpdateResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.response import ApiResponse, success_response
from app.services.auth_service import auth_service

router = APIRouter()
users_router = APIRouter()


def _build_user_response(user: User) -> UserResponse:
    resp = UserResponse.model_validate(user)
    extra = user.profile_meta if isinstance(getattr(user, "profile_meta", None), dict) else {}
    if isinstance(extra, dict):
        resp.student_id = extra.get("student_id")
        resp.school = extra.get("school")
        resp.phone = extra.get("phone")
        resp.skills = extra.get("skills")
        resp.bio = extra.get("bio")
        if "onboarding_completed" in extra:
            resp.onboarding_completed = bool(extra.get("onboarding_completed"))
        if "pledged" in extra:
            resp.pledged = bool(extra.get("pledged"))
    return resp


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
            user=_build_user_response(user),
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
            user=_build_user_response(user),
        ),
        message="Đăng ký tài khoản thành công.",
        status_code=status.HTTP_201_CREATED,
    )



@router.get(
    "/github",
    response_model=ApiResponse[GitHubOAuthUrlResponse],
    summary="Lấy URL chuyển hướng GitHub OAuth 2.0",
)
async def get_github_oauth_url(
    redirect_uri: str | None = None,
) -> ApiResponse[GitHubOAuthUrlResponse]:
    """
    Tạo URL chuyển hướng người dùng đến trang ủy quyền GitHub OAuth 2.0.
    """
    url = auth_service.get_github_oauth_url(redirect_uri=redirect_uri)
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
    user, token = await auth_service.authenticate_github_code(
        db, req.code, redirect_uri=req.redirect_uri
    )
    return success_response(
        data=TokenResponse(
            access_token=token,
            user=_build_user_response(user),
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
        data=_build_user_response(current_user),
        message="Lấy thông tin hồ sơ thành công.",
    )


@users_router.post(
    "/profile",
    response_model=ApiResponse[ProfileUpdateResponse],
    summary="Cập nhật hồ sơ cá nhân thí sinh (Onboarding & Profile)",
)
@users_router.put(
    "/profile",
    response_model=ApiResponse[ProfileUpdateResponse],
    summary="Cập nhật hồ sơ cá nhân thí sinh (PUT)",
)
@users_router.patch(
    "/profile",
    response_model=ApiResponse[ProfileUpdateResponse],
    summary="Cập nhật hồ sơ cá nhân thí sinh (PATCH)",
)
@router.post(
    "/profile",
    response_model=ApiResponse[ProfileUpdateResponse],
    summary="Cập nhật hồ sơ cá nhân (Auth alias POST)",
)
@router.patch(
    "/profile",
    response_model=ApiResponse[ProfileUpdateResponse],
    summary="Cập nhật hồ sơ cá nhân (Auth alias PATCH)",
)
async def update_user_profile(
    req: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[ProfileUpdateResponse]:
    """
    Lưu thông tin hồ sơ cá nhân của thí sinh tại màn hình Onboarding hoặc Hồ sơ cá nhân.
    """
    current_user.full_name = req.full_name.strip()
    existing_extra = (
        dict(current_user.profile_meta)
        if isinstance(getattr(current_user, "profile_meta", None), dict)
        else {}
    )

    extra_payload = {
        **existing_extra,
        "student_id": (
            req.student_id.strip()
            if req.student_id is not None
            else existing_extra.get("student_id", "")
        ),
        "school": (
            req.school.strip()
            if req.school is not None
            else existing_extra.get("school", "")
        ),
        "phone": (
            req.phone.strip()
            if req.phone is not None
            else existing_extra.get("phone", "")
        ),
        "skills": (
            list(req.skills)
            if req.skills is not None
            else list(existing_extra.get("skills") or [])
        ),
        "bio": (
            req.bio.strip()
            if req.bio is not None
            else existing_extra.get("bio", "")
        ),
        "onboarding_completed": (
            bool(req.onboarding_completed)
            if req.onboarding_completed is not None
            else bool(existing_extra.get("onboarding_completed", False))
        ),
        "pledged": (
            bool(req.pledged)
            if req.pledged is not None
            else bool(existing_extra.get("pledged", False))
        ),
    }
    current_user.profile_meta = extra_payload
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    msg = (
        "Hồ sơ đã được duyệt thành công!"
        if current_user.approval_status == "approved"
        else "Lưu thông tin thành công. Hồ sơ đang được Ban Tổ Chức xét duyệt!"
    )
    return success_response(
        data=ProfileUpdateResponse(
            approval_status=current_user.approval_status,
            role=current_user.role,
            message=msg,
            user=_build_user_response(current_user),
        ),
        message=msg,
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


@users_router.post(
    "/onboarding",
    response_model=ApiResponse[UserResponse],
    summary="Cập nhật tiến độ Hướng dẫn nghiệp vụ & Cam kết liêm chính cho mọi vai trò",
)
@router.post(
    "/onboarding",
    response_model=ApiResponse[UserResponse],
    summary="Cập nhật tiến độ Hướng dẫn nghiệp vụ & Cam kết liêm chính (Auth alias)",
)
async def update_onboarding_status(
    req: OnboardingStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[UserResponse]:
    existing_extra = (
        dict(current_user.profile_meta)
        if isinstance(getattr(current_user, "profile_meta", None), dict)
        else {}
    )

    if req.onboarding_completed is not None:
        existing_extra["onboarding_completed"] = bool(req.onboarding_completed)
    if req.pledged is not None:
        existing_extra["pledged"] = bool(req.pledged)

    current_user.profile_meta = existing_extra
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return success_response(
        data=_build_user_response(current_user),
        message="Đã cập nhật trạng thái hướng dẫn nghiệp vụ thành công.",
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

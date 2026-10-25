from typing import Dict, List, Optional, Tuple, Union
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token, hash_password
from app.models.user import ApprovalStatus, User, UserRole
from app.repositories.user_repo import user_repo

security_scheme = HTTPBearer(auto_error=False)

DEV_PERSONA_TOKENS: Dict[str, Tuple[str, str, str, str]] = {
    "mock-jwt-token-admin": ("admin@hackflow.dev", "BTC HackFlow Administrator", "admin", "admin-dev"),
    "mock-jwt-token-judge": ("judge.tech@hackathon.org", "TS. Nguyễn Hoàng Giám Khảo", "judge", "judge-hf"),
    "mock-jwt-token-mentor": ("mentor.ai@ailab.org.vn", "ThS. Phạm Cố Vấn AI", "mentor", "mentor-hf"),
    "mock-jwt-token-leader": ("leader@cybersamurai.team", "Nguyễn Văn Minh", "candidate", "minh-leader"),
    "mock-jwt-token-member": ("member@cybersamurai.team", "Trần Thị Thảo", "candidate", "thao-member"),
    "mock-jwt-token-member2": ("member2@cybersamurai.team", "Nguyễn Minh Thư", "candidate", "minhthu-ai"),
    "mock-jwt-token-candidate_leader": ("leader@cybersamurai.team", "Nguyễn Văn Minh", "candidate", "minh-leader"),
    "mock-jwt-token-candidate_member": ("member@cybersamurai.team", "Trần Thị Thảo", "candidate", "thao-member"),
}


async def _resolve_dev_persona_user(db: AsyncSession, token: str) -> Optional[User]:
    persona = DEV_PERSONA_TOKENS.get(token)
    if not persona:
        return None
    email, full_name, role, gh_user = persona
    user = await user_repo.get_by_email(db, email)
    if not user:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password("123456"),
            role=role,
            approval_status=ApprovalStatus.APPROVED.value,
            github_username=gh_user,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency extracting and validating the JWT Bearer token,
    returning the authenticated User from the database.
    """
    if not credentials or not credentials.credentials:
        raise UnauthorizedException(message="Yêu cầu xác thực: Thiếu Bearer Token.")

    token = credentials.credentials
    if token in DEV_PERSONA_TOKENS:
        persona_user = await _resolve_dev_persona_user(db, token)
        if persona_user:
            return persona_user

    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedException(message="Token xác thực không hợp lệ hoặc đã hết hạn.")

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise UnauthorizedException(message="Token không chứa định danh người dùng hợp lệ.")

    user = await user_repo.get_by_id(db, str(user_id))
    if not user:
        raise UnauthorizedException(message="Người dùng liên kết với token này không tồn tại.")

    if not user.is_active:
        raise UnauthorizedException(message="Tài khoản này đã bị khóa hoặc vô hiệu hóa.")

    return user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Optional JWT authentication dependency: returns User if a valid Bearer token
    is provided, or None if unauthenticated.
    """
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    if token in DEV_PERSONA_TOKENS:
        return await _resolve_dev_persona_user(db, token)
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        return None
    user = await user_repo.get_by_id(db, str(user_id))
    if not user or not user.is_active:
        return None
    return user


def require_role(allowed_roles: Union[List[str], str]):
    """
    Role-Based Access Control (RBAC) dependency factory.
    Verifies that the current user has one of the required roles.
    Returns HTTP 403 FORBIDDEN if the role is insufficient.
    """
    roles = [allowed_roles] if isinstance(allowed_roles, str) else allowed_roles

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenException(
                message=f"Truy cập trái phép. Chức năng yêu cầu vai trò: {', '.join(roles)}.",
                error_code="FORBIDDEN_ROLE",
            )
        return user

    return role_checker


def require_roles(*allowed_roles: Union[List[Union[str, UserRole]], str, UserRole]):
    """
    Role-Based Access Control (RBAC) dependency factory supporting multiple positional roles or lists.
    Verifies that the current user has one of the required roles.
    Returns HTTP 403 FORBIDDEN if the role is insufficient.
    """
    flat_roles: List[str] = []
    for r in allowed_roles:
        if isinstance(r, (list, tuple, set)):
            for item in r:
                flat_roles.append(item.value if hasattr(item, "value") else str(item))
        else:
            flat_roles.append(r.value if hasattr(r, "value") else str(r))

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        user_role = user.role.value if hasattr(user.role, "value") else str(user.role)
        if user_role not in flat_roles:
            raise ForbiddenException(
                message=f"Truy cập trái phép. Chức năng yêu cầu vai trò: {', '.join(flat_roles)}.",
                error_code="FORBIDDEN_ROLE",
            )
        return user

    return role_checker


async def require_approved_candidate(
    user: User = Depends(get_current_user),
) -> User:
    """
    Dependency ensuring that the user has CANDIDATE role and is APPROVED.
    """
    user_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if user_role != UserRole.CANDIDATE.value:
        raise ForbiddenException(
            message="Chức năng chỉ dành cho thí sinh (Candidate).",
            error_code="FORBIDDEN_ROLE",
        )
    user_status = (
        user.approval_status.value
        if hasattr(user.approval_status, "value")
        else str(user.approval_status)
    )
    if user_status != ApprovalStatus.APPROVED.value:
        status_vn = (
            "Đang chờ phê duyệt (PENDING)"
            if user_status == ApprovalStatus.PENDING.value
            else "Bị từ chối (REJECTED)"
        )
        raise ForbiddenException(
            message=f"Tài khoản chưa được kích hoạt tham gia thi đấu. Trạng thái: {status_vn}.",
            error_code="ACCOUNT_NOT_APPROVED",
        )
    return user


def require_approved():
    """
    Approval status check dependency.
    Ensures that participants have approval_status == 'approved' before
    accessing protected hackathon features (e.g. Teams, Submissions).
    """
    async def approval_checker(user: User = Depends(get_current_user)) -> User:
        if user.approval_status != ApprovalStatus.APPROVED.value:
            status_vn = (
                "Đang chờ phê duyệt (PENDING)"
                if user.approval_status == ApprovalStatus.PENDING.value
                else "Bị từ chối (REJECTED)"
            )
            raise ForbiddenException(
                message=f"Tài khoản chưa được kích hoạt tham gia thi đấu. Trạng thái: {status_vn}.",
                error_code="ACCOUNT_NOT_APPROVED",
            )
        return user

    return approval_checker


async def require_checkpoint_open_by_id(
    checkpoint_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Time-gated Checkpoint validator dependency (HF-32).
    Verifies that the requested checkpoint exists and is within the allowed
    submission window (accounting for 5s network latency grace period).
    Returns tuple: (checkpoint, grace_period_applied).
    Raises HTTP 403 Forbidden with exact error_code if outside allowed window:
      - CHECKPOINT_INACTIVE
      - CHECKPOINT_NOT_OPEN
      - DEADLINE_EXCEEDED
    """
    from app.core.exceptions import NotFoundException
    from app.repositories.checkpoint_repo import checkpoint_repo
    from app.services.checkpoint_service import checkpoint_service

    cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
    if not cp:
        raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

    _, grace_applied, _ = checkpoint_service.validate_checkpoint_submission_window(cp)
    return cp, grace_applied

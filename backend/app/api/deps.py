from typing import List, Optional
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.models.user import ApprovalStatus, User
from app.repositories.user_repo import user_repo

security_scheme = HTTPBearer(auto_error=False)


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


from typing import List, Optional, Union


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

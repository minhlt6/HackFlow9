from typing import Any, Dict, Optional, Tuple
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import ApprovalStatus, User, UserRole
from app.repositories.user_repo import user_repo
from app.repositories.whitelist_repo import whitelist_repo
from app.schemas.auth import RegisterRequest



class AuthService:
    """
    Business logic service for user authentication, password verification,
    and GitHub OAuth integration.
    """

    @staticmethod
    def create_user_token(user: User) -> str:
        """
        Create a signed JWT access token containing subject and user claims.
        """
        claims: Dict[str, Any] = {
            "user_id": user.id,
            "email": user.email,
            "role": user.role,
            "approval_status": user.approval_status,
        }
        return create_access_token(subject=user.id, claims=claims)

    @classmethod
    async def authenticate_local(
        cls, db: AsyncSession, email: str, password: str
    ) -> Tuple[User, str]:
        """
        Authenticate local accounts (Admin, Judge, Mentor, or local Candidate)
        using email and password.
        """
        user = await user_repo.get_by_email(db, email)
        if not user or not user.hashed_password:
            raise UnauthorizedException(message="Email hoặc mật khẩu không chính xác.")

        if not verify_password(password, user.hashed_password):
            raise UnauthorizedException(message="Email hoặc mật khẩu không chính xác.")

        if not user.is_active:
            raise UnauthorizedException(message="Tài khoản của bạn đã bị vô hiệu hóa.")

        token = cls.create_user_token(user)
        return user, token

    @classmethod
    async def register_user(
        cls, db: AsyncSession, req: RegisterRequest
    ) -> Tuple[User, str]:
        """
        Register a new local account.
        Candidates default to 'pending' approval_status.
        """
        existing = await user_repo.get_by_email(db, req.email)
        if existing:
            raise ConflictException(message="Email này đã được đăng ký trên hệ thống.")

        role_str = (req.role or "candidate").lower()
        valid_roles = {r.value for r in UserRole}
        if role_str not in valid_roles:
            raise BadRequestException(message=f"Vai trò '{role_str}' không hợp lệ.")

        # Candidates default to pending approval; administrative roles default to approved
        approval = (
            ApprovalStatus.PENDING.value
            if role_str == UserRole.CANDIDATE.value
            else ApprovalStatus.APPROVED.value
        )

        user = User(
            email=req.email.lower().strip(),
            full_name=req.full_name.strip(),
            hashed_password=hash_password(req.password),
            role=role_str,
            approval_status=approval,
            is_active=True,
        )

        created_user = await user_repo.create(db, user)
        token = cls.create_user_token(created_user)
        return created_user, token

    @staticmethod
    def get_github_oauth_url() -> str:
        """
        Generate GitHub OAuth authorization redirect URL.
        """
        client_id = settings.GITHUB_CLIENT_ID or "mock-github-client-id"
        redirect_uri = settings.GITHUB_REDIRECT_URI
        return (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope=user:email"
        )

    @classmethod
    async def authenticate_github_code(
        cls, db: AsyncSession, code: str
    ) -> Tuple[User, str]:
        """
        Exchange GitHub OAuth authorization code for GitHub access token,
        fetch GitHub profile and emails, and upsert local user.
        Supports development mock tokens for testing when secrets are not configured.
        """
        github_id: Optional[str] = None
        email: Optional[str] = None
        full_name: Optional[str] = None
        avatar_url: Optional[str] = None
        github_username: Optional[str] = None

        if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
            # 1. Exchange code for access token with GitHub
            async with httpx.AsyncClient(timeout=10.0) as client:
                token_res = await client.post(
                    "https://github.com/login/oauth/access_token",
                    headers={"Accept": "application/json"},
                    data={
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "code": code,
                        "redirect_uri": settings.GITHUB_REDIRECT_URI,
                    },
                )
                if token_res.status_code != 200:
                    raise BadRequestException(message="Lỗi khi xác thực mã code với GitHub.")

                token_data = token_res.json()
                gh_token = token_data.get("access_token")
                if not gh_token:
                    error_desc = token_data.get("error_description", "Không lấy được access token từ GitHub.")
                    raise BadRequestException(message=f"GitHub OAuth thất bại: {error_desc}")

                # 2. Fetch user profile from GitHub
                user_res = await client.get(
                    "https://api.github.com/user",
                    headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/json"},
                )
                if user_res.status_code != 200:
                    raise BadRequestException(message="Không thể lấy thông tin người dùng từ GitHub.")

                profile = user_res.json()
                github_id = str(profile.get("id"))
                github_username = profile.get("login")
                full_name = profile.get("name") or github_username
                avatar_url = profile.get("avatar_url")
                email = profile.get("email")

                # If email is private, fetch primary email from emails endpoint
                if not email:
                    emails_res = await client.get(
                        "https://api.github.com/user/emails",
                        headers={"Authorization": f"Bearer {gh_token}", "Accept": "application/json"},
                    )
                    if emails_res.status_code == 200:
                        emails_data = emails_res.json()
                        primary_email = next((e["email"] for e in emails_data if e.get("primary")), None)
                        email = primary_email or (emails_data[0]["email"] if emails_data else None)
        else:
            # Development fallback / mock when credentials are placeholders
            github_id = f"dev-gh-{code}"
            github_username = f"github_user_{code}"
            email = f"dev_{code}@example.com"
            full_name = f"GitHub User {code}"
            avatar_url = "https://github.com/identicons/default.png"

        if not email:
            raise BadRequestException(message="Tài khoản GitHub không cung cấp email hợp lệ.")

        # 3. Check whitelist: whitelisted emails get APPROVED immediately,
        #    unknown emails get PENDING and wait for BTC manual review.
        whitelist_entry = await whitelist_repo.get_by_email(db, email)
        initial_approval = (
            ApprovalStatus.APPROVED.value
            if whitelist_entry
            else ApprovalStatus.PENDING.value
        )

        # 4. Check existing user by github_id or email
        user = await user_repo.get_by_github_id(db, github_id)
        if not user:
            user = await user_repo.get_by_email(db, email)

        if user:
            # Update github linkage and avatar
            if not user.github_id:
                user.github_id = github_id
            user.github_username = github_username
            if avatar_url:
                user.avatar_url = avatar_url
            # If user was PENDING and now email is in whitelist → promote to APPROVED
            if (
                user.approval_status == ApprovalStatus.PENDING.value
                and whitelist_entry
            ):
                user.approval_status = ApprovalStatus.APPROVED.value
            db.add(user)
            await db.flush()
        else:
            # Create new user with approval status based on whitelist
            user = User(
                email=email.lower().strip(),
                full_name=full_name or "Thí sinh Hackathon",
                github_id=github_id,
                github_username=github_username,
                avatar_url=avatar_url,
                role=UserRole.CANDIDATE.value,
                approval_status=initial_approval,
                is_active=True,
            )
            user = await user_repo.create(db, user)

        token = cls.create_user_token(user)
        return user, token


auth_service = AuthService()


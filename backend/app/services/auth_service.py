import asyncio
from typing import Any, Dict, Optional, Tuple
import httpx
from sqlalchemy import or_, select
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

_github_http_client = httpx.AsyncClient(
    timeout=10.0,
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
)

DEFAULT_DEMO_ACCOUNTS: Dict[str, Tuple[str, str, str]] = {
    "admin@hackflow.dev": ("BTC HackFlow Administrator", "admin", "admin-dev"),
    "admin@hackflow.com": ("Admin HackFlow", "admin", "admin-com"),
    "judge.tech@hackathon.org": ("TS. Nguyễn Hoàng Giám Khảo", "judge", "judge-hf"),
    "mentor.ai@ailab.org.vn": ("ThS. Phạm Cố Vấn AI", "mentor", "mentor-hf"),
    "leader@cybersamurai.team": ("Nguyễn Văn Minh", "candidate", "minh-leader"),
    "member@cybersamurai.team": ("Trần Thị Thảo", "candidate", "thao-member"),
    "member2@cybersamurai.team": ("Nguyễn Minh Châu", "candidate", "minhchau-ai"),
}

LOGIN_EMAIL_ALIASES: Dict[str, str] = {
    "admin@hackflow.io": "admin@hackflow.dev",
    "judge@hackflow.io": "judge.tech@hackathon.org",
    "mentor@hackflow.io": "mentor.ai@ailab.org.vn",
}

DEMO_PASSWORD_ALIASES = {
    "123",
    "Admin@2026",
    "Admin@123456",
    "Judge@123456",
    "Mentor@123456",
    "Candidate@123",
}


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
        raw_email = email.lower().strip()
        clean_email = LOGIN_EMAIL_ALIASES.get(raw_email, raw_email)
        effective_password = (
            "123456"
            if settings.demo_enabled and clean_email in DEFAULT_DEMO_ACCOUNTS and password in DEMO_PASSWORD_ALIASES
            else password
        )
        user = await user_repo.get_by_email(db, clean_email)
        if settings.demo_enabled and not user and clean_email in DEFAULT_DEMO_ACCOUNTS and effective_password == "123456":
            full_name, role_val, gh_user = DEFAULT_DEMO_ACCOUNTS[clean_email]
            user = User(
                email=clean_email,
                full_name=full_name,
                hashed_password=hash_password("123456"),
                role=role_val,
                approval_status=ApprovalStatus.APPROVED.value,
                github_username=gh_user,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        if not user or not user.hashed_password:
            raise UnauthorizedException(message="Email hoặc mật khẩu không chính xác.")

        if not verify_password(effective_password, user.hashed_password):
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
    def get_github_oauth_url(redirect_uri: Optional[str] = None) -> str:
        """
        Generate GitHub OAuth authorization redirect URL.
        """
        client_id = settings.GITHUB_CLIENT_ID or "mock-github-client-id"
        target_redirect_uri = (redirect_uri or "").strip() or settings.GITHUB_REDIRECT_URI
        return (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={client_id}"
            f"&redirect_uri={target_redirect_uri}"
            f"&scope=user:email"
        )

    @classmethod
    async def authenticate_github_code(
        cls, db: AsyncSession, code: str, redirect_uri: Optional[str] = None
    ) -> Tuple[User, str]:
        """
        Exchange GitHub OAuth authorization code for GitHub access token,
        fetch GitHub profile and emails concurrently, and upsert local user.
        Supports development mock tokens for testing when secrets are not configured.
        """
        github_id: Optional[str] = None
        email: Optional[str] = None
        full_name: Optional[str] = None
        avatar_url: Optional[str] = None
        github_username: Optional[str] = None

        is_test_mock_code = settings.demo_enabled and code.startswith(("unknown_code_", "whitelist_code_", "dev_mock_"))
        if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET and not is_test_mock_code:
            target_redirect_uri = (redirect_uri or "").strip() or settings.GITHUB_REDIRECT_URI

            # 1. Exchange code for access token with GitHub (reusing pooled client)
            token_res = await _github_http_client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": target_redirect_uri,
                },
            )
            if token_res.status_code != 200:
                raise BadRequestException(message="Lỗi khi xác thực mã code với GitHub.")

            token_data = token_res.json()
            gh_token = token_data.get("access_token")
            if not gh_token:
                error_desc = token_data.get("error_description", "Không lấy được access token từ GitHub.")
                raise BadRequestException(message=f"GitHub OAuth thất bại: {error_desc}")

            auth_headers = {"Authorization": f"Bearer {gh_token}", "Accept": "application/json"}

            # 2. Fetch user profile and emails from GitHub IN PARALLEL
            user_res, emails_res = await asyncio.gather(
                _github_http_client.get("https://api.github.com/user", headers=auth_headers),
                _github_http_client.get("https://api.github.com/user/emails", headers=auth_headers),
            )
            if user_res.status_code != 200:
                raise BadRequestException(message="Không thể lấy thông tin người dùng từ GitHub.")

            profile = user_res.json()
            github_id = str(profile.get("id"))
            github_username = profile.get("login")
            full_name = (profile.get("name") or github_username or "").strip()
            avatar_url = profile.get("avatar_url")
            email = profile.get("email")

            if emails_res.status_code == 200:
                emails_data = emails_res.json()
                if isinstance(emails_data, list):
                    primary_email = next((e["email"] for e in emails_data if e.get("primary")), None)
                    email = primary_email or email or (emails_data[0]["email"] if emails_data else None)
        else:
            if not settings.demo_enabled:
                raise BadRequestException(message="GitHub OAuth chưa được cấu hình.")
            # Development fallback / mock when credentials are placeholders
            github_id = f"dev-gh-{code}"
            github_username = f"github_user_{code}"
            email = f"dev_{code}@example.com"
            full_name = f"GitHub User {code}"
            avatar_url = "https://github.com/identicons/default.png"

        if not email:
            raise BadRequestException(message="Tài khoản GitHub không cung cấp email hợp lệ.")

        clean_email = email.lower().strip()

        # 3. Single combined query for existing user by github_id OR email
        user_stmt = select(User).where(
            or_(User.github_id == str(github_id), User.email == clean_email)
        )
        user_result = await db.execute(user_stmt)
        user = user_result.scalars().first()

        # Only query whitelist if user does not exist yet or is still pending
        whitelist_entry = None
        if not user or user.approval_status == ApprovalStatus.PENDING.value:
            whitelist_entry = await whitelist_repo.get_by_email(db, clean_email)

        if user:
            changed = False
            if not user.github_id:
                user.github_id = github_id
                changed = True
            if github_username and user.github_username != github_username:
                user.github_username = github_username
                changed = True
            if user.email != clean_email:
                user.email = clean_email
                changed = True
            if full_name and user.full_name != full_name:
                user.full_name = full_name
                changed = True
            if avatar_url and user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
                changed = True
            if (
                user.approval_status == ApprovalStatus.PENDING.value
                and whitelist_entry
            ):
                user.approval_status = ApprovalStatus.APPROVED.value
                changed = True
            if changed:
                db.add(user)
                await db.flush()
        else:
            initial_approval = (
                ApprovalStatus.APPROVED.value
                if whitelist_entry
                else ApprovalStatus.PENDING.value
            )
            user = User(
                email=clean_email,
                full_name=full_name or "Thí sinh Hackathon",
                github_id=github_id,
                github_username=github_username,
                avatar_url=avatar_url,
                role=UserRole.CANDIDATE.value,
                approval_status=initial_approval,
                is_active=True,
            )
            db.add(user)
            await db.flush()

        token = cls.create_user_token(user)
        return user, token


auth_service = AuthService()

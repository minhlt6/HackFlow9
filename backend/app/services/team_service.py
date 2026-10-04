import asyncio
import secrets
from typing import Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AppException,
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.models.team import Team
from app.models.user import User
from app.repositories.team_repo import team_repo
from app.schemas.team import TeamMemberResponse, TeamResponse

INVITE_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class TeamService:
    """
    Business service layer managing team creation, joining, and membership.
    """
    _team_locks: Dict[str, asyncio.Lock] = {}

    def _get_team_lock(self, team_id: str) -> asyncio.Lock:
        if team_id not in self._team_locks:
            self._team_locks[team_id] = asyncio.Lock()
        return self._team_locks[team_id]

    @staticmethod
    async def generate_invite_code(db: AsyncSession) -> str:
        """
        Generate a unique 6-character alphanumeric invite code.
        """
        for _ in range(10):
            code = "".join(secrets.choice(INVITE_CODE_CHARSET) for _ in range(6))
            existing = await team_repo.get_by_invite_code(db, code)
            if not existing:
                return code
        raise AppException(
            message="Không thể tạo mã mời duy nhất, vui lòng thử lại.",
            status_code=500,
            error_code="TRANSACTION_FAILED",
        )

    @staticmethod
    def build_team_response(team: Team) -> TeamResponse:
        """
        Construct a typed TeamResponse with calculated status and member count.
        """
        members_resp = []
        for m in team.members or []:
            user = m.user
            members_resp.append(
                TeamMemberResponse(
                    id=str(m.id),
                    user_id=str(m.user_id),
                    full_name=user.full_name if user else "Unknown",
                    email=user.email if user else "",
                    role=m.role,
                    avatar_url=user.avatar_url if user else None,
                    github_username=user.github_username if user else None,
                    joined_at=m.joined_at,
                )
            )

        member_count = len(members_resp)
        if team.is_locked:
            status = "LOCKED"
        elif member_count >= 3:
            status = "VALID"
        else:
            status = "INCOMPLETE"

        return TeamResponse(
            id=str(team.id),
            team_name=team.team_name,
            invite_code=team.invite_code,
            status=status,
            is_locked=team.is_locked,
            member_count=member_count,
            min_members=3,
            max_members=5,
            topic_id=str(team.topic_id) if team.topic_id else None,
            subtopic_id=str(team.subtopic_id) if team.subtopic_id else None,
            members=members_resp,
            created_at=team.created_at,
        )

    async def create_team(
        self,
        db: AsyncSession,
        current_user: User,
        team_name: str,
    ) -> TeamResponse:
        """
        Create a new hackathon team with the creator as leader.
        Enforces:
        - User cannot already belong to another team
        - Team name 3-50 chars, trimmed, unique
        - Unique 6-character invite code
        """
        cleaned_name = team_name.strip()
        if len(cleaned_name) < 3 or len(cleaned_name) > 50:
            raise AppException(
                message="Tên đội phải từ 3 đến 50 ký tự.",
                status_code=422,
                error_code="TEAM_NAME_INVALID",
            )

        # 1. Check if user is already in a team
        existing_membership = await team_repo.get_user_membership(db, str(current_user.id))
        if existing_membership:
            raise ConflictException(
                message="Bạn đã tham gia một đội thi khác.",
                error_code="ALREADY_IN_TEAM",
            )

        # 2. Check team name uniqueness (case-insensitive)
        existing_team = await team_repo.get_by_name(db, cleaned_name)
        if existing_team:
            raise ConflictException(
                message=f"Tên đội '{cleaned_name}' đã tồn tại trong cuộc thi.",
                error_code="TEAM_NAME_TAKEN",
            )

        # 3. Generate unique invite code
        invite_code = await self.generate_invite_code(db)

        # 4. Create team and leader inside transaction
        team = await team_repo.create_team_with_leader(
            db,
            team_name=cleaned_name,
            invite_code=invite_code,
            leader_id=str(current_user.id),
        )
        team_id = str(team.id)
        await db.commit()
        db.expire_all()

        # Re-fetch fully loaded team
        loaded = await team_repo.get_by_id(db, team_id)
        return self.build_team_response(loaded)  # type: ignore

    async def join_team(
        self,
        db: AsyncSession,
        current_user: User,
        invite_code: str,
    ) -> TeamResponse:
        """
        Join an existing team using a 6-character invite code.
        Enforces:
        - User cannot already belong to another team
        - Valid, existing invite code
        - Team not locked
        - Maximum 5 members limit
        - Concurrency safety with row-level locking
        """
        cleaned_code = invite_code.strip().upper()
        if not cleaned_code or len(cleaned_code) < 6:
            raise BadRequestException(
                message="Mã mời không tồn tại hoặc không hợp lệ.",
                error_code="INVITE_CODE_INVALID",
            )

        # 1. Check if user is already in a team
        existing_membership = await team_repo.get_user_membership(db, str(current_user.id))
        if existing_membership:
            raise ConflictException(
                message="Bạn đã tham gia một đội thi khác.",
                error_code="ALREADY_IN_TEAM",
            )

        # 2. Find and lock the team
        lock = self._get_team_lock(cleaned_code)
        async with lock:
            team = await team_repo.get_by_invite_code(db, cleaned_code, for_update=True)
            if not team:
                raise BadRequestException(
                    message="Mã mời không tồn tại hoặc không hợp lệ.",
                    error_code="INVITE_CODE_INVALID",
                )

            if team.is_locked:
                raise ConflictException(
                    message="Đội thi này đã bị khóa, không thể tham gia.",
                    error_code="TEAM_LOCKED",
                )

            # 3. Check current member count
            member_count = await team_repo.count_members(db, team.id)
            if member_count >= 5:
                raise ConflictException(
                    message="Đội thi đã đủ số lượng thành viên tối đa (5 người).",
                    error_code="TEAM_FULL",
                )

            # 4. Add member
            team_id = str(team.id)
            await team_repo.add_member(db, team_id, str(current_user.id))
            await db.commit()

            # Re-fetch fully loaded team with updated relationships
            db.expire_all()
            loaded = await team_repo.get_by_id(db, team_id)
            return self.build_team_response(loaded)  # type: ignore

    async def get_my_team(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> Optional[TeamResponse]:
        """
        Retrieve the current user's team information.
        """
        team = await team_repo.get_user_team(db, str(current_user.id))
        if not team:
            return None
        return self.build_team_response(team)

    async def get_team_by_id(
        self,
        db: AsyncSession,
        team_id: str,
    ) -> TeamResponse:
        """
        Retrieve a team by its ID.
        """
        team = await team_repo.get_by_id(db, team_id)
        if not team:
            raise NotFoundException(
                message="Không tìm thấy đội thi.",
                error_code="TEAM_NOT_FOUND",
            )
        return self.build_team_response(team)


team_service = TeamService()

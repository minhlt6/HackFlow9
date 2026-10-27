import asyncio
import secrets
from typing import Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    AppException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.models.team import Team, TeamMember, TeamMemberRole
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
    def build_team_response(team: Team, min_members: int = 3, max_members: int = 5) -> TeamResponse:
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
        meta = team.admin_meta if isinstance(getattr(team, "admin_meta", None), dict) else {}
        approval_status = str(meta.get("approval_status", "")).lower() or None
        rejection_reason = meta.get("rejection_reason")
        if approval_status == "rejected":
            status = "REJECTED"
        elif team.is_locked:
            status = "LOCKED"
        elif min_members <= member_count <= max_members:
            status = "VALID"
        else:
            status = "INCOMPLETE"

        leader_id = next(
            (m.user_id for m in members_resp if m.role == "leader"),
            members_resp[0].user_id if members_resp else None,
        )
        topic_obj = team.__dict__.get("topic")
        subtopic_obj = team.__dict__.get("subtopic")
        topic_name = (
            subtopic_obj.title
            if subtopic_obj
            else (topic_obj.title if topic_obj else None)
        )

        return TeamResponse(
            id=str(team.id),
            team_name=team.team_name,
            description=team.description,
            invite_code=team.invite_code,
            status=status,
            approval_status=approval_status or ("approved" if min_members <= member_count <= max_members else "pending"),
            rejection_reason=rejection_reason,
            is_locked=team.is_locked,
            member_count=member_count,
            min_members=min_members,
            max_members=max_members,
            leader_id=leader_id,
            topic_id=str(team.topic_id) if team.topic_id else None,
            topic_name=topic_name,
            subtopic_id=str(team.subtopic_id) if team.subtopic_id else None,
            members=members_resp,
            created_at=team.created_at,
        )

    async def list_all_teams(self, db: AsyncSession) -> List[TeamResponse]:
        stmt = (
            select(Team)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.topic),
                selectinload(Team.subtopic),
            )
            .order_by(Team.created_at.desc())
        )
        res = await db.execute(stmt)
        teams = list(res.scalars().all())
        return [self.build_team_response(t) for t in teams]

    async def create_team(
        self,
        db: AsyncSession,
        current_user: User,
        team_name: str,
        description: Optional[str] = None,
    ) -> TeamResponse:
        cleaned_name = team_name.strip()
        if len(cleaned_name) < 3 or len(cleaned_name) > 50:
            raise AppException(
                message="Tên đội phải từ 3 đến 50 ký tự.",
                status_code=422,
                error_code="TEAM_NAME_INVALID",
            )

        existing_membership = await team_repo.get_user_membership(db, str(current_user.id))
        if existing_membership:
            raise ConflictException(
                message="Bạn đã tham gia một đội thi khác.",
                error_code="ALREADY_IN_TEAM",
            )

        existing_team = await team_repo.get_by_name(db, cleaned_name)
        if existing_team:
            raise ConflictException(
                message=f"Tên đội '{cleaned_name}' đã tồn tại trong cuộc thi.",
                error_code="TEAM_NAME_TAKEN",
            )

        invite_code = await self.generate_invite_code(db)

        team = await team_repo.create_team_with_leader(
            db,
            team_name=cleaned_name,
            invite_code=invite_code,
            leader_id=str(current_user.id),
        )
        team.description = description
        team_id = str(team.id)
        await db.commit()
        db.expire_all()

        loaded = await team_repo.get_by_id(db, team_id)
        return self.build_team_response(loaded)  # type: ignore

    async def update_description(self, db: AsyncSession, user: User, description: str) -> TeamResponse:
        membership = await team_repo.get_user_membership(db, str(user.id))
        if not membership or membership.role != TeamMemberRole.LEADER.value:
            raise ForbiddenException(message="Chỉ đội trưởng được chỉnh sửa đội thi.")
        team = await team_repo.get_by_id(db, str(membership.team_id))
        if team.is_locked:
            raise ForbiddenException(message="Đội thi đã bị khóa.")
        team.description = description.strip()
        await db.commit()
        return self.build_team_response(team)

    async def join_team(
        self,
        db: AsyncSession,
        current_user: User,
        invite_code: str,
    ) -> TeamResponse:
        cleaned_code = invite_code.strip().upper()
        if not cleaned_code or len(cleaned_code) < 6:
            raise BadRequestException(
                message="Mã mời không tồn tại hoặc không hợp lệ.",
                error_code="INVITE_CODE_INVALID",
            )

        existing_membership = await team_repo.get_user_membership(db, str(current_user.id))
        if existing_membership:
            raise ConflictException(
                message="Bạn đã tham gia một đội thi khác.",
                error_code="ALREADY_IN_TEAM",
            )

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

            from app.repositories.topic_repo import topic_repo
            cfg = await topic_repo.get_config(db)
            max_team_size = int((cfg.settings_data or {}).get("maxTeamSize", 5)) if (cfg and getattr(cfg, "settings_data", None)) else 5
            min_team_size = int((cfg.settings_data or {}).get("minTeamSize", 3)) if (cfg and getattr(cfg, "settings_data", None)) else 3
            member_count = await team_repo.count_members(db, team.id)
            if member_count >= max_team_size:
                raise ConflictException(
                    message=f"Đội thi đã đủ số lượng thành viên tối đa ({max_team_size} người).",
                    error_code="TEAM_FULL",
                )

            team_id = str(team.id)
            await team_repo.add_member(db, team_id, str(current_user.id))
            await db.commit()

            db.expire_all()
            loaded = await team_repo.get_by_id(db, team_id)
            return self.build_team_response(loaded)  # type: ignore

    async def leave_team(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> dict:
        membership = await team_repo.get_user_membership(db, str(current_user.id))
        if not membership:
            raise BadRequestException(message="Bạn chưa tham gia đội thi nào.")
        team_id = str(membership.team_id)
        team = await team_repo.get_by_id(db, team_id)
        await db.delete(membership)
        await db.flush()

        remaining = await team_repo.count_members(db, team_id)
        if remaining == 0 and team:
            await db.delete(team)
        await db.commit()
        return {"team_id": team_id, "left": True}

    async def remove_member(
        self,
        db: AsyncSession,
        current_user: User,
        member_user_id: str,
    ) -> TeamResponse:
        leader_mem = await team_repo.get_user_membership(db, str(current_user.id))
        if not leader_mem or leader_mem.role != TeamMemberRole.LEADER.value:
            raise ForbiddenException(message="Chỉ đội trưởng mới có quyền xóa thành viên.")
        target_mem = await team_repo.get_user_membership(db, member_user_id)
        if not target_mem or str(target_mem.team_id) != str(leader_mem.team_id):
            raise NotFoundException(message="Không tìm thấy thành viên trong đội.")
        if str(target_mem.user_id) == str(current_user.id):
            raise BadRequestException(message="Không thể tự xóa chính mình.")
        team_id_str = str(leader_mem.team_id)
        await db.delete(target_mem)
        await db.commit()
        db.expire_all()
        loaded = await team_repo.get_by_id(db, team_id_str)
        return self.build_team_response(loaded)  # type: ignore

    async def transfer_leader(
        self,
        db: AsyncSession,
        current_user: User,
        new_leader_user_id: str,
    ) -> TeamResponse:
        leader_mem = await team_repo.get_user_membership(db, str(current_user.id))
        if not leader_mem or leader_mem.role != TeamMemberRole.LEADER.value:
            raise ForbiddenException(message="Chỉ đội trưởng mới có quyền nhượng quyền.")
        target_mem = await team_repo.get_user_membership(db, new_leader_user_id)
        if not target_mem or str(target_mem.team_id) != str(leader_mem.team_id):
            raise NotFoundException(message="Thành viên được chọn không thuộc đội của bạn.")
        team_id_str = str(leader_mem.team_id)
        leader_mem.role = TeamMemberRole.MEMBER.value
        target_mem.role = TeamMemberRole.LEADER.value
        await db.commit()
        db.expire_all()
        loaded = await team_repo.get_by_id(db, team_id_str)
        return self.build_team_response(loaded)  # type: ignore

    async def get_my_team(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> Optional[TeamResponse]:
        team = await team_repo.get_user_team(db, str(current_user.id))
        if not team:
            return None
        return self.build_team_response(team)

    async def get_team_by_id(
        self,
        db: AsyncSession,
        team_id: str,
    ) -> TeamResponse:
        team = await team_repo.get_by_id(db, team_id)
        if not team:
            raise NotFoundException(
                message="Không tìm thấy đội thi.",
                error_code="TEAM_NOT_FOUND",
            )
        return self.build_team_response(team)


team_service = TeamService()

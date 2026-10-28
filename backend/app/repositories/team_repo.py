from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.team import Team, TeamMember, TeamMemberRole


class TeamRepository:
    """
    Data access layer for Team and TeamMember models.
    """

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        team_id: str,
        for_update: bool = False,
    ) -> Optional[Team]:
        stmt = (
            select(Team)
            .where(Team.id == team_id)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.topic),
                selectinload(Team.subtopic),
            )
        )
        if for_update:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_name(db: AsyncSession, team_name: str) -> Optional[Team]:
        stmt = (
            select(Team)
            .where(func.lower(Team.team_name) == team_name.lower().strip())
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_invite_code(
        db: AsyncSession,
        invite_code: str,
        for_update: bool = False,
    ) -> Optional[Team]:
        stmt = (
            select(Team)
            .where(Team.invite_code == invite_code.upper().strip())
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.topic),
                selectinload(Team.subtopic),
            )
        )
        if for_update:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_team(db: AsyncSession, user_id: str) -> Optional[Team]:
        """
        Find the team that the given user currently belongs to.
        """
        stmt = (
            select(Team)
            .join(TeamMember, TeamMember.team_id == Team.id)
            .where(TeamMember.user_id == user_id)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.topic),
                selectinload(Team.subtopic),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_membership(
        db: AsyncSession,
        user_id: str,
    ) -> Optional[TeamMember]:
        stmt = select(TeamMember).where(TeamMember.user_id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def count_members(db: AsyncSession, team_id: str) -> int:
        stmt = (
            select(func.count(TeamMember.id))
            .where(TeamMember.team_id == team_id)
        )
        result = await db.execute(stmt)
        return result.scalar() or 0

    @staticmethod
    async def create_team_with_leader(
        db: AsyncSession,
        team_name: str,
        invite_code: str,
        leader_id: str,
    ) -> Team:
        team = Team(
            team_name=team_name.strip(),
            invite_code=invite_code.strip().upper(),
            is_locked=False,
        )
        db.add(team)
        await db.flush()

        leader_member = TeamMember(
            team_id=team.id,
            user_id=leader_id,
            role=TeamMemberRole.LEADER.value,
        )
        db.add(leader_member)
        await db.flush()

        # Re-fetch with relationships loaded
        return await TeamRepository.get_by_id(db, team.id)  # type: ignore

    @staticmethod
    async def add_member(
        db: AsyncSession,
        team_id: str,
        user_id: str,
        role: str = TeamMemberRole.MEMBER.value,
    ) -> TeamMember:
        member = TeamMember(
            team_id=team_id,
            user_id=user_id,
            role=role,
        )
        db.add(member)
        await db.flush()
        return member


team_repo = TeamRepository()

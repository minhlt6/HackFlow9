"""Shared competition limits and membership policy, backed by SQL config."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException
from app.models.team import Team
from app.repositories.topic_repo import topic_repo


def config_team_limits(settings_data: dict | None) -> tuple[int, int]:
    data = settings_data or {}
    minimum = int(data.get("minTeamMembers", data.get("minTeamSize", 3)))
    maximum = int(data.get("maxTeamMembers", data.get("maxTeamSize", 5)))
    return minimum, maximum


async def get_team_limits(db: AsyncSession) -> tuple[int, int]:
    config = await topic_repo.get_config(db)
    return config_team_limits(config.settings_data if config else None)


async def check_member_removal(db: AsyncSession, team: Team, count: int) -> None:
    if team.is_locked:
        raise ConflictException(
            message="Đội thi đã bị khóa, không thể xóa thành viên hoặc rời đội.",
            error_code="TEAM_LOCKED",
        )
    minimum, _ = await get_team_limits(db)
    meta = team.admin_meta or {}
    # A topic registration or explicit approval enrolls a team in the contest.
    participating = bool(team.topic_id or team.subtopic_id or meta.get("approval_status") == "approved")
    if participating and count - 1 < minimum:
        raise ConflictException(
            message=f"Không thể xóa thành viên hoặc rời đội vì đội đang tham gia dự thi và cần duy trì tối thiểu {minimum} thành viên.",
            error_code="TEAM_MIN_MEMBERS",
        )

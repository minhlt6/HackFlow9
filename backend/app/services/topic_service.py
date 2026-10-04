import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.models.team import TeamMemberRole
from app.models.user import User
from app.repositories.team_repo import team_repo
from app.repositories.topic_repo import topic_repo
from app.schemas.topic import (
    SubtopicResponse,
    TopicResponse,
    TopicSelectRequest,
    TopicSelectResponse,
)


class TopicService:
    """
    Business service layer managing topic catalog, concurrency-safe selection (SELECT FOR UPDATE),
    and cancellation within the allowed competition timeframe.
    """
    _topic_locks: Dict[str, asyncio.Lock] = {}

    def _get_topic_lock(self, topic_id: str) -> asyncio.Lock:
        if topic_id not in self._topic_locks:
            self._topic_locks[topic_id] = asyncio.Lock()
        return self._topic_locks[topic_id]

    @staticmethod
    def build_topic_response(topic) -> TopicResponse:
        subtopics_resp = []
        for s in topic.subtopics or []:
            rem_sub = max(0, s.max_teams - s.current_teams)
            subtopics_resp.append(
                SubtopicResponse(
                    id=str(s.id),
                    topic_id=str(s.topic_id),
                    title=s.title,
                    description=s.description,
                    max_teams=s.max_teams,
                    current_teams=s.current_teams,
                    remaining_slots=rem_sub,
                    is_active=s.is_active,
                )
            )

        remaining_slots = max(0, topic.max_teams - topic.current_teams)
        if not topic.is_active:
            status = "CLOSED"
        elif remaining_slots <= 0:
            status = "FULL"
        else:
            status = "AVAILABLE"

        return TopicResponse(
            id=str(topic.id),
            title=topic.title,
            description=topic.description,
            max_teams=topic.max_teams,
            current_teams=topic.current_teams,
            remaining_slots=remaining_slots,
            is_active=topic.is_active,
            status=status,
            subtopics=subtopics_resp,
        )

    async def list_topics(self, db: AsyncSession) -> List[TopicResponse]:
        """
        List all active topics with their quota, remaining slots, and subtopics.
        """
        topics = await topic_repo.get_all(db, only_active=True)
        return [self.build_topic_response(t) for t in topics]

    async def select_topic(
        self,
        db: AsyncSession,
        current_user: User,
        req: TopicSelectRequest,
    ) -> TopicSelectResponse:
        """
        Atomically register a topic for the current user's team.
        Enforces:
        - User must belong to an active, valid team (min 3 members)
        - Team must not have already selected a topic
        - Topic must be active and have remaining quota
        - Concurrency protection via SELECT FOR UPDATE on Team, Topic, and Subtopic
        - Automatic rollback on any constraint violation
        """
        # 1. Check user membership
        membership = await team_repo.get_user_membership(db, str(current_user.id))
        if not membership:
            raise ForbiddenException(
                message="Bạn chưa tham gia đội thi nào.",
                error_code="TEAM_ACCESS_DENIED",
            )

        # 2. Check competition window if config exists
        config = await topic_repo.get_config(db)
        if config:
            now_utc = datetime.now(timezone.utc)
            if not config.is_topic_published:
                raise ConflictException(
                    message="Đề tài cuộc thi chưa được công bố.",
                    error_code="TOPIC_SELECTION_CLOSED",
                )
            # Ensure comparison is timezone-aware
            start_time = config.start_time
            if start_time and start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            end_time = config.end_time
            if end_time and end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)

            if start_time and now_utc < start_time:
                raise ConflictException(
                    message="Thời gian chọn đề tài chưa bắt đầu.",
                    error_code="TOPIC_SELECTION_CLOSED",
                )
            if end_time and now_utc > end_time:
                raise ConflictException(
                    message="Thời gian chọn đề tài đã kết thúc.",
                    error_code="TOPIC_SELECTION_CLOSED",
                )

        # 3. Lock with in-process lock and SELECT FOR UPDATE
        lock = self._get_topic_lock(req.topic_id)
        async with lock:
            team = await team_repo.get_by_id(db, membership.team_id, for_update=True)
            if not team:
                raise ForbiddenException(
                    message="Không tìm thấy thông tin đội thi của bạn.",
                    error_code="TEAM_ACCESS_DENIED",
                )

            if team.is_locked:
                raise ConflictException(
                    message="Đội thi đã bị khóa, không thể chọn đề tài.",
                    error_code="TEAM_LOCKED",
                )

            # Verify team has at least 3 members (VALID status requirement)
            member_count = await team_repo.count_members(db, team.id)
            if member_count < 3:
                raise ConflictException(
                    message=f"Đội thi chưa đủ điều kiện (cần tối thiểu 3 thành viên, hiện có {member_count}).",
                    error_code="TEAM_NOT_VALID",
                )

            # Prevent selecting a second topic or overwriting
            if team.topic_id is not None:
                raise ConflictException(
                    message="Đội thi đã đăng ký đề tài rồi, không thể ghi đè.",
                    error_code="TEAM_TOPIC_ALREADY_SELECTED",
                )

            # 4. Lock Topic with SELECT FOR UPDATE
            topic = await topic_repo.get_by_id(db, req.topic_id, for_update=True)
            if not topic:
                raise NotFoundException(
                    message="Không tìm thấy đề tài yêu cầu.",
                    error_code="TOPIC_NOT_FOUND",
                )

            if not topic.is_active:
                raise ConflictException(
                    message="Đề tài này hiện đang đóng đăng ký.",
                    error_code="TOPIC_SELECTION_CLOSED",
                )

            if topic.current_teams >= topic.max_teams:
                raise ConflictException(
                    message="Đề tài này đã đủ số lượng đội thi đăng ký tối đa.",
                    error_code="TOPIC_FULL",
                )

            # 5. Lock Subtopic if specified
            subtopic = None
            if req.subtopic_id:
                subtopic = await topic_repo.get_subtopic_by_id(db, req.subtopic_id, for_update=True)
                if not subtopic or str(subtopic.topic_id) != str(topic.id):
                    raise NotFoundException(
                        message="Không tìm thấy đề tài phụ thuộc đề tài này.",
                        error_code="TOPIC_NOT_FOUND",
                    )
                if not subtopic.is_active:
                    raise ConflictException(
                        message="Đề tài phụ này hiện đang đóng đăng ký.",
                        error_code="TOPIC_SELECTION_CLOSED",
                    )
                if subtopic.current_teams >= subtopic.max_teams:
                    raise ConflictException(
                        message="Đề tài phụ này đã đủ số lượng đội thi đăng ký tối đa.",
                        error_code="TOPIC_FULL",
                    )
                subtopic.current_teams += 1
                team.subtopic_id = str(subtopic.id)

            # 6. Increment topic current_teams and assign to team
            topic.current_teams += 1
            team.topic_id = str(topic.id)

            team_id_val = str(team.id)
            topic_id_val = str(topic.id)
            subtopic_id_val = str(team.subtopic_id) if team.subtopic_id else None
            topic_title_val = topic.title
            rem = max(0, topic.max_teams - topic.current_teams)

            await db.commit()
            db.expire_all()

            return TopicSelectResponse(
                team_id=team_id_val,
                topic_id=topic_id_val,
                subtopic_id=subtopic_id_val,
                topic_title=topic_title_val,
                remaining_slots=rem,
            )

    async def cancel_topic_selection(
        self,
        db: AsyncSession,
        current_user: User,
        team_id: Optional[str] = None,
    ) -> dict:
        """
        Cancel a previously selected topic during the allowed timeframe.
        Requires LEADER role in the team.
        """
        # 1. Check user membership & role
        membership = await team_repo.get_user_membership(db, str(current_user.id))
        if not membership:
            raise ForbiddenException(
                message="Bạn chưa tham gia đội thi nào.",
                error_code="TEAM_ACCESS_DENIED",
            )

        target_team_id = team_id or membership.team_id
        if target_team_id != membership.team_id:
            raise ForbiddenException(
                message="Bạn không có quyền thao tác trên đội thi này.",
                error_code="TEAM_ACCESS_DENIED",
            )

        if membership.role != TeamMemberRole.LEADER.value:
            raise ForbiddenException(
                message="Chỉ đội trưởng mới có quyền hủy chọn đề tài.",
                error_code="FORBIDDEN_ROLE",
            )

        # 2. Check competition window
        config = await topic_repo.get_config(db)
        if config and config.end_time:
            now_utc = datetime.now(timezone.utc)
            end_time = config.end_time
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)
            if now_utc > end_time:
                raise ConflictException(
                    message="Đã hết hạn hủy chọn đề tài.",
                    error_code="TOPIC_SELECTION_CLOSED",
                )

        # 3. Lock Team with SELECT FOR UPDATE
        lock = self._get_topic_lock(str(target_team_id))
        async with lock:
            team = await team_repo.get_by_id(db, target_team_id, for_update=True)
            if not team or not team.topic_id:
                raise ConflictException(
                    message="Đội thi chưa đăng ký đề tài nào để hủy.",
                    error_code="TOPIC_NOT_SELECTED",
                )

            # 4. Lock and decrement Topic & Subtopic
            topic = await topic_repo.get_by_id(db, team.topic_id, for_update=True)
            if topic and topic.current_teams > 0:
                topic.current_teams -= 1

            if team.subtopic_id:
                subtopic = await topic_repo.get_subtopic_by_id(db, team.subtopic_id, for_update=True)
                if subtopic and subtopic.current_teams > 0:
                    subtopic.current_teams -= 1

            team.topic_id = None
            team.subtopic_id = None
            res_team_id = str(team.id)

            await db.commit()
            db.expire_all()

            return {"team_id": res_team_id, "cancelled": True}


topic_service = TopicService()

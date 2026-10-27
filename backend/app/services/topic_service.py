import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.models.team import TeamMemberRole
from app.models.user import User
from app.repositories.team_repo import team_repo
from app.repositories.topic_repo import topic_repo
from app.schemas.topic import (
    SubtopicCreateRequest,
    SubtopicResponse,
    SubtopicUpdateRequest,
    TopicCreateRequest,
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

    async def create_topic(
        self,
        db: AsyncSession,
        req: TopicCreateRequest,
    ) -> TopicResponse:
        topic = await topic_repo.create_topic(
            db,
            title=req.title,
            description=req.description,
            max_teams=req.max_teams,
            is_active=req.is_active,
        )
        tid = str(topic.id)
        await db.commit()
        loaded = await topic_repo.get_by_id(db, tid)
        return self.build_topic_response(loaded)

    async def update_topic(
        self,
        db: AsyncSession,
        topic_id: str,
        req: SubtopicUpdateRequest,
    ) -> TopicResponse:
        topic = await topic_repo.get_by_id(db, topic_id, for_update=True)
        if not topic:
            # Fallback if caller passed a subtopic_id to PUT /topics/{id}
            sub = await topic_repo.get_subtopic_by_id(db, topic_id, for_update=True)
            if sub:
                await self.update_subtopic(db, topic_id, req)
                parent = await topic_repo.get_by_id(db, str(sub.topic_id))
                return self.build_topic_response(parent)
            raise NotFoundException(
                message="Không tìm thấy mảng đề tài yêu cầu.",
                error_code="TOPIC_NOT_FOUND",
            )
        if req.title is not None:
            topic.title = req.title.strip()
        if req.description is not None:
            topic.description = req.description
        effective_quota = req.quota_max if req.quota_max is not None else req.max_teams
        if effective_quota is not None:
            topic.max_teams = effective_quota
        if req.is_active is not None:
            topic.is_active = req.is_active
        tid = str(topic.id)
        await db.commit()
        db.expire_all()
        loaded = await topic_repo.get_by_id(db, tid)
        return self.build_topic_response(loaded)

    async def delete_subtopic(
        self,
        db: AsyncSession,
        subtopic_id: str,
    ) -> Dict[str, str]:
        subtopic = await topic_repo.get_subtopic_by_id(db, subtopic_id, for_update=True)
        if not subtopic:
            raise NotFoundException(
                message="Không tìm thấy đề tài chi tiết yêu cầu.",
                error_code="TOPIC_NOT_FOUND",
            )
        await db.delete(subtopic)
        await db.commit()
        return {"id": subtopic_id, "deleted": "true"}

    async def delete_topic(
        self,
        db: AsyncSession,
        topic_id: str,
    ) -> Dict[str, str]:
        topic = await topic_repo.get_by_id(db, topic_id)
        if not topic:
            raise NotFoundException(
                message="Không tìm thấy mảng đề tài yêu cầu.",
                error_code="TOPIC_NOT_FOUND",
            )
        if topic.current_teams > 0 or any(s.current_teams > 0 for s in (topic.subtopics or [])):
            raise ConflictException(
                message="Không thể xóa mảng đề tài đã có đội thi đăng ký.",
                error_code="TOPIC_IN_USE",
            )
        await db.delete(topic)
        await db.commit()
        return {"id": topic_id, "deleted": "true"}

    async def create_subtopic(
        self,
        db: AsyncSession,
        topic_id: str,
        req: SubtopicCreateRequest,
    ) -> TopicResponse:
        topic = await topic_repo.get_by_id(db, topic_id)
        if not topic:
            raise NotFoundException(
                message="Không tìm thấy mảng đề tài chính.",
                error_code="TOPIC_NOT_FOUND",
            )
        effective_quota = req.quota_max if req.quota_max is not None else req.max_teams
        tid = str(topic.id)
        await topic_repo.create_subtopic(
            db,
            topic_id=tid,
            title=req.title,
            description=req.description,
            max_teams=effective_quota,
            is_active=req.is_active,
        )
        # Ensure parent topic max_teams is at least the sum of its subtopics
        topic.max_teams = max(topic.max_teams, (topic.max_teams or 0) + effective_quota)
        await db.commit()
        db.expire_all()
        loaded = await topic_repo.get_by_id(db, tid)
        return self.build_topic_response(loaded)

    async def update_subtopic(
        self,
        db: AsyncSession,
        subtopic_id: str,
        req: SubtopicUpdateRequest,
    ) -> SubtopicResponse:
        subtopic = await topic_repo.get_subtopic_by_id(db, subtopic_id, for_update=True)
        if not subtopic:
            raise NotFoundException(
                message="Không tìm thấy đề tài chi tiết.",
                error_code="TOPIC_NOT_FOUND",
            )
        effective_quota = req.quota_max if req.quota_max is not None else req.max_teams
        if effective_quota is not None:
            if effective_quota < subtopic.current_teams:
                raise BadRequestException(
                    message=f"Quota mới ({effective_quota}) không được nhỏ hơn số đội đã đăng ký ({subtopic.current_teams}).",
                    error_code="INVALID_QUOTA",
                )
            subtopic.max_teams = effective_quota
            parent_topic = await topic_repo.get_by_id(db, str(subtopic.topic_id))
            if parent_topic:
                total_sub_quota = sum(
                    (effective_quota if str(s.id) == str(subtopic.id) else s.max_teams)
                    for s in (parent_topic.subtopics or [])
                )
                parent_topic.max_teams = max(parent_topic.max_teams, total_sub_quota)

        if req.title is not None:
            subtopic.title = req.title.strip()
        if req.description is not None:
            subtopic.description = req.description
        if req.is_active is not None:
            subtopic.is_active = req.is_active

        await db.commit()
        await db.refresh(subtopic)
        rem_sub = max(0, subtopic.max_teams - subtopic.current_teams)
        return SubtopicResponse(
            id=str(subtopic.id),
            topic_id=str(subtopic.topic_id),
            title=subtopic.title,
            description=subtopic.description,
            max_teams=subtopic.max_teams,
            current_teams=subtopic.current_teams,
            remaining_slots=rem_sub,
            is_active=subtopic.is_active,
        )

    async def select_topic(
        self,
        db: AsyncSession,
        current_user: User,
        req: TopicSelectRequest,
    ) -> TopicSelectResponse:
        """
        Atomically register a topic for the current user's team.
        Supports passing either a main Topic ID (with optional subtopic_id)
        or a Subtopic ID directly in req.topic_id.
        """
        # 1. Check user membership & leader role
        membership = await team_repo.get_user_membership(db, str(current_user.id))
        if not membership:
            raise ForbiddenException(
                message="Bạn chưa tham gia đội thi nào.",
                error_code="TEAM_ACCESS_DENIED",
            )
        if membership.role != TeamMemberRole.LEADER.value:
            raise ForbiddenException(
                message="Chỉ đội trưởng mới có quyền chọn đề tài cho đội.",
                error_code="FORBIDDEN_ROLE",
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

            team_meta = team.admin_meta if isinstance(getattr(team, "admin_meta", None), dict) else {}
            if str(team_meta.get("approval_status", "")).lower() == "rejected":
                reason_str = team_meta.get("rejection_reason") or "Không đạt điều kiện xét duyệt của Ban Tổ Chức."
                raise ForbiddenException(
                    message=f"Đội thi của bạn đã bị Ban Tổ Chức từ chối / đình chỉ tư cách thi đấu (Lý do: {reason_str}), không thể đăng ký đề tài.",
                    error_code="TEAM_REJECTED",
                )

            team_meta = team.admin_meta if isinstance(getattr(team, "admin_meta", None), dict) else {}
            if str(team_meta.get("approval_status", "")).lower() == "rejected":
                reason_str = team_meta.get("rejection_reason") or "Không đạt điều kiện xét duyệt của Ban Tổ Chức."
                raise ForbiddenException(
                    message=f"Đội thi của bạn đã bị Ban Tổ Chức từ chối / đình chỉ tư cách thi đấu (Lý do: {reason_str}), không thể đăng ký đề tài.",
                    error_code="TEAM_REJECTED",
                )

            if team.is_locked:
                raise ConflictException(
                    message="Đội thi đã bị khóa, không thể chọn đề tài.",
                    error_code="TEAM_LOCKED",
                )

            # Verify team meets configurable minTeamSize and maxTeamSize before selecting a topic
            min_team_size = int((config.settings_data or {}).get("minTeamSize", 3)) if (config and getattr(config, "settings_data", None)) else 3
            max_team_size = int((config.settings_data or {}).get("maxTeamSize", 5)) if (config and getattr(config, "settings_data", None)) else 5
            if min_team_size < 1:
                min_team_size = 3
            if max_team_size < min_team_size:
                max_team_size = max(5, min_team_size)

            member_count = await team_repo.count_members(db, team.id)
            if member_count < min_team_size and str(getattr(team, "status", "")).upper() != "APPROVED":
                raise ConflictException(
                    message=f"Đội thi chưa đủ điều kiện chọn đề tài (cần tối thiểu {min_team_size} thành viên, tối đa {max_team_size} thành viên; hiện có {member_count}).",
                    error_code="TEAM_NOT_VALID",
                )
            if member_count > max_team_size:
                raise ConflictException(
                    message=f"Đội thi vượt quá số lượng thành viên tối đa ({max_team_size} thành viên; hiện có {member_count}).",
                    error_code="TEAM_NOT_VALID",
                )

            # Prevent selecting a second topic or overwriting
            if team.topic_id is not None:
                raise ConflictException(
                    message="Đội thi đã đăng ký đề tài rồi, không thể ghi đè.",
                    error_code="TEAM_TOPIC_ALREADY_SELECTED",
                )

            # 4. Resolve Topic (or Subtopic if req.topic_id is actually a Subtopic ID)
            effective_subtopic_id = req.subtopic_id
            topic = await topic_repo.get_by_id(db, req.topic_id, for_update=True)
            if not topic and not effective_subtopic_id:
                direct_sub = await topic_repo.get_subtopic_by_id(db, req.topic_id, for_update=True)
                if direct_sub:
                    effective_subtopic_id = str(direct_sub.id)
                    topic = await topic_repo.get_by_id(db, str(direct_sub.topic_id), for_update=True)

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
            if effective_subtopic_id:
                subtopic = await topic_repo.get_subtopic_by_id(db, effective_subtopic_id, for_update=True)
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
            topic_title_val = subtopic.title if subtopic else topic.title
            rem = (
                max(0, subtopic.max_teams - subtopic.current_teams)
                if subtopic
                else max(0, topic.max_teams - topic.current_teams)
            )

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

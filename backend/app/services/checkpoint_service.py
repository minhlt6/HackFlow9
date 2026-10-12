from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.checkpoint import Checkpoint
from app.repositories.checkpoint_repo import checkpoint_repo
from app.schemas.checkpoint import (
    CheckpointCreateRequest,
    CheckpointResponse,
    CheckpointStatus,
    CheckpointTimeGatedStatusResponse,
    CheckpointUpdateRequest,
    ValidateSubmissionWindowResponse,
)

# Thời gian ân hạn mạng (Grace Period) quy định cố định theo SRS (HF-23): 5 giây
GRACE_PERIOD_SECONDS = 5


def ensure_utc(dt: datetime) -> datetime:
    """
    Chuẩn hóa datetime về timezone UTC (hỗ trợ cả naive và timezone-aware).
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class CheckpointService:
    """
    Business service layer managing Hackathon Checkpoints, milestones,
    and Strict Time-gated validation with Network Latency Grace Period (5s).
    """

    @staticmethod
    def calculate_time_gate_info(
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
    ) -> dict:
        """
        Tính toán trạng thái time-gated của một Checkpoint tại thời điểm 'now'.
        """
        current_time = ensure_utc(now or datetime.now(timezone.utc))
        start_time = ensure_utc(checkpoint.start_time)
        deadline = ensure_utc(checkpoint.deadline)
        grace_deadline = deadline + timedelta(seconds=GRACE_PERIOD_SECONDS)

        time_remaining_sec = max(0, int((deadline - current_time).total_seconds()))
        time_until_start_sec = max(0, int((start_time - current_time).total_seconds()))

        # 1. Ban tổ chức khóa checkpoint
        if not checkpoint.is_active:
            return {
                "status": CheckpointStatus.CLOSED.value,
                "is_open": False,
                "can_submit": False,
                "grace_period_applied": False,
                "message": "Checkpoint này đang tạm khóa hoặc đã bị vô hiệu hóa bởi Ban tổ chức.",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": 0,
                "time_until_start_seconds": time_until_start_sec,
            }

        # 2. Chưa đến thời gian mở cổng
        if current_time < start_time:
            return {
                "status": CheckpointStatus.UPCOMING.value,
                "is_open": False,
                "can_submit": False,
                "grace_period_applied": False,
                "message": "Cổng nộp bài cho checkpoint này chưa đến giờ mở.",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": time_remaining_sec,
                "time_until_start_seconds": time_until_start_sec,
            }

        # 3. Đang trong khung giờ nộp bài hợp lệ
        if start_time <= current_time <= deadline:
            return {
                "status": CheckpointStatus.OPEN.value,
                "is_open": True,
                "can_submit": True,
                "grace_period_applied": False,
                "message": "Cổng nộp bài đang mở hợp lệ.",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": time_remaining_sec,
                "time_until_start_seconds": 0,
            }

        # 4. Trong khoảng ân hạn mạng (Grace Period 5 giây)
        if deadline < current_time <= grace_deadline:
            return {
                "status": CheckpointStatus.GRACE_PERIOD.value,
                "is_open": True,
                "can_submit": True,
                "grace_period_applied": True,
                "message": "Nộp bài trong thời gian ân hạn mạng (Grace Period 5 giây).",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": 0,
                "time_until_start_seconds": 0,
            }

        # 5. Quá hạn nộp bài hoàn toàn (Sau deadline + 5 giây)
        return {
            "status": CheckpointStatus.CLOSED.value,
            "is_open": False,
            "can_submit": False,
            "grace_period_applied": False,
            "message": "Đã quá thời hạn nộp bài cho checkpoint này (kể cả thời gian ân hạn mạng 5 giây).",
            "server_time": current_time,
            "start_time": start_time,
            "deadline": deadline,
            "time_remaining_seconds": 0,
            "time_until_start_seconds": 0,
        }

    @staticmethod
    def validate_checkpoint_submission_window(
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
    ) -> Tuple[bool, bool, str]:
        """
        Kiểm tra nghiêm ngặt time-gated cho việc nộp bài:
        - Ném HTTP 403 Forbidden nếu:
          + Checkpoint inactive -> CHECKPOINT_INACTIVE
          + now < start_time -> CHECKPOINT_NOT_OPEN
          + now > deadline + grace_period -> DEADLINE_EXCEEDED
        - Trả về (is_valid=True, grace_period_applied=bool, message=str) nếu hợp lệ.
        """
        info = CheckpointService.calculate_time_gate_info(checkpoint, now)

        if not checkpoint.is_active:
            raise ForbiddenException(
                message="Checkpoint này đang tạm khóa hoặc đã bị vô hiệu hóa bởi Ban tổ chức.",
                error_code="CHECKPOINT_INACTIVE",
            )

        if info["status"] == CheckpointStatus.UPCOMING.value:
            raise ForbiddenException(
                message="Cổng nộp bài cho checkpoint này chưa đến giờ mở.",
                error_code="CHECKPOINT_NOT_OPEN",
            )

        if info["status"] == CheckpointStatus.CLOSED.value:
            raise ForbiddenException(
                message="Đã quá thời hạn nộp bài cho checkpoint này (kể cả thời gian ân hạn mạng 5 giây).",
                error_code="DEADLINE_EXCEEDED",
            )

        return True, info["grace_period_applied"], info["message"]

    @classmethod
    def build_checkpoint_response(
        cls,
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
    ) -> CheckpointResponse:
        info = cls.calculate_time_gate_info(checkpoint, now)
        return CheckpointResponse(
            id=str(checkpoint.id),
            title=checkpoint.title,
            description=checkpoint.description,
            start_time=info["start_time"],
            deadline=info["deadline"],
            requirements=checkpoint.requirements,
            is_active=checkpoint.is_active,
            status=info["status"],
            is_open=info["is_open"],
            can_submit=info["can_submit"],
            grace_period_seconds=GRACE_PERIOD_SECONDS,
            time_remaining_seconds=info["time_remaining_seconds"],
            time_until_start_seconds=info["time_until_start_seconds"],
            server_time=info["server_time"],
            created_at=checkpoint.created_at,
            updated_at=checkpoint.updated_at,
        )

    @classmethod
    def build_status_response(
        cls,
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
    ) -> CheckpointTimeGatedStatusResponse:
        info = cls.calculate_time_gate_info(checkpoint, now)
        return CheckpointTimeGatedStatusResponse(
            checkpoint_id=str(checkpoint.id),
            title=checkpoint.title,
            server_time=info["server_time"],
            start_time=info["start_time"],
            deadline=info["deadline"],
            is_active=checkpoint.is_active,
            is_open=info["is_open"],
            status=info["status"],
            can_submit=info["can_submit"],
            grace_period_applied=info["grace_period_applied"],
            grace_period_seconds=GRACE_PERIOD_SECONDS,
            time_remaining_seconds=info["time_remaining_seconds"],
            time_until_start_seconds=info["time_until_start_seconds"],
            message=info["message"],
        )

    async def list_checkpoints(
        self,
        db: AsyncSession,
        only_active: bool = False,
        now: Optional[datetime] = None,
    ) -> List[CheckpointResponse]:
        checkpoints = await checkpoint_repo.get_all(db, only_active=only_active)
        return [self.build_checkpoint_response(cp, now) for cp in checkpoints]

    async def get_checkpoint_by_id(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        now: Optional[datetime] = None,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")
        return self.build_checkpoint_response(cp, now)

    async def get_time_gated_status(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        now: Optional[datetime] = None,
    ) -> CheckpointTimeGatedStatusResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")
        return self.build_status_response(cp, now)

    async def verify_submission_window(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        simulate_time: Optional[datetime] = None,
    ) -> ValidateSubmissionWindowResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        is_valid, grace_applied, message = self.validate_checkpoint_submission_window(
            cp, now=simulate_time
        )
        server_time = ensure_utc(simulate_time or datetime.now(timezone.utc))

        return ValidateSubmissionWindowResponse(
            is_valid=is_valid,
            grace_period_applied=grace_applied,
            checkpoint_id=str(cp.id),
            checkpoint_title=cp.title,
            server_time=server_time,
            message=message,
        )

    async def create_checkpoint(
        self,
        db: AsyncSession,
        data: CheckpointCreateRequest,
    ) -> CheckpointResponse:
        start_utc = ensure_utc(data.start_time)
        deadline_utc = ensure_utc(data.deadline)

        if deadline_utc <= start_utc:
            raise BadRequestException(message="Hạn chót (deadline) phải diễn ra sau thời điểm mở cổng (start_time).")

        checkpoint = await checkpoint_repo.create(
            db=db,
            title=data.title,
            start_time=start_utc,
            deadline=deadline_utc,
            description=data.description,
            requirements=data.requirements,
            is_active=data.is_active,
        )
        await db.commit()
        await db.refresh(checkpoint)
        return self.build_checkpoint_response(checkpoint)

    async def update_checkpoint(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        data: CheckpointUpdateRequest,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        update_fields = {}
        if data.title is not None:
            update_fields["title"] = data.title.strip()
        if data.description is not None:
            update_fields["description"] = data.description
        if data.requirements is not None:
            update_fields["requirements"] = data.requirements
        if data.is_active is not None:
            update_fields["is_active"] = data.is_active

        new_start = ensure_utc(data.start_time) if data.start_time is not None else ensure_utc(cp.start_time)
        new_deadline = ensure_utc(data.deadline) if data.deadline is not None else ensure_utc(cp.deadline)

        if new_deadline <= new_start:
            raise BadRequestException(message="Hạn chót (deadline) phải diễn ra sau thời điểm mở cổng (start_time).")

        if data.start_time is not None:
            update_fields["start_time"] = new_start
        if data.deadline is not None:
            update_fields["deadline"] = new_deadline

        updated_cp = await checkpoint_repo.update(db, cp, **update_fields)
        await db.commit()
        await db.refresh(updated_cp)
        return self.build_checkpoint_response(updated_cp)

    async def toggle_active(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        is_active: bool,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        updated_cp = await checkpoint_repo.toggle_active(db, cp, is_active)
        await db.commit()
        await db.refresh(updated_cp)
        return self.build_checkpoint_response(updated_cp)

    async def delete_checkpoint(
        self,
        db: AsyncSession,
        checkpoint_id: str,
    ) -> None:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        await checkpoint_repo.delete(db, cp)
        await db.commit()


checkpoint_service = CheckpointService()

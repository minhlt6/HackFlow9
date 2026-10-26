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
        grace_sec = getattr(checkpoint, "grace_period_seconds", GRACE_PERIOD_SECONDS)
        if grace_sec is None:
            grace_sec = GRACE_PERIOD_SECONDS
        grace_deadline = deadline + timedelta(seconds=grace_sec)
        is_final = getattr(checkpoint, "is_final_checkpoint", False)

        time_remaining_sec = max(0, int((deadline - current_time).total_seconds()))
        time_until_start_sec = max(0, int((start_time - current_time).total_seconds()))

        # 1. Ban tổ chức khóa checkpoint
        if not checkpoint.is_active:
            return {
                "status": CheckpointStatus.CLOSED.value,
                "is_open": False,
                "can_submit": False,
                "grace_period_applied": False,
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
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
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
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
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
                "message": "Cổng nộp bài đang mở hợp lệ.",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": time_remaining_sec,
                "time_until_start_seconds": 0,
            }

        # 4. Trong khoảng ân hạn mạng (Grace Period)
        if deadline < current_time <= grace_deadline:
            return {
                "status": CheckpointStatus.GRACE_PERIOD.value,
                "is_open": True,
                "can_submit": True,
                "grace_period_applied": True,
                "grace_period_seconds": grace_sec,
                "is_final_checkpoint": is_final,
                "message": f"Nộp bài trong thời gian ân hạn mạng (Grace Period {grace_sec} giây).",
                "server_time": current_time,
                "start_time": start_time,
                "deadline": deadline,
                "time_remaining_seconds": 0,
                "time_until_start_seconds": 0,
            }

        # 5. Quá hạn nộp bài hoàn toàn (Sau deadline + grace_period_seconds)
        return {
            "status": CheckpointStatus.CLOSED.value,
            "is_open": False,
            "can_submit": False,
            "grace_period_applied": False,
            "grace_period_seconds": grace_sec,
            "is_final_checkpoint": is_final,
            "message": f"Đã quá thời hạn nộp bài cho checkpoint này (kể cả thời gian ân hạn mạng {grace_sec} giây).",
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
        grace_sec = info.get("grace_period_seconds", GRACE_PERIOD_SECONDS)

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
                message=f"Đã quá thời hạn nộp bài cho checkpoint này (kể cả thời gian ân hạn mạng {grace_sec} giây).",
                error_code="DEADLINE_EXCEEDED",
            )

        return True, info["grace_period_applied"], info["message"]

    @classmethod
    def build_checkpoint_response(
        cls,
        checkpoint: Checkpoint,
        now: Optional[datetime] = None,
        latest_submission: Optional[dict] = None,
    ) -> CheckpointResponse:
        info = cls.calculate_time_gate_info(checkpoint, now)
        return CheckpointResponse(
            id=str(checkpoint.id),
            weight=checkpoint.weight,
            display_order=checkpoint.display_order,
            title=checkpoint.title,
            description=checkpoint.description,
            start_time=info["start_time"],
            deadline=info["deadline"],
            requirements=checkpoint.requirements,
            is_active=checkpoint.is_active,
            is_final_checkpoint=info["is_final_checkpoint"],
            submission_fields=checkpoint.submission_fields,
            status=info["status"],
            is_open=info["is_open"],
            can_submit=info["can_submit"],
            grace_period_seconds=info["grace_period_seconds"],
            time_remaining_seconds=info["time_remaining_seconds"],
            time_until_start_seconds=info["time_until_start_seconds"],
            server_time=info["server_time"],
            latest_submission=latest_submission,
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
            grace_period_seconds=info["grace_period_seconds"],
            is_final_checkpoint=info["is_final_checkpoint"],
            time_remaining_seconds=info["time_remaining_seconds"],
            time_until_start_seconds=info["time_until_start_seconds"],
            message=info["message"],
        )

    async def list_checkpoints(
        self,
        db: AsyncSession,
        only_active: bool = False,
        now: Optional[datetime] = None,
        user_id: Optional[str] = None,
    ) -> List[CheckpointResponse]:
        checkpoints = await checkpoint_repo.get_all(db, only_active=only_active)
        submissions_by_cp: dict = {}
        if user_id:
            from app.repositories.team_repo import team_repo
            from app.repositories.submission_repo import submission_repo
            from app.services.submission_service import submission_service

            membership = await team_repo.get_user_membership(db, str(user_id))
            if membership:
                team_subs = await submission_repo.list_submissions(
                    db, team_id=str(membership.team_id)
                )
                for sub in team_subs:
                    submissions_by_cp[str(sub.checkpoint_id)] = (
                        submission_service.build_submission_response(sub).model_dump(mode="json")
                    )

        return [
            self.build_checkpoint_response(
                cp, now, latest_submission=submissions_by_cp.get(str(cp.id))
            )
            for cp in checkpoints
        ]

    async def get_checkpoint_by_id(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        now: Optional[datetime] = None,
        user_id: Optional[str] = None,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        latest_sub = None
        if user_id:
            from app.repositories.team_repo import team_repo
            from app.repositories.submission_repo import submission_repo
            from app.services.submission_service import submission_service

            membership = await team_repo.get_user_membership(db, str(user_id))
            if membership:
                sub = await submission_repo.get_by_team_and_checkpoint(
                    db, team_id=str(membership.team_id), checkpoint_id=str(cp.id)
                )
                if sub:
                    latest_sub = submission_service.build_submission_response(sub).model_dump(
                        mode="json"
                    )

        return self.build_checkpoint_response(cp, now, latest_submission=latest_sub)


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

    @staticmethod
    def _normalize_submission_fields(
        is_final_checkpoint: bool,
        raw_fields: Optional[List[dict]],
    ) -> Optional[List[dict]]:
        """
        SRS HF-23 Mục 1.1:
        - Nếu is_final_checkpoint = False: Tự động bỏ qua (ép apply_sha_freeze = False) trên mọi trường.
        - Nếu is_final_checkpoint = True: Trường có apply_sha_freeze = True bắt buộc phải có required = True,
          và tối đa chỉ có 1 trường được bật apply_sha_freeze = True.
        """
        if raw_fields is None:
            return None

        normalized: List[dict] = []
        freeze_count = 0

        for item in raw_fields:
            field_copy = dict(item)
            if not is_final_checkpoint:
                field_copy["apply_sha_freeze"] = False
            else:
                if field_copy.get("apply_sha_freeze"):
                    freeze_count += 1
                    field_copy["required"] = True
            normalized.append(field_copy)

        if is_final_checkpoint and freeze_count > 1:
            raise BadRequestException(
                message="Checkpoint chốt sản phẩm cuối cùng chỉ được phép cấu hình tối đa 1 trường apply_sha_freeze = true."
            )

        return normalized

    async def create_checkpoint(
        self,
        db: AsyncSession,
        data: CheckpointCreateRequest,
    ) -> CheckpointResponse:
        start_utc = ensure_utc(data.start_time)
        deadline_utc = ensure_utc(data.deadline)

        if deadline_utc <= start_utc:
            raise BadRequestException(message="Hạn chót (deadline) phải diễn ra sau thời điểm mở cổng (start_time).")

        raw_fields = (
            [f.model_dump() for f in data.submission_fields]
            if data.submission_fields is not None
            else None
        )
        fields_dump = self._normalize_submission_fields(data.is_final_checkpoint, raw_fields)

        checkpoint = await checkpoint_repo.create(
            db=db,
            title=data.title,
            start_time=start_utc,
            deadline=deadline_utc,
            description=data.description,
            requirements=data.requirements,
            is_active=data.is_active,
            is_final_checkpoint=data.is_final_checkpoint,
            grace_period_seconds=data.grace_period_seconds,
            submission_fields=fields_dump,
            weight=data.weight or 0,
            display_order=data.display_order or 0,
        )
        await db.commit()
        await db.refresh(checkpoint)
        return self.build_checkpoint_response(checkpoint)

    async def update_checkpoint(
        self,
        db: AsyncSession,
        checkpoint_id: str,
        data: CheckpointUpdateRequest,
        admin_user_id: Optional[str] = None,
    ) -> CheckpointResponse:
        cp = await checkpoint_repo.get_by_id(db, checkpoint_id)
        if not cp:
            raise NotFoundException(message=f"Không tìm thấy checkpoint với ID '{checkpoint_id}'.")

        old_deadline = ensure_utc(cp.deadline)
        old_start = ensure_utc(cp.start_time)

        update_fields = {}
        if data.weight is not None:
            update_fields["weight"] = data.weight
        if data.display_order is not None:
            update_fields["display_order"] = data.display_order
        if data.title is not None:
            update_fields["title"] = data.title.strip()
        if data.description is not None:
            update_fields["description"] = data.description
        if data.requirements is not None:
            update_fields["requirements"] = data.requirements
        if data.is_active is not None:
            update_fields["is_active"] = data.is_active

        effective_is_final = (
            data.is_final_checkpoint
            if data.is_final_checkpoint is not None
            else bool(cp.is_final_checkpoint)
        )
        if data.is_final_checkpoint is not None:
            update_fields["is_final_checkpoint"] = data.is_final_checkpoint
        if data.grace_period_seconds is not None:
            update_fields["grace_period_seconds"] = data.grace_period_seconds

        if data.submission_fields is not None:
            raw_fields = [f.model_dump() for f in data.submission_fields]
            update_fields["submission_fields"] = self._normalize_submission_fields(
                effective_is_final, raw_fields
            )
        elif data.is_final_checkpoint is False and cp.submission_fields:
            update_fields["submission_fields"] = self._normalize_submission_fields(
                False, list(cp.submission_fields)
            )

        new_start = ensure_utc(data.start_time) if data.start_time is not None else old_start
        new_deadline = ensure_utc(data.deadline) if data.deadline is not None else old_deadline

        if new_deadline <= new_start:
            raise BadRequestException(message="Hạn chót (deadline) phải diễn ra sau thời điểm mở cổng (start_time).")

        if data.start_time is not None:
            update_fields["start_time"] = new_start
        if data.deadline is not None:
            update_fields["deadline"] = new_deadline

        updated_cp = await checkpoint_repo.update(db, cp, **update_fields)

        # Ghi Audit Log khi Admin gia hạn deadline hoặc cập nhật checkpoint (UAT-CP-13)
        from app.repositories.submission_repo import submission_repo

        is_deadline_extended = data.deadline is not None and new_deadline > old_deadline
        audit_action = (
            "CHECKPOINT_DEADLINE_EXTENDED"
            if is_deadline_extended
            else "CHECKPOINT_UPDATED"
        )
        await submission_repo.create_audit_log(
            db=db,
            user_id=admin_user_id,
            team_id=None,
            checkpoint_id=str(updated_cp.id),
            submission_id=None,
            action=audit_action,
            status="updated",
            late_grace_period=False,
            details={
                "old_deadline": old_deadline.isoformat(),
                "new_deadline": new_deadline.isoformat(),
                "is_deadline_extended": is_deadline_extended,
                "updated_fields": list(update_fields.keys()),
            },
        )

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

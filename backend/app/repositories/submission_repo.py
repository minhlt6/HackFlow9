from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkpoint import AuditLog, Submission


class SubmissionRepository:
    """
    Data access layer for Submission and AuditLog models (HF-34 & SRS HF-23).
    """

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        submission_id: str,
        for_update: bool = False,
    ) -> Optional[Submission]:
        stmt = select(Submission).where(Submission.id == submission_id)
        if for_update:
            stmt = stmt.with_for_update()
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_team_and_checkpoint(
        db: AsyncSession,
        team_id: str,
        checkpoint_id: str,
        for_update: bool = False,
    ) -> Optional[Submission]:
        stmt = select(Submission).where(
            Submission.team_id == team_id,
            Submission.checkpoint_id == checkpoint_id,
        )
        if for_update:
            stmt = stmt.with_for_update()
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_submissions(
        db: AsyncSession,
        team_id: Optional[str] = None,
        checkpoint_id: Optional[str] = None,
    ) -> List[Submission]:
        stmt = select(Submission).order_by(Submission.submitted_at.desc())
        if team_id:
            stmt = stmt.where(Submission.team_id == team_id)
        if checkpoint_id:
            stmt = stmt.where(Submission.checkpoint_id == checkpoint_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create(
        db: AsyncSession,
        checkpoint_id: str,
        team_id: str,
        submitted_by: Optional[str],
        repo_url: Optional[str],
        demo_url: Optional[str],
        commit_sha: Optional[str],
        submission_data: Optional[Dict[str, Any]],
        note: Optional[str],
        status: str,
        grace_period_applied: bool,
        version: int,
        version_history: Optional[List[Dict[str, Any]]],
        idempotency_key: Optional[str],
        submitted_at: datetime,
    ) -> Submission:
        submission = Submission(
            checkpoint_id=checkpoint_id,
            team_id=team_id,
            submitted_by=submitted_by,
            repo_url=repo_url,
            demo_url=demo_url,
            commit_sha=commit_sha,
            submission_data=submission_data,
            note=note,
            status=status,
            grace_period_applied=grace_period_applied,
            version=version,
            version_history=version_history or [],
            idempotency_key=idempotency_key,
            submitted_at=submitted_at,
        )
        db.add(submission)
        await db.flush()
        return submission

    @staticmethod
    async def update(
        db: AsyncSession,
        submission: Submission,
        **kwargs,
    ) -> Submission:
        for key, value in kwargs.items():
            if hasattr(submission, key):
                setattr(submission, key, value)
        await db.flush()
        return submission

    @staticmethod
    async def delete(
        db: AsyncSession,
        submission: Submission,
    ) -> None:
        await db.delete(submission)
        await db.flush()

    @staticmethod
    async def create_audit_log(
        db: AsyncSession,
        action: str,
        status: str,
        user_id: Optional[str] = None,
        team_id: Optional[str] = None,
        checkpoint_id: Optional[str] = None,
        submission_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        late_grace_period: bool = False,
        commit_sha: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        log_entry = AuditLog(
            user_id=user_id,
            team_id=team_id,
            checkpoint_id=checkpoint_id,
            submission_id=submission_id,
            action=action,
            status=status,
            ip_address=ip_address,
            late_grace_period=late_grace_period,
            commit_sha=commit_sha,
            details=details or {},
        )
        db.add(log_entry)
        await db.flush()
        return log_entry

    @staticmethod
    async def list_audit_logs(
        db: AsyncSession,
        team_id: Optional[str] = None,
        checkpoint_id: Optional[str] = None,
        submission_id: Optional[str] = None,
        action: Optional[str] = None,
        late_grace_period: Optional[bool] = None,
    ) -> List[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
        if team_id:
            stmt = stmt.where(AuditLog.team_id == team_id)
        if checkpoint_id:
            stmt = stmt.where(AuditLog.checkpoint_id == checkpoint_id)
        if submission_id:
            stmt = stmt.where(AuditLog.submission_id == submission_id)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if late_grace_period is not None:
            stmt = stmt.where(AuditLog.late_grace_period.is_(late_grace_period))
        result = await db.execute(stmt)
        return list(result.scalars().all())


submission_repo = SubmissionRepository()

from datetime import datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.checkpoint import Checkpoint


class CheckpointRepository:
    """
    Data access layer for Checkpoint model.
    """

    @staticmethod
    async def get_all(
        db: AsyncSession,
        only_active: bool = False,
    ) -> List[Checkpoint]:
        stmt = select(Checkpoint).order_by(Checkpoint.start_time.asc())
        if only_active:
            stmt = stmt.where(Checkpoint.is_active.is_(True))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        checkpoint_id: str,
        for_update: bool = False,
    ) -> Optional[Checkpoint]:
        stmt = select(Checkpoint).where(Checkpoint.id == checkpoint_id)
        if for_update:
            stmt = stmt.with_for_update()
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession,
        title: str,
        start_time: datetime,
        deadline: datetime,
        description: Optional[str] = None,
        requirements: Optional[str] = None,
        is_active: bool = True,
    ) -> Checkpoint:
        checkpoint = Checkpoint(
            title=title.strip(),
            start_time=start_time,
            deadline=deadline,
            description=description,
            requirements=requirements,
            is_active=is_active,
        )
        db.add(checkpoint)
        await db.flush()
        return checkpoint

    @staticmethod
    async def update(
        db: AsyncSession,
        checkpoint: Checkpoint,
        **kwargs,
    ) -> Checkpoint:
        for key, value in kwargs.items():
            if value is not None and hasattr(checkpoint, key):
                setattr(checkpoint, key, value)
        await db.flush()
        return checkpoint

    @staticmethod
    async def toggle_active(
        db: AsyncSession,
        checkpoint: Checkpoint,
        is_active: bool,
    ) -> Checkpoint:
        checkpoint.is_active = is_active
        await db.flush()
        return checkpoint

    @staticmethod
    async def delete(
        db: AsyncSession,
        checkpoint: Checkpoint,
    ) -> None:
        await db.delete(checkpoint)
        await db.flush()


checkpoint_repo = CheckpointRepository()

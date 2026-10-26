from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.announcement import Announcement


class AnnouncementRepository:
    """
    Data access layer for Announcement model.
    All methods are async and receive the AsyncSession from the caller (service/endpoint).
    """

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        announcement_id: str,
    ) -> Optional[Announcement]:
        """Fetch a single announcement by its UUID primary key."""
        stmt = select(Announcement).where(Announcement.id == announcement_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_multi(
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 10,
        role: Optional[str] = None,
    ) -> List[Announcement]:
        """Fetch a page of announcements ordered by created_at descending (newest first)."""
        stmt = (
            select(Announcement)
            .order_by(Announcement.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if role != "admin":
            stmt = stmt.where(Announcement.target_audience.in_(["all", role or "anonymous"]))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def count(db: AsyncSession, role: Optional[str] = None) -> int:
        """Count total number of announcements."""
        stmt = select(func.count()).select_from(Announcement)
        if role != "admin":
            stmt = stmt.where(Announcement.target_audience.in_(["all", role or "anonymous"]))
        result = await db.execute(stmt)
        return result.scalar() or 0

    @staticmethod
    async def create(
        db: AsyncSession,
        *,
        title: str,
        content: str,
        priority: str,
        target_audience: str = "all",
    ) -> Announcement:
        """Insert a new announcement into the database."""
        announcement = Announcement(
            title=title.strip(),
            content=content.strip(),
            priority=priority,
            target_audience=target_audience,
        )
        db.add(announcement)
        await db.commit()
        await db.refresh(announcement)
        return announcement

    @staticmethod
    async def update(
        db: AsyncSession,
        db_obj: Announcement,
        update_data: dict,
    ) -> Announcement:
        """Update fields on an existing announcement record."""
        for field, value in update_data.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    @staticmethod
    async def delete(
        db: AsyncSession,
        db_obj: Announcement,
    ) -> None:
        """Hard-delete an announcement record."""
        await db.delete(db_obj)
        await db.commit()


announcement_repo = AnnouncementRepository()

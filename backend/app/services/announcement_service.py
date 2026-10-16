from typing import List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.announcement import Announcement
from app.repositories.announcement_repo import announcement_repo
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate


class AnnouncementService:
    """
    Business service layer for Announcement CRUD operations.
    Handles validation, error mapping, and delegates persistence to the repository.
    """

    async def create_announcement(
        self,
        db: AsyncSession,
        payload: AnnouncementCreate,
    ) -> Announcement:
        """Create a new announcement. Caller must verify admin/BTC role beforehand."""
        return await announcement_repo.create(
            db,
            title=payload.title,
            content=payload.content,
            priority=payload.priority.value,
        )

    async def list_announcements(
        self,
        db: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[Announcement], int]:
        """
        Return a paginated list of announcements (newest first) with total count.
        """
        skip = (page - 1) * page_size
        items = await announcement_repo.get_multi(db, skip=skip, limit=page_size)
        total = await announcement_repo.count(db)
        return items, total

    async def get_or_404(
        self,
        db: AsyncSession,
        announcement_id: str,
    ) -> Announcement:
        """Fetch an announcement by ID or raise 404 TARGET_NOT_FOUND."""
        obj = await announcement_repo.get_by_id(db, announcement_id)
        if not obj:
            raise NotFoundException(
                message=f"Không tìm thấy thông báo với ID '{announcement_id}'.",
                error_code="TARGET_NOT_FOUND",
            )
        return obj

    async def update_announcement(
        self,
        db: AsyncSession,
        announcement_id: str,
        payload: AnnouncementUpdate,
    ) -> Announcement:
        """Update an existing announcement. Returns updated record or raises 404."""
        db_obj = await self.get_or_404(db, announcement_id)
        update_data = payload.model_dump(exclude_unset=True)
        # Convert enum value to string for DB storage
        if "priority" in update_data and update_data["priority"] is not None:
            update_data["priority"] = update_data["priority"].value
        return await announcement_repo.update(db, db_obj, update_data)

    async def delete_announcement(
        self,
        db: AsyncSession,
        announcement_id: str,
    ) -> Announcement:
        """Delete an announcement by ID. Returns the deleted record or raises 404."""
        db_obj = await self.get_or_404(db, announcement_id)
        await announcement_repo.delete(db, db_obj)
        return db_obj


announcement_service = AnnouncementService()

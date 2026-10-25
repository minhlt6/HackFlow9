from typing import Optional, Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.whitelist import WhitelistEntry


class WhitelistRepository:
    """
    Async repository for WhitelistEntry CRUD operations.
    Used by AuthService to check email eligibility and by Admin endpoints for management.
    """

    async def get_by_email(
        self, db: AsyncSession, email: str
    ) -> Optional[WhitelistEntry]:
        """Return active whitelist entry for given email, or None."""
        stmt = select(WhitelistEntry).where(
            WhitelistEntry.email == email.lower().strip(),
            WhitelistEntry.is_active.is_(True),
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(
        self, db: AsyncSession, entry_id: str
    ) -> Optional[WhitelistEntry]:
        stmt = select(WhitelistEntry).where(WhitelistEntry.id == entry_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_or_email(
        self, db: AsyncSession, id_or_email: str, email_hint: Optional[str] = None
    ) -> Optional[WhitelistEntry]:
        entry = await self.get_by_id(db, id_or_email)
        if entry:
            return entry
        lookup_email = (email_hint or id_or_email).lower().strip()
        if "@" in lookup_email:
            stmt = select(WhitelistEntry).where(WhitelistEntry.email == lookup_email)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()
        return None

    async def get_all(
        self, db: AsyncSession, include_inactive: bool = False
    ) -> Sequence[WhitelistEntry]:
        """Return all whitelist entries. BTC can see inactive ones too."""
        stmt = select(WhitelistEntry).order_by(WhitelistEntry.created_at.desc())
        if not include_inactive:
            stmt = stmt.where(WhitelistEntry.is_active.is_(True))
        result = await db.execute(stmt)
        return result.scalars().all()

    async def add_email(
        self,
        db: AsyncSession,
        email: str,
        added_by: Optional[str] = None,
        note: Optional[str] = None,
    ) -> WhitelistEntry:
        """
        Add an email to the whitelist.
        If the email already exists (even inactive), reactivate it instead of creating a duplicate.
        """
        stmt = select(WhitelistEntry).where(
            WhitelistEntry.email == email.lower().strip()
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # Reactivate and update metadata
            existing.is_active = True
            if added_by:
                existing.added_by = added_by
            if note:
                existing.note = note
            db.add(existing)
            await db.flush()
            return existing

        entry = WhitelistEntry(
            email=email.lower().strip(),
            is_active=True,
            added_by=added_by,
            note=note,
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        return entry

    async def bulk_add(
        self,
        db: AsyncSession,
        emails: list[str],
        added_by: Optional[str] = None,
        note: Optional[str] = None,
    ) -> list[WhitelistEntry]:
        """Add multiple emails at once. Skips / reactivates duplicates."""
        results = []
        for email in emails:
            entry = await self.add_email(db, email, added_by=added_by, note=note)
            results.append(entry)
        return results

    async def deactivate(
        self, db: AsyncSession, entry_id: str, email_hint: Optional[str] = None
    ) -> Optional[WhitelistEntry]:
        """Soft-delete: set is_active=False."""
        entry = await self.get_by_id_or_email(db, entry_id, email_hint=email_hint)
        if not entry:
            return None
        entry.is_active = False
        db.add(entry)
        await db.flush()
        return entry

    async def delete_permanently(
        self, db: AsyncSession, entry_id: str, email_hint: Optional[str] = None
    ) -> Optional[WhitelistEntry]:
        """Hard-delete a whitelist entry from database."""
        entry = await self.get_by_id_or_email(db, entry_id, email_hint=email_hint)
        if not entry:
            return None
        await db.delete(entry)
        await db.flush()
        return entry

    async def reactivate(
        self, db: AsyncSession, entry_id: str, email_hint: Optional[str] = None
    ) -> Optional[WhitelistEntry]:
        """Re-enable a previously deactivated entry."""
        entry = await self.get_by_id_or_email(db, entry_id, email_hint=email_hint)
        if not entry:
            return None
        entry.is_active = True
        db.add(entry)
        await db.flush()
        return entry


whitelist_repo = WhitelistRepository()

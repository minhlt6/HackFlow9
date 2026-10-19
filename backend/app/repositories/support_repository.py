from typing import List, Optional, Union
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.support import SupportTicket, TicketPriority, TicketStatus
from app.schemas.support import TicketCreate, TicketUpdate


class SupportRepository:
    """
    Data access layer for SupportTicket model.
    All operations are asynchronous and strictly use db.commit() & db.refresh().
    """

    @staticmethod
    async def create_ticket(
        db: AsyncSession,
        obj_in: TicketCreate,
        user_id: str,
        team_id: Optional[str] = None,
    ) -> SupportTicket:
        """
        Create a new support ticket with status defaulting to OPEN.
        """
        priority_val = (
            obj_in.priority.value
            if hasattr(obj_in.priority, "value")
            else str(obj_in.priority)
        )
        ticket = SupportTicket(
            title=obj_in.title,
            content=obj_in.content,
            category=obj_in.category,
            priority=priority_val,
            status=TicketStatus.OPEN.value,
            user_id=user_id,
            team_id=team_id,
        )
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def get_tickets_by_user_or_team(
        db: AsyncSession,
        user_id: str,
        team_id: Optional[str] = None,
    ) -> List[SupportTicket]:
        """
        Fetch tickets created by user_id OR belonging to team_id (if team_id is not None).
        """
        conditions = [SupportTicket.user_id == user_id]
        if team_id:
            conditions.append(
                and_(SupportTicket.team_id.is_not(None), SupportTicket.team_id == team_id)
            )

        stmt = (
            select(SupportTicket)
            .where(or_(*conditions))
            .order_by(SupportTicket.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_all_tickets(
        db: AsyncSession,
        status: Optional[Union[TicketStatus, str]] = None,
        priority: Optional[Union[TicketPriority, str]] = None,
        category: Optional[str] = None,
        assigned_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SupportTicket]:
        """
        Filter tickets by status, priority, category, assigned_to with pagination.
        """
        stmt = select(SupportTicket)
        if status is not None:
            status_val = status.value if hasattr(status, "value") else str(status)
            stmt = stmt.where(SupportTicket.status == status_val)
        if priority is not None:
            priority_val = priority.value if hasattr(priority, "value") else str(priority)
            stmt = stmt.where(SupportTicket.priority == priority_val)
        if category is not None:
            stmt = stmt.where(SupportTicket.category == category)
        if assigned_to is not None:
            stmt = stmt.where(SupportTicket.assigned_to == assigned_to)

        stmt = stmt.order_by(SupportTicket.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        ticket_id: str,
    ) -> Optional[SupportTicket]:
        """
        Get a support ticket by its UUID primary key.
        """
        stmt = select(SupportTicket).where(SupportTicket.id == ticket_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_ticket(
        db: AsyncSession,
        db_obj: SupportTicket,
        obj_in: Union[TicketUpdate, dict],
    ) -> SupportTicket:
        """
        Update an existing support ticket and persist changes to the database.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                if hasattr(value, "value"):
                    value = value.value
                setattr(db_obj, field, value)

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


support_repo = SupportRepository()

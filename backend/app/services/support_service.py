from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.models.support import SupportTicket, TicketPriority, TicketStatus
from app.models.user import User
from app.repositories.support_repository import support_repo
from app.repositories.team_repo import team_repo
from app.schemas.support import TicketCreate, TicketUpdate


class SupportService:
    """
    Business service layer managing support tickets.
    """

    async def create_ticket(
        self,
        db: AsyncSession,
        current_user: User,
        payload: TicketCreate,
    ) -> SupportTicket:
        """
        Candidate creates a support ticket.
        Automatically queries TeamMember to find the user's team_id (if any).
        """
        membership = await team_repo.get_user_membership(db, str(current_user.id))
        team_id = str(membership.team_id) if membership and membership.team_id else None

        return await support_repo.create_ticket(
            db=db,
            obj_in=payload,
            user_id=str(current_user.id),
            team_id=team_id,
        )

    async def get_my_tickets(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> List[SupportTicket]:
        """
        Retrieve tickets belonging to the candidate or their team.
        """
        membership = await team_repo.get_user_membership(db, str(current_user.id))
        team_id = str(membership.team_id) if membership and membership.team_id else None

        return await support_repo.get_tickets_by_user_or_team(
            db=db,
            user_id=str(current_user.id),
            team_id=team_id,
        )

    async def list_all_tickets(
        self,
        db: AsyncSession,
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None,
        category: Optional[str] = None,
        assigned_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SupportTicket]:
        """
        Retrieve all tickets with optional filtering (for Mentor and Admin).
        """
        return await support_repo.list_all_tickets(
            db=db,
            status=status,
            priority=priority,
            category=category,
            assigned_to=assigned_to,
            skip=skip,
            limit=limit,
        )

    async def update_ticket(
        self,
        db: AsyncSession,
        ticket_id: str,
        payload: TicketUpdate,
        current_user: User,
    ) -> SupportTicket:
        """
        Mentor/Admin updates or responds to a ticket.
        Rules:
        - If ticket not found: raise NotFoundException(404, TICKET_NOT_FOUND)
        - If changing status to 'in_progress' and assigned_to is empty: auto-assign to current_user.id
        - If changing status to 'resolved' and response is missing/empty: raise ValidationException(422, MISSING_TICKET_RESPONSE)
        """
        ticket = await support_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise NotFoundException(
                message="Không tìm thấy ticket",
                error_code="TICKET_NOT_FOUND",
            )

        update_data = payload.model_dump(exclude_unset=True)

        if "status" in update_data and update_data["status"] is not None:
            status_val = (
                update_data["status"].value
                if hasattr(update_data["status"], "value")
                else str(update_data["status"])
            )

            # Auto-assign if transitioning to in_progress and assigned_to is empty
            if status_val == TicketStatus.IN_PROGRESS.value or status_val == "in_progress":
                assigned = update_data.get("assigned_to") or ticket.assigned_to
                if not assigned:
                    update_data["assigned_to"] = str(current_user.id)

            # Require response before resolving
            elif status_val == TicketStatus.RESOLVED.value or status_val == "resolved":
                response_content = (
                    update_data.get("response")
                    if "response" in update_data
                    else ticket.response
                )
                if not response_content or not str(response_content).strip():
                    raise ValidationException(
                        message="Vui lòng nhập nội dung phản hồi trước khi giải quyết ticket",
                        error_code="MISSING_TICKET_RESPONSE",
                    )

        return await support_repo.update_ticket(db, ticket, update_data)


support_service = SupportService()

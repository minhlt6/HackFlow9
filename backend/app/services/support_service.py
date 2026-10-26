from datetime import datetime, timezone
from uuid import uuid4
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.models.support import SupportTicket, TicketPriority, TicketStatus
from app.models.user import User, UserRole
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

    async def get_ticket_detail(
        self,
        db: AsyncSession,
        ticket_id: str,
        current_user: User,
    ) -> SupportTicket:
        """
        Retrieve a single ticket by ID with role-based access control.
        """
        ticket = await support_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise NotFoundException(
                message="Không tìm thấy ticket",
                error_code="TICKET_NOT_FOUND",
            )

        user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        if user_role == UserRole.CANDIDATE.value:
            membership = await team_repo.get_user_membership(db, str(current_user.id))
            team_id = str(membership.team_id) if membership and membership.team_id else None
            is_owner = str(ticket.user_id) == str(current_user.id)
            is_team_ticket = bool(team_id and ticket.team_id and str(ticket.team_id) == team_id)
            if not (is_owner or is_team_ticket):
                raise ForbiddenException(
                    message="Bạn không có quyền xem ticket của đội khác.",
                    error_code="FORBIDDEN_ROLE",
                )
        return ticket

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
        Mentor/Admin (or Candidate for close/reopen) updates or responds to a ticket.
        Supports both direct `status` updates (HF-40) and `action` transitions (SRS HF-37 / Frontend HF-47).
        """
        user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        action = (payload.action or "").strip().lower() if payload.action else None

        # Candidate can only perform close or reopen on their own/team ticket
        if user_role == UserRole.CANDIDATE.value:
            if action not in ("close", "reopen", "update_response"):
                raise ForbiddenException(
                    message="Truy cập trái phép. Chức năng yêu cầu vai trò: mentor, admin.",
                    error_code="FORBIDDEN_ROLE",
                )

        ticket = await support_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise NotFoundException(
                message="Không tìm thấy ticket",
                error_code="TICKET_NOT_FOUND",
            )

        if user_role == UserRole.CANDIDATE.value:
            membership = await team_repo.get_user_membership(db, str(current_user.id))
            team_id = str(membership.team_id) if membership and membership.team_id else None
            is_owner = str(ticket.user_id) == str(current_user.id)
            is_team_ticket = bool(team_id and ticket.team_id and str(ticket.team_id) == team_id)
            if not (is_owner or is_team_ticket):
                raise ForbiddenException(
                    message="Bạn không có quyền thao tác trên ticket này.",
                    error_code="FORBIDDEN_ROLE",
                )

        update_data = payload.model_dump(
            exclude_unset=True,
            exclude={"action", "note", "target_admin_id"},
        )

        if user_role == UserRole.CANDIDATE.value:
            # A candidate may send a message, never alter assignment, priority or mentor response.
            update_data = {}
        if action == "update_response":
            if ticket.status in (TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value):
                raise ConflictException(message="Ticket đã đóng hoặc giải quyết. Hãy mở lại trước khi trao đổi.", error_code="INVALID_TICKET_TRANSITION")
            if not payload.response or not payload.response.strip():
                raise ValidationException(message="Nội dung trao đổi không được trống.", error_code="MISSING_TICKET_RESPONSE")
        if payload.response and action in ("update_response", "resolve"):
            update_data["messages"] = [*(ticket.messages or []), {
                "id": str(uuid4()), "senderId": str(current_user.id),
                "senderName": current_user.full_name, "senderRole": user_role,
                "content": payload.response.strip(), "sentAt": datetime.now(timezone.utc).isoformat(),
            }]

        # Map Frontend/SRS `action` to status & assignment transitions
        if action == "accept":
            if (
                user_role == UserRole.MENTOR.value
                and ticket.assigned_to
                and str(ticket.assigned_to) != str(current_user.id)
            ):
                raise ConflictException(
                    message="Ticket này đã được Mentor khác tiếp nhận xử lý.",
                    error_code="TICKET_ALREADY_ASSIGNED",
                )
            update_data["status"] = TicketStatus.IN_PROGRESS.value
            update_data["assigned_to"] = str(current_user.id)
        elif action == "resolve":
            update_data["status"] = TicketStatus.RESOLVED.value
        elif action == "update_response":
            if user_role != UserRole.CANDIDATE.value and ticket.status == TicketStatus.OPEN.value:
                update_data["status"] = TicketStatus.IN_PROGRESS.value
        elif action == "close":
            update_data["status"] = TicketStatus.CLOSED.value
        elif action == "reopen":
            update_data["status"] = TicketStatus.IN_PROGRESS.value
        elif action == "escalate":
            update_data["status"] = TicketStatus.IN_PROGRESS.value
            update_data["assigned_to"] = payload.target_admin_id or None

        if "status" in update_data and update_data["status"] is not None:
            status_val = (
                update_data["status"].value
                if hasattr(update_data["status"], "value")
                else str(update_data["status"])
            )

            # Auto-assign if transitioning to in_progress and assigned_to is empty (unless escalating to admin queue)
            if (status_val == TicketStatus.IN_PROGRESS.value or status_val == "in_progress") and action != "escalate":
                assigned = update_data.get("assigned_to") or ticket.assigned_to
                if not assigned and user_role in (UserRole.MENTOR.value, UserRole.ADMIN.value):
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

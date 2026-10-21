from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_approved_candidate, require_roles
from app.core.database import get_db
from app.models.support import TicketPriority, TicketStatus
from app.models.user import User, UserRole
from app.schemas.response import ApiResponse, success_response
from app.schemas.support import TicketCreate, TicketResponse, TicketUpdate
from app.services.support_service import support_service

router = APIRouter()


@router.post(
    "",
    response_model=ApiResponse[TicketResponse],
    summary="Tạo ticket hỗ trợ kỹ thuật mới (Candidate)",
    status_code=201,
)
async def create_ticket(
    body: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_candidate),
) -> ApiResponse[TicketResponse]:
    """
    Thí sinh (Candidate) đã được phê duyệt tạo yêu cầu hỗ trợ kỹ thuật.
    Hệ thống tự động gắn team_id nếu thí sinh đã thuộc một đội thi.
    """
    ticket = await support_service.create_ticket(db, current_user, body)
    return success_response(
        data=TicketResponse.model_validate(ticket),
        message="Tạo ticket hỗ trợ thành công.",
        status_code=201,
    )


@router.get(
    "/me",
    response_model=ApiResponse[List[TicketResponse]],
    summary="Xem danh sách ticket của cá nhân / đội thi (Candidate)",
)
async def get_my_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE)),
) -> ApiResponse[List[TicketResponse]]:
    """
    Lấy danh sách các ticket do thí sinh tạo hoặc thuộc đội thi của thí sinh.
    """
    tickets = await support_service.get_my_tickets(db, current_user)
    return success_response(
        data=[TicketResponse.model_validate(t) for t in tickets],
        message=f"Lấy danh sách ticket thành công ({len(tickets)} ticket).",
    )


@router.get(
    "",
    response_model=ApiResponse[List[TicketResponse]],
    summary="Lọc danh sách toàn bộ ticket hỗ trợ (Mentor/Admin)",
)
async def list_all_tickets(
    status: Optional[TicketStatus] = Query(None, description="Lọc theo trạng thái ticket"),
    priority: Optional[TicketPriority] = Query(None, description="Lọc theo mức độ ưu tiên"),
    category: Optional[str] = Query(None, description="Lọc theo phân loại hỗ trợ"),
    assigned_to: Optional[str] = Query(None, description="Lọc theo ID người được phân công"),
    skip: int = Query(0, ge=0, description="Số bản ghi bỏ qua"),
    limit: int = Query(100, ge=1, le=100, description="Số bản ghi tối đa trả về"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_roles(UserRole.MENTOR, UserRole.ADMIN)),
) -> ApiResponse[List[TicketResponse]]:
    """
    Mentor và Admin xem và lọc danh sách toàn bộ ticket hỗ trợ.
    """
    tickets = await support_service.list_all_tickets(
        db=db,
        status=status,
        priority=priority,
        category=category,
        assigned_to=assigned_to,
        skip=skip,
        limit=limit,
    )
    return success_response(
        data=[TicketResponse.model_validate(t) for t in tickets],
        message=f"Lấy danh sách ticket thành công ({len(tickets)} ticket).",
    )


@router.get(
    "/{ticket_id}",
    response_model=ApiResponse[TicketResponse],
    summary="Xem chi tiết một ticket hỗ trợ (Candidate/Mentor/Admin)",
)
async def get_ticket_detail(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE, UserRole.MENTOR, UserRole.ADMIN)),
) -> ApiResponse[TicketResponse]:
    """
    Xem chi tiết một ticket hỗ trợ (Judge bị chặn 403 FORBIDDEN_ROLE, Candidate chỉ xem được ticket của mình/đội mình).
    """
    ticket = await support_service.get_ticket_detail(db, ticket_id, current_user)
    return success_response(
        data=TicketResponse.model_validate(ticket),
        message="Lấy chi tiết ticket thành công.",
    )


@router.patch(
    "/{ticket_id}",
    response_model=ApiResponse[TicketResponse],
    summary="Cập nhật / phản hồi ticket hỗ trợ (Mentor/Admin hoặc Candidate close/reopen)",
)
async def update_ticket(
    ticket_id: str,
    body: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MENTOR, UserRole.ADMIN, UserRole.CANDIDATE)),
) -> ApiResponse[TicketResponse]:
    """
    Mentor hoặc Admin cập nhật trạng thái, phân công, hoặc nhập nội dung phản hồi ticket.
    - Hỗ trợ cả truyền trực tiếp `status` (HF-40) lẫn truyền `action` (`accept`, `resolve`, `update_response`, `close`, `reopen`, `escalate` theo SRS HF-37 / Frontend HF-47).
    - Chuyển sang 'in_progress' và chưa có người xử lý -> Tự động gán cho Mentor/Admin hiện tại.
    - Chuyển sang 'resolved' -> Bắt buộc phải có nội dung phản hồi (response).
    """
    updated_ticket = await support_service.update_ticket(
        db=db,
        ticket_id=ticket_id,
        payload=body,
        current_user=current_user,
    )
    return success_response(
        data=TicketResponse.model_validate(updated_ticket),
        message="Cập nhật ticket thành công.",
    )

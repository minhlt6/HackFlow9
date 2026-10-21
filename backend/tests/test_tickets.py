import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.support import TicketPriority, TicketStatus
from app.models.team import Team, TeamMember, TeamMemberRole
from app.models.user import ApprovalStatus, User, UserRole
from tests.conftest import TestSessionLocal


async def create_user_with_token(
    db: AsyncSession,
    email: str,
    full_name: str,
    role: str = UserRole.CANDIDATE.value,
    approval_status: str = ApprovalStatus.APPROVED.value,
) -> tuple[User, str]:
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        approval_status=approval_status,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=str(user.id), claims={"role": user.role})
    return user, token


@pytest.mark.asyncio
async def test_candidate_create_ticket_without_team(client: AsyncClient):
    """Candidate without a team creates a ticket; team_id should be None."""
    async with TestSessionLocal() as session:
        _, token = await create_user_with_token(
            session, "solo@candidate.org", "Solo Candidate"
        )

    response = await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "   Lỗi kết nối WiFi phòng thi   ",
            "content": "   Không thể kết nối vào mạng WiFi tầng 3 hội trường   ",
            "category": "network",
            "priority": "high",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["title"] == "Lỗi kết nối WiFi phòng thi"
    assert body["data"]["content"] == "Không thể kết nối vào mạng WiFi tầng 3 hội trường"
    assert body["data"]["category"] == "network"
    assert body["data"]["priority"] == "high"
    assert body["data"]["status"] == "open"
    assert body["data"]["team_id"] is None


@pytest.mark.asyncio
async def test_candidate_create_ticket_with_team(client: AsyncClient):
    """Candidate with a team creates a ticket; team_id should be automatically attached."""
    async with TestSessionLocal() as session:
        user, token = await create_user_with_token(
            session, "team_leader@hackflow.dev", "Team Leader"
        )
        team = Team(
            team_name="CyberKnights",
            invite_code="CK1234",
            is_locked=False,
        )
        session.add(team)
        await session.commit()
        await session.refresh(team)

        member = TeamMember(
            team_id=team.id,
            user_id=user.id,
            role=TeamMemberRole.LEADER.value,
        )
        session.add(member)
        await session.commit()
        team_id = team.id

    response = await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Yêu cầu cấp thêm quota GPU",
            "content": "Đội thi cần thêm tài nguyên GPU chạy mô hình AI",
            "category": "infrastructure",
            "priority": "urgent",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["team_id"] == team_id


@pytest.mark.asyncio
async def test_unapproved_candidate_cannot_create_ticket(client: AsyncClient):
    """Pending candidate cannot create ticket (403 ACCOUNT_NOT_APPROVED)."""
    async with TestSessionLocal() as session:
        _, token = await create_user_with_token(
            session,
            "pending@candidate.org",
            "Pending Candidate",
            approval_status=ApprovalStatus.PENDING.value,
        )

    response = await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Cần hỗ trợ duyệt tài khoản",
            "content": "Tài khoản của tôi chưa được duyệt thi đấu",
        },
    )
    assert response.status_code == 403
    assert response.json()["error_code"] == "ACCOUNT_NOT_APPROVED"


@pytest.mark.asyncio
async def test_non_candidate_cannot_create_ticket(client: AsyncClient):
    """Mentor cannot create ticket on candidate endpoint (403 FORBIDDEN_ROLE)."""
    async with TestSessionLocal() as session:
        _, token = await create_user_with_token(
            session, "mentor@hackflow.dev", "Mentor User", role=UserRole.MENTOR.value
        )

    response = await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Cần hỗ trợ phòng thi",
            "content": "Nội dung yêu cầu hỗ trợ kỹ thuật chi tiết",
        },
    )
    assert response.status_code == 403
    assert response.json()["error_code"] == "FORBIDDEN_ROLE"


@pytest.mark.asyncio
async def test_validation_whitespace_stripping(client: AsyncClient):
    """Whitespace string failing min_length returns 422."""
    async with TestSessionLocal() as session:
        _, token = await create_user_with_token(
            session, "user1@candidate.org", "Candidate 1"
        )

    response = await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "      ",  # Only spaces -> stripped to "" -> min_length=5 fails
            "content": "Nội dung hợp lệ hơn 10 ký tự",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_my_tickets_includes_team_tickets(client: AsyncClient):
    """Teammate can view tickets belonging to their team."""
    async with TestSessionLocal() as session:
        # Create team
        team = Team(team_name="AIStars", invite_code="AI9999", is_locked=False)
        session.add(team)
        await session.commit()
        await session.refresh(team)

        # User A creates ticket
        user_a, token_a = await create_user_with_token(
            session, "usera@team.org", "User A"
        )
        session.add(TeamMember(team_id=team.id, user_id=user_a.id, role="leader"))
        await session.commit()

        # User B is in the same team
        user_b, token_b = await create_user_with_token(
            session, "userb@team.org", "User B"
        )
        session.add(TeamMember(team_id=team.id, user_id=user_b.id, role="member"))
        await session.commit()

    # User A creates ticket
    await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "title": "Lỗi cài đặt Docker container",
            "content": "Không thể kéo image từ registry được cấp",
        },
    )

    # User B views /tickets/me
    response = await client.get(
        "/api/v1/tickets/me",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["data"][0]["title"] == "Lỗi cài đặt Docker container"


@pytest.mark.asyncio
async def test_mentor_and_admin_list_and_update_ticket(client: AsyncClient):
    """Mentor can list tickets and update status/response with validation rules."""
    async with TestSessionLocal() as session:
        candidate, cand_token = await create_user_with_token(
            session, "cand@org.dev", "Cand Dev"
        )
        mentor, mentor_token = await create_user_with_token(
            session, "mentor@org.dev", "Mentor Dev", role=UserRole.MENTOR.value
        )
        mentor_id = mentor.id

    # Candidate creates ticket
    create_resp = await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {cand_token}"},
        json={
            "title": "Hỏi về cách dùng FastAPI background tasks",
            "content": "Cho em hỏi có được dùng background task trong bài thi không ạ",
        },
    )
    ticket_id = create_resp.json()["data"]["id"]

    # Mentor lists tickets
    list_resp = await client.get(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {mentor_token}"},
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 1

    # Candidate forbidden on /tickets list
    cand_list_resp = await client.get(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert cand_list_resp.status_code == 403

    # Mentor updates status to in_progress (auto-assigned to mentor)
    in_prog_resp = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {mentor_token}"},
        json={"status": "in_progress"},
    )
    assert in_prog_resp.status_code == 200
    assert in_prog_resp.json()["data"]["status"] == "in_progress"
    assert in_prog_resp.json()["data"]["assigned_to"] == mentor_id

    # Mentor tries to resolve without response -> 422 MISSING_TICKET_RESPONSE
    resolve_fail_resp = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {mentor_token}"},
        json={"status": "resolved", "response": "   "},
    )
    assert resolve_fail_resp.status_code == 422
    assert resolve_fail_resp.json()["error_code"] == "MISSING_TICKET_RESPONSE"

    # Mentor resolves with response -> 200 OK
    resolve_success_resp = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {mentor_token}"},
        json={
            "status": "resolved",
            "response": "Được phép sử dụng FastAPI background task bình thường nhé.",
        },
    )
    assert resolve_success_resp.status_code == 200
    assert resolve_success_resp.json()["data"]["status"] == "resolved"
    assert (
        resolve_success_resp.json()["data"]["response"]
        == "Được phép sử dụng FastAPI background task bình thường nhé."
    )

    # 404 for non-existent ticket
    not_found_resp = await client.patch(
        "/api/v1/tickets/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": f"Bearer {mentor_token}"},
        json={"status": "in_progress"},
    )
    assert not_found_resp.status_code == 404
    assert not_found_resp.json()["error_code"] == "TICKET_NOT_FOUND"


@pytest.mark.asyncio
async def test_ticket_detail_and_action_workflow(client: AsyncClient):
    """Test GET /tickets/{id} and action-based PATCH (accept, resolve, close) for Frontend HF-47 compatibility."""
    async with TestSessionLocal() as session:
        cand, cand_token = await create_user_with_token(
            session, "cand_action@org.dev", "Cand Action"
        )
        other_cand, other_cand_token = await create_user_with_token(
            session, "other_cand@org.dev", "Other Cand"
        )
        mentor, mentor_token = await create_user_with_token(
            session, "mentor_action@org.dev", "Mentor Action", role=UserRole.MENTOR.value
        )
        mentor_id = mentor.id

    create_resp = await client.post(
        "/api/v1/tickets",
        headers={"Authorization": f"Bearer {cand_token}"},
        json={
            "title": "Lỗi không truy cập được database",
            "content": "Connection refused khi kết nối PostgreSQL port 5432",
        },
    )
    ticket_id = create_resp.json()["data"]["id"]

    # Owner can view detail
    detail_resp = await client.get(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["data"]["id"] == ticket_id

    # Other candidate cannot view detail
    other_detail_resp = await client.get(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {other_cand_token}"},
    )
    assert other_detail_resp.status_code == 403

    # Candidate cannot call accept action
    cand_accept_resp = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {cand_token}"},
        json={"action": "accept"},
    )
    assert cand_accept_resp.status_code == 403

    # Mentor accepts via action="accept"
    accept_resp = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {mentor_token}"},
        json={"action": "accept"},
    )
    assert accept_resp.status_code == 200
    assert accept_resp.json()["data"]["status"] == "in_progress"
    assert accept_resp.json()["data"]["assigned_to"] == mentor_id

    # Mentor resolves via action="resolve"
    resolve_resp = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {mentor_token}"},
        json={"action": "resolve", "response": "Đã mở lại port 5432 trên firewall."},
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["data"]["status"] == "resolved"

    # Candidate closes their resolved ticket via action="close"
    close_resp = await client.patch(
        f"/api/v1/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {cand_token}"},
        json={"action": "close"},
    )
    assert close_resp.status_code == 200
    assert close_resp.json()["data"]["status"] == "closed"


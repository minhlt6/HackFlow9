import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.user import ApprovalStatus, User, UserRole


async def create_test_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    approval_status: str = ApprovalStatus.APPROVED.value,
    role: str = UserRole.CANDIDATE.value,
) -> tuple[User, str]:
    """Helper to persist a test user and generate an access token."""
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
async def test_create_team_success(client: AsyncClient):
    """
    Test creating a new team by an approved candidate.
    Verifies 201 Created, envelope structure, leader assignment, and invite code format.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, token = await create_test_user(session, "leader1@example.com", "Leader One")

    response = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token}"},
        json={"team_name": "CyberWarriors"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["team_name"] == "CyberWarriors"
    assert len(data["invite_code"]) == 6
    assert data["status"] == "INCOMPLETE"
    assert data["member_count"] == 1
    assert data["min_members"] == 3
    assert data["max_members"] == 5
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "leader"
    assert data["members"][0]["email"] == "leader1@example.com"


@pytest.mark.asyncio
async def test_create_team_duplicate_name(client: AsyncClient):
    """
    Test creating a team with a name that already exists returns 409 TEAM_NAME_TAKEN.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, token1 = await create_test_user(session, "u1@example.com", "User 1")
        _, token2 = await create_test_user(session, "u2@example.com", "User 2")

    res1 = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token1}"},
        json={"team_name": "DuplicateSquad"},
    )
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token2}"},
        json={"team_name": "DuplicateSquad"},
    )
    assert res2.status_code == 409
    body = res2.json()
    assert body["success"] is False
    assert body["error_code"] == "TEAM_NAME_TAKEN"


@pytest.mark.asyncio
async def test_create_team_already_in_team(client: AsyncClient):
    """
    Test user who already has a team cannot create a second team (409 ALREADY_IN_TEAM).
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, token = await create_test_user(session, "multi_creator@example.com", "Multi Creator")

    res1 = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token}"},
        json={"team_name": "FirstTeam"},
    )
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token}"},
        json={"team_name": "SecondTeam"},
    )
    assert res2.status_code == 409
    assert res2.json()["error_code"] == "ALREADY_IN_TEAM"


@pytest.mark.asyncio
async def test_create_team_unapproved_rejected(client: AsyncClient):
    """
    Test PENDING or REJECTED user is blocked with 403 ACCOUNT_NOT_APPROVED.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, pending_token = await create_test_user(
            session, "pending_u@example.com", "Pending User", approval_status=ApprovalStatus.PENDING.value
        )
        _, rejected_token = await create_test_user(
            session, "rejected_u@example.com", "Rejected User", approval_status=ApprovalStatus.REJECTED.value
        )

    res_p = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {pending_token}"},
        json={"team_name": "PendingTeam"},
    )
    assert res_p.status_code == 403
    assert res_p.json()["error_code"] == "ACCOUNT_NOT_APPROVED"

    res_r = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {rejected_token}"},
        json={"team_name": "RejectedTeam"},
    )
    assert res_r.status_code == 403
    assert res_r.json()["error_code"] == "ACCOUNT_NOT_APPROVED"


@pytest.mark.asyncio
async def test_join_team_success_and_valid_status(client: AsyncClient):
    """
    Test joining a team with invite code:
    - 2nd member joins -> status remains INCOMPLETE
    - 3rd member joins -> status transitions to VALID
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, leader_token = await create_test_user(session, "l@example.com", "Leader")
        _, m2_token = await create_test_user(session, "m2@example.com", "Member 2")
        _, m3_token = await create_test_user(session, "m3@example.com", "Member 3")

    # 1. Create team
    create_res = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {leader_token}"},
        json={"team_name": "GrowTeam"},
    )
    invite_code = create_res.json()["data"]["invite_code"]

    # 2. Member 2 joins
    join2_res = await client.post(
        "/api/v1/teams/join",
        headers={"Authorization": f"Bearer {m2_token}"},
        json={"invite_code": invite_code},
    )
    assert join2_res.status_code == 200
    assert join2_res.json()["data"]["member_count"] == 2
    assert join2_res.json()["data"]["status"] == "INCOMPLETE"

    # 3. Member 3 joins -> status should become VALID (3-5 members)
    join3_res = await client.post(
        "/api/v1/teams/join",
        headers={"Authorization": f"Bearer {m3_token}"},
        json={"invite_code": invite_code},
    )
    assert join3_res.status_code == 200
    assert join3_res.json()["data"]["member_count"] == 3
    assert join3_res.json()["data"]["status"] == "VALID"


@pytest.mark.asyncio
async def test_join_team_invalid_code(client: AsyncClient):
    """
    Test joining with non-existent invite code returns 400 INVITE_CODE_INVALID.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, token = await create_test_user(session, "joiner_bad@example.com", "Joiner Bad")

    res = await client.post(
        "/api/v1/teams/join",
        headers={"Authorization": f"Bearer {token}"},
        json={"invite_code": "NONEX1"},
    )
    assert res.status_code == 400
    assert res.json()["error_code"] == "INVITE_CODE_INVALID"


@pytest.mark.asyncio
async def test_join_team_max_capacity(client: AsyncClient):
    """
    Test team exceeding 5 members capacity returns 409 TEAM_FULL.
    """
    from tests.conftest import TestSessionLocal
    tokens = []
    async with TestSessionLocal() as session:
        for i in range(6):
            _, tok = await create_test_user(session, f"cap_u{i}@example.com", f"Cap User {i}")
            tokens.append(tok)

    # Leader creates team
    create_res = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {tokens[0]}"},
        json={"team_name": "CapacityTeam"},
    )
    code = create_res.json()["data"]["invite_code"]

    # Members 1 to 4 join (total 5 members)
    for i in range(1, 5):
        j_res = await client.post(
            "/api/v1/teams/join",
            headers={"Authorization": f"Bearer {tokens[i]}"},
            json={"invite_code": code},
        )
        assert j_res.status_code == 200

    # 6th member attempts to join -> 409 TEAM_FULL
    overflow_res = await client.post(
        "/api/v1/teams/join",
        headers={"Authorization": f"Bearer {tokens[5]}"},
        json={"invite_code": code},
    )
    assert overflow_res.status_code == 409
    assert overflow_res.json()["error_code"] == "TEAM_FULL"


@pytest.mark.asyncio
async def test_get_my_team(client: AsyncClient):
    """
    Test GET /api/v1/teams/me when in a team vs when not in a team.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, lonely_token = await create_test_user(session, "lonely@example.com", "Lonely User")
        _, leader_token = await create_test_user(session, "me_leader@example.com", "Me Leader")

    # Not in a team -> returns 200 with data=None
    res1 = await client.get(
        "/api/v1/teams/me",
        headers={"Authorization": f"Bearer {lonely_token}"},
    )
    assert res1.status_code == 200
    assert res1.json()["data"] is None

    # In a team -> returns team details
    create_res = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {leader_token}"},
        json={"team_name": "SoloSquad"},
    )
    team_id = create_res.json()["data"]["id"]

    res2 = await client.get(
        "/api/v1/teams/me",
        headers={"Authorization": f"Bearer {leader_token}"},
    )
    assert res2.status_code == 200
    assert res2.json()["data"]["team_name"] == "SoloSquad"

    # A different candidate cannot read the team's private details/invitation code.
    res3 = await client.get(
        f"/api/v1/teams/{team_id}",
        headers={"Authorization": f"Bearer {lonely_token}"},
    )
    assert res3.status_code == 403
    owner_detail = await client.get(f"/api/v1/teams/{team_id}", headers={"Authorization": f"Bearer {leader_token}"})
    assert owner_detail.status_code == 200
    assert owner_detail.json()["data"]["id"] == team_id


@pytest.mark.asyncio
async def test_create_team_validation_errors(client: AsyncClient):
    """
    Test validation errors on invalid team name length or format.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, token = await create_test_user(session, "val_user@example.com", "Val User")

    # Name too short
    res_short = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token}"},
        json={"team_name": "ab"},
    )
    assert res_short.status_code == 422

    # Name too long
    res_long = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token}"},
        json={"team_name": "x" * 55},
    )
    assert res_long.status_code == 422


@pytest.mark.asyncio
async def test_concurrent_join_requests(client: AsyncClient):
    """
    Test concurrent join requests to the same team.
    Ensures that when multiple users try to join simultaneously, capacity cannot exceed 5.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, leader_tok = await create_test_user(session, "c_leader@example.com", "Concurrent Leader")
        user_tokens = []
        for i in range(8):
            _, u_tok = await create_test_user(session, f"c_user{i}@example.com", f"Concurrent User {i}")
            user_tokens.append(u_tok)

    create_res = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {leader_tok}"},
        json={"team_name": "ConcurrentSquad"},
    )
    code = create_res.json()["data"]["invite_code"]

    async def do_join(tok: str):
        return await client.post(
            "/api/v1/teams/join",
            headers={"Authorization": f"Bearer {tok}"},
            json={"invite_code": code},
        )

    responses = await asyncio.gather(*(do_join(tok) for tok in user_tokens))
    statuses = [r.status_code for r in responses]

    # Exactly 4 users should succeed (leader + 4 members = 5), remaining 4 should fail with 409
    success_count = statuses.count(200)
    failed_count = statuses.count(409)

    assert success_count == 4
    assert failed_count == 4


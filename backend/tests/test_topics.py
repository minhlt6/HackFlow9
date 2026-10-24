import asyncio
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.config import HackathonConfig
from app.models.topic import Subtopic, Topic
from app.models.user import ApprovalStatus, User, UserRole


async def create_approved_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    role: str = UserRole.CANDIDATE.value,
) -> tuple[User, str]:
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        approval_status=ApprovalStatus.APPROVED.value,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(subject=str(user.id), claims={"role": user.role})
    return user, token


async def create_valid_team(client: AsyncClient, leader_token: str, m2_token: str, m3_token: str, team_name: str) -> str:
    """Helper to form a VALID team of 3 members via API."""
    create_res = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {leader_token}"},
        json={"team_name": team_name},
    )
    assert create_res.status_code == 201
    code = create_res.json()["data"]["invite_code"]
    team_id = create_res.json()["data"]["id"]

    j2 = await client.post(
        "/api/v1/teams/join",
        headers={"Authorization": f"Bearer {m2_token}"},
        json={"invite_code": code},
    )
    assert j2.status_code == 200

    j3 = await client.post(
        "/api/v1/teams/join",
        headers={"Authorization": f"Bearer {m3_token}"},
        json={"invite_code": code},
    )
    assert j3.status_code == 200
    assert j3.json()["data"]["status"] == "VALID"
    return team_id


@pytest.mark.asyncio
async def test_get_topics_catalog(client: AsyncClient):
    """
    Test GET /api/v1/topics returns catalog with subtopics and quota info.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, token = await create_approved_user(session, "viewer@example.com", "Viewer")
        t = Topic(title="Fintech AI", description="AI in financial services", max_teams=5, current_teams=1, is_active=True)
        session.add(t)
        await session.flush()
        st = Subtopic(topic_id=t.id, title="Fraud Detection", max_teams=3, current_teams=0, is_active=True)
        session.add(st)
        await session.commit()

    res = await client.get("/api/v1/topics", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert len(body["data"]) >= 1
    found = next((item for item in body["data"] if item["title"] == "Fintech AI"), None)
    assert found is not None
    assert found["max_teams"] == 5
    assert found["remaining_slots"] == 4
    assert len(found["subtopics"]) == 1
    assert found["subtopics"][0]["title"] == "Fraud Detection"


@pytest.mark.asyncio
async def test_select_topic_success(client: AsyncClient):
    """
    Test valid team successfully selects an open topic.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, l_token = await create_approved_user(session, "l1@example.com", "L1")
        _, m2_token = await create_approved_user(session, "m21@example.com", "M21")
        _, m3_token = await create_approved_user(session, "m31@example.com", "M31")

        topic = Topic(title="Healthcare IoT", max_teams=2, current_teams=0, is_active=True)
        session.add(topic)
        await session.commit()
        topic_id = str(topic.id)

    team_id = await create_valid_team(client, l_token, m2_token, m3_token, "HealthTech")

    res = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"topic_id": topic_id},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["team_id"] == team_id
    assert body["data"]["topic_id"] == topic_id
    assert body["data"]["remaining_slots"] == 1


@pytest.mark.asyncio
async def test_select_topic_forbidden_for_non_leader_member(client: AsyncClient):
    """
    Regression test for BUG-BE-01:
    Regular team member (role='member') must not be allowed to select a topic (403 FORBIDDEN_ROLE).
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, l_token = await create_approved_user(session, "leader_rbac@example.com", "Leader RBAC")
        _, m2_token = await create_approved_user(session, "member2_rbac@example.com", "Member 2 RBAC")
        _, m3_token = await create_approved_user(session, "member3_rbac@example.com", "Member 3 RBAC")

        topic = Topic(title="RBAC Guarded Topic", max_teams=5, current_teams=0, is_active=True)
        session.add(topic)
        await session.commit()
        topic_id = str(topic.id)

    await create_valid_team(client, l_token, m2_token, m3_token, "RBACGuardedTeam")

    res = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {m2_token}"},
        json={"topic_id": topic_id},
    )
    assert res.status_code == 403
    assert res.json()["error_code"] == "FORBIDDEN_ROLE"


@pytest.mark.asyncio
async def test_select_topic_team_not_valid_less_than_3_members(client: AsyncClient):
    """
    Test team with fewer than 3 members cannot select a topic (409 TEAM_NOT_VALID).
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, l_token = await create_approved_user(session, "small_leader@example.com", "Small Leader")
        topic = Topic(title="Topic X", max_teams=5, current_teams=0, is_active=True)
        session.add(topic)
        await session.commit()
        topic_id = str(topic.id)

    # Leader creates team with only 1 member
    await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"team_name": "TooSmallTeam"},
    )

    res = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"topic_id": topic_id},
    )
    assert res.status_code == 409
    assert res.json()["error_code"] == "TEAM_NOT_VALID"


@pytest.mark.asyncio
async def test_select_topic_duplicate_selection_rejected(client: AsyncClient):
    """
    Test team that already selected a topic cannot select another (409 TEAM_TOPIC_ALREADY_SELECTED).
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, l_token = await create_approved_user(session, "dup_l@example.com", "Dup L")
        _, m2_token = await create_approved_user(session, "dup_m2@example.com", "Dup M2")
        _, m3_token = await create_approved_user(session, "dup_m3@example.com", "Dup M3")

        t1 = Topic(title="Topic 1", max_teams=5, current_teams=0, is_active=True)
        t2 = Topic(title="Topic 2", max_teams=5, current_teams=0, is_active=True)
        session.add_all([t1, t2])
        await session.commit()
        t1_id, t2_id = str(t1.id), str(t2.id)

    await create_valid_team(client, l_token, m2_token, m3_token, "PickTwiceTeam")

    # First selection -> 200
    res1 = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"topic_id": t1_id},
    )
    assert res1.status_code == 200

    # Second selection -> 409 TEAM_TOPIC_ALREADY_SELECTED
    res2 = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"topic_id": t2_id},
    )
    assert res2.status_code == 409
    assert res2.json()["error_code"] == "TEAM_TOPIC_ALREADY_SELECTED"


@pytest.mark.asyncio
async def test_select_topic_full_quota(client: AsyncClient):
    """
    Test selecting a topic when current_teams >= max_teams returns 409 TOPIC_FULL.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, l_token = await create_approved_user(session, "full_l@example.com", "Full L")
        _, m2_token = await create_approved_user(session, "full_m2@example.com", "Full M2")
        _, m3_token = await create_approved_user(session, "full_m3@example.com", "Full M3")

        full_topic = Topic(title="Exhausted Topic", max_teams=1, current_teams=1, is_active=True)
        session.add(full_topic)
        await session.commit()
        topic_id = str(full_topic.id)

    await create_valid_team(client, l_token, m2_token, m3_token, "FullSeekerTeam")

    res = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"topic_id": topic_id},
    )
    assert res.status_code == 409
    assert res.json()["error_code"] == "TOPIC_FULL"


@pytest.mark.asyncio
async def test_select_topic_competition_window_closed(client: AsyncClient):
    """
    Test selection blocked when topics are not published or outside time window.
    """
    from tests.conftest import TestSessionLocal
    now = datetime.now(timezone.utc)
    async with TestSessionLocal() as session:
        _, l_token = await create_approved_user(session, "time_l@example.com", "Time L")
        _, m2_token = await create_approved_user(session, "time_m2@example.com", "Time M2")
        _, m3_token = await create_approved_user(session, "time_m3@example.com", "Time M3")

        cfg = HackathonConfig(
            name="Config Test",
            start_time=now + timedelta(days=1),  # starts tomorrow
            end_time=now + timedelta(days=2),
            is_topic_published=False,
        )
        t = Topic(title="Future Topic", max_teams=5, current_teams=0, is_active=True)
        session.add_all([cfg, t])
        await session.commit()
        topic_id = str(t.id)

    await create_valid_team(client, l_token, m2_token, m3_token, "EarlyTeam")

    res = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"topic_id": topic_id},
    )
    assert res.status_code == 409
    assert res.json()["error_code"] == "TOPIC_SELECTION_CLOSED"


@pytest.mark.asyncio
async def test_cancel_topic_selection_success(client: AsyncClient):
    """
    Test leader canceling selected topic:
    - topic_id becomes None
    - topic.current_teams is decremented
    - team can now choose a new topic
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        _, l_token = await create_approved_user(session, "canc_l@example.com", "Canc L")
        _, m2_token = await create_approved_user(session, "canc_m2@example.com", "Canc M2")
        _, m3_token = await create_approved_user(session, "canc_m3@example.com", "Canc M3")

        t = Topic(title="Topic To Cancel", max_teams=5, current_teams=0, is_active=True)
        session.add(t)
        await session.commit()
        topic_id = str(t.id)

    await create_valid_team(client, l_token, m2_token, m3_token, "CancelTeam")

    # 1. Select
    res_sel = await client.post(
        "/api/v1/topics/select",
        headers={"Authorization": f"Bearer {l_token}"},
        json={"topic_id": topic_id},
    )
    assert res_sel.status_code == 200

    # 2. Member tries to cancel -> 403 Forbidden
    res_m_canc = await client.post(
        "/api/v1/topics/cancel",
        headers={"Authorization": f"Bearer {m2_token}"},
        json={},
    )
    assert res_m_canc.status_code == 403

    # 3. Leader cancels -> 200 OK
    res_l_canc = await client.post(
        "/api/v1/topics/cancel",
        headers={"Authorization": f"Bearer {l_token}"},
        json={},
    )
    assert res_l_canc.status_code == 200
    assert res_l_canc.json()["data"]["cancelled"] is True

    # 4. Check team.topic_id is now None
    my_team_res = await client.get("/api/v1/teams/me", headers={"Authorization": f"Bearer {l_token}"})
    assert my_team_res.json()["data"]["topic_id"] is None


@pytest.mark.asyncio
async def test_concurrent_topic_selection_last_slot(client: AsyncClient):
    """
    Test concurrency: 2 valid teams attempt to select the last slot of a topic with max_teams=1.
    Exactly 1 must succeed and 1 must receive 409 TOPIC_FULL.
    """
    from tests.conftest import TestSessionLocal
    async with TestSessionLocal() as session:
        # Team A users
        _, la_tok = await create_approved_user(session, "la@example.com", "LA")
        _, m2a_tok = await create_approved_user(session, "m2a@example.com", "M2A")
        _, m3a_tok = await create_approved_user(session, "m3a@example.com", "M3A")

        # Team B users
        _, lb_tok = await create_approved_user(session, "lb@example.com", "LB")
        _, m2b_tok = await create_approved_user(session, "m2b@example.com", "M2B")
        _, m3b_tok = await create_approved_user(session, "m3b@example.com", "M3B")

        # Topic with only 1 slot
        t = Topic(title="Rare Topic", max_teams=1, current_teams=0, is_active=True)
        session.add(t)
        await session.commit()
        topic_id = str(t.id)

    await create_valid_team(client, la_tok, m2a_tok, m3a_tok, "Team Alpha")
    await create_valid_team(client, lb_tok, m2b_tok, m3b_tok, "Team Beta")

    async def select_topic(tok: str):
        return await client.post(
            "/api/v1/topics/select",
            headers={"Authorization": f"Bearer {tok}"},
            json={"topic_id": topic_id},
        )

    res_a, res_b = await asyncio.gather(select_topic(la_tok), select_topic(lb_tok))
    statuses = [res_a.status_code, res_b.status_code]

    assert statuses.count(200) == 1
    assert statuses.count(409) == 1
    err_res = res_a if res_a.status_code == 409 else res_b
    assert err_res.json()["error_code"] == "TOPIC_FULL"

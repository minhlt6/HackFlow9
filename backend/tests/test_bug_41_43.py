from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, func

from app.api.v1.endpoints.admin import _partition_team_sizes
from app.models.config import HackathonConfig
from app.models.user import User
from app.models.team import Team, TeamMember
from app.models.topic import Topic, Subtopic
from app.models.support import SupportTicket
from app.models.checkpoint import Checkpoint, Submission
from app.services.auth_service import AuthService


def headers(user):
    return {"Authorization": "Bearer " + AuthService.create_user_token(user)}


def test_partitions_maximize_valid_teams():
    for minimum, maximum in [(3, 5), (2, 4), (4, 4), (1, 3)]:
        for n in range(61):
            sizes = _partition_team_sizes(n, 5, minimum, maximum)
            assert len(sizes) == n // minimum
            assert all(minimum <= size <= maximum for size in sizes)
            assert sum(sizes) <= n
            assert sum(sizes) == min(n, len(sizes) * maximum)
    assert _partition_team_sizes(6, 5) == [3, 3]
    assert _partition_team_sizes(12, 5) == [3, 3, 3, 3]


@pytest.mark.asyncio
@pytest.mark.parametrize("n", [1, 6, 9])
async def test_auto_match_persists_valid_teams_and_quota(n, client, db_session):
    admin = User(email="admin41@example.com", full_name="Admin", role="admin", approval_status="approved")
    now = datetime.now(timezone.utc)
    db_session.add_all([admin, HackathonConfig(name="Demo", start_time=now-timedelta(days=1), end_time=now+timedelta(days=1), settings_data={"minTeamMembers": 3, "maxTeamMembers": 5})])
    topic = Topic(title="Limited", max_teams=1, current_teams=0)
    db_session.add(topic)
    await db_session.flush()
    sub = Subtopic(topic_id=topic.id, title="One slot", max_teams=1, current_teams=0)
    db_session.add(sub)
    for i in range(n):
        db_session.add(User(email=f"candidate41-{i}@example.com", full_name=f"Candidate {i}", role="candidate", approval_status="approved"))
    await db_session.commit()
    response = await client.post("/api/v1/admin/teams/auto-match", headers=headers(admin), json={"target_team_size": 5, "fill_incomplete_teams": False})
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["created_teams_count"] == n // 3
    assert data["remaining_candidates_count"] == (1 if n == 1 else 0)
    memberships = (await db_session.execute(select(TeamMember))).scalars().all()
    assert len({m.user_id for m in memberships}) == len(memberships) == (0 if n == 1 else n)
    teams = (await db_session.execute(select(Team))).scalars().all()
    assert all(3 <= sum(m.team_id == team.id for m in memberships) <= 5 for team in teams)
    assert sum(team.topic_id is not None for team in teams) == (0 if n == 1 else 1)
    await db_session.refresh(topic)
    await db_session.refresh(sub)
    assert topic.current_teams == sub.current_teams == (0 if n == 1 else 1)


@pytest.mark.asyncio
async def test_mentor_ticket_scope_and_auth_contract(client, db_session):
    mentor = User(email="mentor42@example.com", full_name="Mentor", role="mentor", approval_status="approved")
    candidate = User(email="candidate42@example.com", full_name="Candidate", role="candidate", approval_status="approved")
    other = User(email="other42@example.com", full_name="Other", role="mentor", approval_status="approved")
    db_session.add_all([mentor, candidate, other])
    await db_session.flush()
    for i, (status, assigned) in enumerate([("open", None), ("in_progress", mentor.id), ("in_progress", other.id)]):
        db_session.add(SupportTicket(user_id=candidate.id, title=f"Ticket {i}", content="Support request", status=status, assigned_to=assigned))
    await db_session.commit()
    assert (await client.get("/api/v1/tickets")).status_code == 401
    response = await client.get("/api/v1/tickets", headers=headers(mentor))
    assert response.status_code == 200
    items = response.json()["data"]
    assert len(items) == 2
    assert sum(t["status"] == "open" and not t["assigned_to"] for t in items) == 1
    assert all(t["assigned_to"] in (None, mentor.id) for t in items)


@pytest.mark.asyncio
async def test_checkpoint_and_submission_apis_preserve_pending_state(client, db_session):
    user = User(email="leader43@example.com", full_name="Leader", role="candidate", approval_status="approved")
    team = Team(team_name="Team 43", invite_code="TEAM43")
    db_session.add_all([user, team])
    await db_session.flush()
    db_session.add(TeamMember(team_id=team.id, user_id=user.id, role="leader"))
    now = datetime.now(timezone.utc)
    for i, status in enumerate(["submitted", "evaluated", None, "pending_sha_freeze"]):
        cp = Checkpoint(title=f"Checkpoint {i}", start_time=now+timedelta(days=1) if status is None else now-timedelta(days=1), deadline=now+timedelta(days=2), is_final_checkpoint=i == 3)
        db_session.add(cp)
        await db_session.flush()
        if status:
            db_session.add(Submission(team_id=team.id, checkpoint_id=cp.id, submitted_by=user.id, status=status))
    await db_session.commit()
    cps = (await client.get("/api/v1/checkpoints", headers=headers(user))).json()["data"]
    subs = (await client.get("/api/v1/submissions", headers=headers(user))).json()["data"]
    assert len(cps) == 4 and len(subs) == 3
    statuses = [cp["latest_submission"]["status"] for cp in cps if cp.get("latest_submission")]
    assert sorted(statuses) == sorted(s["status"] for s in subs)
    assert sum(s in ("submitted", "evaluated", "late") for s in statuses) == 2

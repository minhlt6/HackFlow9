from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models.user import User
from app.models.config import HackathonConfig
from app.models.team import Team, TeamMember
from app.models.topic import Topic, Subtopic
from app.models.checkpoint import Checkpoint, Submission
from app.models.evaluation import RubricCriteria, Evaluation
from app.services.auth_service import AuthService


def auth(user):
    return {"Authorization": "Bearer " + AuthService.create_user_token(user)}


async def setup_topic(db):
    now = datetime.now(timezone.utc)
    user = User(email="leader44@example.com", full_name="Leader", role="candidate", approval_status="approved")
    team = Team(team_name="Test 44", invite_code="TEST44")
    topic = Topic(title="Track", max_teams=5, current_teams=0)
    config = HackathonConfig(name="Test", start_time=now-timedelta(days=1), end_time=now+timedelta(days=1), is_topic_published=True)
    db.add_all([user, team, topic, config])
    await db.flush()
    db.add(TeamMember(team_id=team.id, user_id=user.id, role="leader"))
    for i in range(2):
        member = User(email=f"member44-{i}@example.com", full_name="Member", approval_status="approved")
        db.add(member)
        await db.flush()
        db.add(TeamMember(team_id=team.id, user_id=member.id, role="member"))
    sub = Subtopic(topic_id=topic.id, title="Closed branch", is_active=False)
    db.add(sub)
    await db.commit()
    return user, team, topic, sub, config


@pytest.mark.asyncio
@pytest.mark.parametrize("closed", ["future", "past", "unpublished", "inactive", "full"])
async def test_topic_availability_matches_write_gate(closed, client, db_session):
    user, team, topic, sub, cfg = await setup_topic(db_session)
    now = datetime.now(timezone.utc)
    sub.is_active = closed != "inactive"
    if closed == "future": cfg.start_time = now+timedelta(hours=1)
    if closed == "past": cfg.end_time = now-timedelta(hours=1)
    if closed == "unpublished": cfg.is_topic_published = False
    if closed == "full": topic.current_teams = topic.max_teams
    await db_session.commit()
    data = (await client.get("/api/v1/topics", headers=auth(user))).json()["data"][0]
    assert data["subtopics"][0]["can_select"] is False
    assert data["subtopics"][0]["unavailable_reason"]
    if closed != "inactive": assert data["can_select"] is False
    response = await client.post("/api/v1/topics/select", headers=auth(user), json={"topic_id": topic.id, "subtopic_id": sub.id})
    assert response.status_code == 409, response.text
    await db_session.refresh(team)
    assert team.topic_id is None


@pytest.mark.asyncio
async def test_rubric_read_lock_and_weight_precondition(client, db_session):
    leader, team, topic, sub, cfg = await setup_topic(db_session)
    judge = User(email="judge45@example.com", full_name="Judge", role="judge", approval_status="approved")
    admin = User(email="admin45@example.com", full_name="Admin", role="admin", approval_status="approved")
    now = datetime.now(timezone.utc)
    cp = Checkpoint(title="Final", start_time=now-timedelta(days=1), deadline=now+timedelta(days=1), is_final_checkpoint=True)
    criterion = RubricCriteria(title="Quality", weight=.8, max_score=10)
    db_session.add_all([judge, admin, cp, criterion])
    await db_session.flush()
    submission = Submission(team_id=team.id, checkpoint_id=cp.id, submitted_by=leader.id, status="submitted")
    db_session.add(submission)
    await db_session.commit()
    loaded = (await client.get("/api/v1/rubrics", headers=auth(admin))).json()["data"]
    assert loaded["is_locked"] is False and loaded["can_edit"] is True
    payload = {"submission_id": submission.id, "status": "submitted", "evaluations": [{"criteria_id": criterion.id, "score": 8}]}
    invalid = await client.post("/api/v1/evaluations", headers=auth(judge), json=payload)
    assert invalid.status_code == 400, invalid.text
    assert not (await db_session.execute(select(Evaluation))).scalars().all()
    criterion.weight = 1
    await db_session.commit()
    valid = await client.post("/api/v1/evaluations", headers=auth(judge), json=payload)
    assert valid.status_code in (200, 201), valid.text
    locked = (await client.get("/api/v1/rubrics", headers=auth(admin))).json()["data"]
    assert locked["is_locked"] is True and locked["can_edit"] is False and locked["lock_reason"]
    refused = await client.post("/api/v1/rubrics", headers=auth(admin), json={"criteria": [{"title":"Changed", "max_score":10, "weight":1}],"allow_override":True})
    assert refused.status_code == 409
    await db_session.refresh(criterion)
    assert criterion.title == "Quality"

"""Regression checks for the eight API integration audit findings."""
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import select
from tests.conftest import TestSessionLocal
from tests.test_teams import create_test_user
from app.models.team import Team, TeamMember
from app.models.checkpoint import Checkpoint, Submission
from app.models.support import SupportTicket
from app.models.evaluation import RubricCriteria, Evaluation
from app.models.topic import Subtopic
ADMIN={"Authorization":"Bearer mock-jwt-token-admin"}

async def staff(role, email):
    async with TestSessionLocal() as db:
        user, token=await create_test_user(db,email,role,role=role)
        return str(user.id), {"Authorization":f"Bearer {token}"}

async def submission_fixture():
    owner, owner_headers=await staff("candidate","owner@example.com")
    judge, judge_headers=await staff("judge","judge-audit@example.com")
    async with TestSessionLocal() as db:
        team=Team(team_name="Audit Team",invite_code="AUD123")
        db.add(team);await db.flush()
        db.add(TeamMember(team_id=team.id,user_id=owner,role="leader"))
        cp=Checkpoint(title="Final Audit",start_time=datetime.now(timezone.utc)-timedelta(days=1),deadline=datetime.now(timezone.utc)+timedelta(days=1),is_final_checkpoint=True)
        db.add(cp);await db.flush()
        sub=Submission(team_id=team.id,checkpoint_id=cp.id,submitted_by=owner,repo_url="https://github.com/audit/private-material",commit_sha="a"*40,status="submitted",submission_data={"slide_url":"https://example.com/internal"})
        db.add(sub);await db.commit()
        return team.id,sub.id,judge,judge_headers


@pytest.mark.asyncio
async def test_announcement_scope_and_pagination_contract(client):
    _, judge_headers=await staff("judge","judge-scope@example.com")
    created=(await client.post("/api/v1/announcements",headers=ADMIN,json={"title":"Judge only","content":"Private scope","target_audience":"judge"})).json()["data"]
    await client.put(f"/api/v1/announcements/{created['id']}",headers=ADMIN,json={"title":"Edited title"})
    loaded=await client.get("/api/v1/announcements",headers=judge_headers)
    assert loaded.json()["data"]["items"][0]["target_audience"]=="judge"
    _, candidate_headers=await staff("candidate","candidate-scope@example.com")
    assert (await client.get("/api/v1/announcements",headers=candidate_headers)).json()["data"]["items"]==[]

@pytest.mark.asyncio
async def test_mentor_assignment_round_trip_update_clear_and_validation(client):
    mid,_=await staff("mentor","mentor-topic@example.com")
    topic=(await client.post("/api/v1/topics",headers=ADMIN,json={"title":"Mentored topic"})).json()["data"]
    response=await client.post(f"/api/v1/topics/{topic['id']}/subtopics",headers=ADMIN,json={"title":"Mentored subtopic","mentor_id":mid})
    assert response.status_code in (200,201)
    sub=response.json()["data"]["subtopics"][0]
    sid=sub["id"]
    assert sub["mentor_id"]==mid and sub["mentor_name"]=="mentor"
    async with TestSessionLocal() as db:
        assert (await db.get(Subtopic,sid)).mentor_id==mid
    loaded=(await client.get("/api/v1/topics",headers=ADMIN)).json()["data"][0]["subtopics"][0]
    assert loaded["mentor_id"]==mid
    bad=await client.patch(f"/api/v1/topics/subtopics/{sid}",headers=ADMIN,json={"title":"Must rollback","mentor_id":"missing"})
    assert bad.status_code==400
    assert (await client.get("/api/v1/topics",headers=ADMIN)).json()["data"][0]["subtopics"][0]["title"]=="Mentored subtopic"
    cleared=await client.patch(f"/api/v1/topics/subtopics/{sid}",headers=ADMIN,json={"mentor_id":None})
    assert cleared.status_code==200 and cleared.json()["data"]["mentor_id"] is None
    assert (await client.get("/api/v1/topics",headers=ADMIN)).json()["data"][0]["subtopics"][0]["mentor_id"] is None
    legacy=await client.post(f"/api/v1/topics/{topic['id']}/subtopics",headers=ADMIN,json={"title":"No silent drop","mentorName":"text"})
    assert legacy.status_code==422
    reassigned=await client.patch(f"/api/v1/topics/subtopics/{sid}",headers=ADMIN,json={"mentor_id":mid})
    assert reassigned.status_code==200
    assert (await client.delete(f"/api/v1/admin/personnel/{mid}",headers=ADMIN)).status_code==200
    removed=(await client.get("/api/v1/topics",headers=ADMIN)).json()["data"][0]["subtopics"][0]
    assert removed["mentor_id"] is None and removed["mentor_name"] is None

@pytest.mark.asyncio
async def test_team_reads_require_auth_and_scope_sensitive_data(client):
    tid,_,_,judge_headers=await submission_fixture()
    _,foreign=await staff("candidate","foreign@example.com")
    _,mentor=await staff("mentor","mentor-read@example.com")
    assert (await client.get("/api/v1/teams")).status_code==401
    assert (await client.get(f"/api/v1/teams/{tid}")).status_code==401
    assert (await client.get("/api/v1/teams",headers=foreign)).json()["data"]==[]
    assert (await client.get(f"/api/v1/teams/{tid}",headers=foreign)).status_code==403
    assert (await client.get("/api/v1/teams",headers=judge_headers)).status_code==403
    assert (await client.get(f"/api/v1/teams/{tid}",headers=judge_headers)).status_code==403
    for route in ("/api/v1/teams", f"/api/v1/teams/{tid}"):
        data=(await client.get(route,headers=mentor)).json()["data"]
        row=data[0] if isinstance(data,list) else data
        assert row["invite_code"]=="" and row["members"][0]["email"]==""
    assert (await client.get("/api/v1/teams",headers=ADMIN)).json()["data"][0]["invite_code"]=="AUD123"

@pytest.mark.asyncio
async def test_mentor_progress_redacts_all_artifact_paths_and_history(client):
    _,sid,_,judge_headers=await submission_fixture()
    _,mentor=await staff("mentor","mentor-progress@example.com")
    async with TestSessionLocal() as db:
        sub=await db.get(Submission,sid)
        sub.version_history=[{"version":1,"repo_url":"https://github.com/history/secret","commit_sha":"b"*40,"submission_data":{"secret":"material"}}]
        await db.commit();cpid=sub.checkpoint_id
    for route in ("/api/v1/submissions",f"/api/v1/submissions/{sid}", f"/api/v1/checkpoints/{cpid}/submissions"):
        response=await client.get(route,headers=mentor)
        assert response.status_code==200
        rows=response.json()["data"]
        rows=rows if isinstance(rows,list) else [rows]
        for row in rows:
            assert row["repo_url"] is None and row["commit_sha"] is None
            assert row["submission_data"] is None and row["version_history"]==[]
            assert row["checkpoint_id"]==cpid and row["status"]=="submitted"
        assert (await client.get(route,headers=judge_headers)).status_code==403
    assert (await client.get("/api/v1/submissions/audit-logs",headers=mentor)).status_code==403
    original=(await client.get(f"/api/v1/submissions/{sid}",headers=ADMIN)).json()["data"]
    assert original["repo_url"]=="https://github.com/audit/private-material" and len(original["version_history"])==1

@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [
    {"action":"resolve","response":"Unauthorized answer"},
    {"action":"update_response","response":"Unauthorized message"},
    {"action":"close"}, {"action":"escalate"}, {"status":"resolved","response":"Bypass attempt"},
])
async def test_other_mentor_cannot_change_assigned_ticket(client,payload):
    owner,_=await staff("candidate","ticket-owner@example.com")
    mentor_a,_=await staff("mentor","mentor-a@example.com")
    _,mentor_b=await staff("mentor","mentor-b@example.com")
    async with TestSessionLocal() as db:
        ticket=SupportTicket(user_id=owner,assigned_to=mentor_a,title="Private assignment",content="Original content",status="in_progress")
        db.add(ticket);await db.commit();tid=ticket.id
    response=await client.patch(f"/api/v1/tickets/{tid}",headers=mentor_b,json=payload)
    assert response.status_code==403
    async with TestSessionLocal() as db:
        ticket=await db.get(SupportTicket,tid)
        assert ticket.status=="in_progress" and ticket.response is None and ticket.messages==[]
    assert (await client.get(f"/api/v1/tickets/{tid}",headers=mentor_b)).status_code==403
    assert (await client.get("/api/v1/tickets",headers=mentor_b)).json()["data"]==[]
    accepted=await client.patch(f"/api/v1/tickets/{tid}",headers=ADMIN,json={"action":"resolve","response":"Admin intervention"})
    assert accepted.status_code==200 and accepted.json()["data"]["resolved_at"] is not None

@pytest.mark.asyncio
@pytest.mark.parametrize("age,expected", [(47,200),(49,409),(72,409)])
async def test_candidate_reopen_uses_resolution_time_not_last_update(client,age,expected):
    owner,headers=await staff("candidate","reopen-owner@example.com")
    async with TestSessionLocal() as db:
        ticket=SupportTicket(user_id=owner,title="Resolved ticket",content="Resolution timestamp",status="resolved",response="Done",resolved_at=datetime.now(timezone.utc)-timedelta(hours=age))
        db.add(ticket);await db.commit();tid=ticket.id
    closed=await client.patch(f"/api/v1/tickets/{tid}",headers=headers,json={"action":"close"})
    assert closed.status_code==200
    assert closed.json()["data"]["resolved_at"] is not None
    response=await client.patch(f"/api/v1/tickets/{tid}",headers=headers,json={"action":"reopen"})
    assert response.status_code==expected
    if expected==409:
        assert response.json()["error_code"]=="REOPEN_WINDOW_EXPIRED"
        async with TestSessionLocal() as db:
            assert (await db.get(SupportTicket,tid)).status=="closed"
    else:
        assert response.json()["data"]["resolved_at"] is None

@pytest.mark.asyncio
async def test_legacy_resolution_without_timestamp_uses_last_update(client):
    owner,headers=await staff("candidate","legacy-owner@example.com")
    old=datetime.now(timezone.utc)-timedelta(hours=72)
    async with TestSessionLocal() as db:
        ticket=SupportTicket(user_id=owner,title="Legacy ticket",content="Legacy resolved record",status="resolved",response="Done",updated_at=old)
        db.add(ticket);await db.commit();tid=ticket.id
    closed=await client.patch(f"/api/v1/tickets/{tid}",headers=headers,json={"action":"close"})
    assert closed.status_code==200 and closed.json()["data"]["resolved_at"] is not None
    assert (await client.patch(f"/api/v1/tickets/{tid}",headers=headers,json={"action":"reopen"})).status_code==409

@pytest.mark.asyncio
@pytest.mark.parametrize("override",[False,True])
async def test_locked_rubric_never_changes_scores_even_with_override(client,override):
    _,sid,judge,_=await submission_fixture()
    async with TestSessionLocal() as db:
        criterion=RubricCriteria(title="Original",max_score=10,weight=1.0)
        db.add(criterion);await db.flush();cid=criterion.id
        evaluation=Evaluation(submission_id=sid,judge_id=judge,criteria_id=cid,score=8,status="submitted")
        db.add(evaluation);await db.commit();eid=evaluation.id
    response=await client.post("/api/v1/rubrics",headers=ADMIN,json={"criteria":[{"title":"Replacement","weight":1.0,"max_score":10}],"allow_override":override})
    assert response.status_code==409 and response.json()["error_code"]=="RUBRIC_LOCKED_BY_EVALUATIONS"
    async with TestSessionLocal() as db:
        row=await db.get(Evaluation,eid)
        assert row.score==8 and row.status=="submitted" and row.criteria_id==cid
        assert (await db.get(RubricCriteria,cid)).title=="Original"

@pytest.mark.asyncio
async def test_new_criteria_do_not_generate_draft_or_submitted_scores(client):
    _,sid,judge,_=await submission_fixture()
    async with TestSessionLocal() as db:
        criterion=RubricCriteria(title="Original",max_score=10,weight=1.0)
        db.add(criterion);await db.flush();cid=criterion.id
        evaluation=Evaluation(submission_id=sid,judge_id=judge,criteria_id=cid,score=8,status="draft")
        db.add(evaluation);await db.commit();eid=evaluation.id
    response=await client.post("/api/v1/rubrics",headers=ADMIN,json={"criteria":[{"id":cid,"title":"Original","weight":0.5,"max_score":10},{"title":"Added","weight":0.5,"max_score":10}]})
    assert response.status_code in (200,201)
    async with TestSessionLocal() as db:
        rows=(await db.execute(select(Evaluation))).scalars().all()
        assert len(rows)==1 and rows[0].id==eid and rows[0].score==8


@pytest.mark.asyncio
async def test_only_one_mentor_can_accept_the_same_ticket(client):
    import asyncio
    owner,_=await staff("candidate","claim-owner@example.com")
    _,first=await staff("mentor","claim-first@example.com")
    _,second=await staff("mentor","claim-second@example.com")
    async with TestSessionLocal() as db:
        ticket=SupportTicket(user_id=owner,title="Concurrent claim",content="Single assignee only",status="open")
        db.add(ticket);await db.commit();tid=ticket.id
    responses=await asyncio.gather(*[client.patch(f"/api/v1/tickets/{tid}",headers=h,json={"action":"accept"}) for h in (first,second)])
    assert sorted(r.status_code for r in responses)==[200,409]
    assert next(r for r in responses if r.status_code==409).json()["error_code"]=="TICKET_ALREADY_ASSIGNED"

@pytest.mark.asyncio
@pytest.mark.parametrize("role,active", [("candidate",True),("judge",True),("mentor",False)])
async def test_topic_rejects_nonmentor_or_inactive_assignment(client,role,active):
    from app.models.user import User
    uid,_=await staff(role,"invalid-assignment@example.com")
    if not active:
        async with TestSessionLocal() as db:
            user=await db.get(User,uid);user.is_active=False;await db.commit()
    topic=(await client.post("/api/v1/topics",headers=ADMIN,json={"title":"Validation topic"})).json()["data"]
    response=await client.post(f"/api/v1/topics/{topic['id']}/subtopics",headers=ADMIN,json={"title":"Must not persist","mentor_id":uid})
    assert response.status_code==400 and response.json()["error_code"]=="INVALID_MENTOR"
    async with TestSessionLocal() as db:
        assert (await db.execute(select(Subtopic))).scalars().all()==[]

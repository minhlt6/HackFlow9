from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, delete, func

from app.core.database import Base
from app.core.config import settings
from app.models.user import User
from app.models.team import Team
from app.models.config import HackathonConfig
from app.models.checkpoint import Submission, Checkpoint
from app.models.evaluation import Evaluation, RubricCriteria, JudgeAssignment
from app.services.auth_service import AuthService
from scripts.build_demo import build_dataset, demo_id


async def seed(db):
    rows, manifest = build_dataset('rehearsal', datetime.now(timezone.utc), 'Test-only-password!')
    for table in Base.metadata.sorted_tables:
        if rows[table.name]: await db.execute(table.insert(), rows[table.name])
    await db.commit()
    return manifest


async def headers(db, slug):
    user = await db.get(User, demo_id('user/' + slug))
    return {'Authorization': 'Bearer ' + AuthService.create_user_token(user)}


@pytest.mark.asyncio
@pytest.mark.parametrize('phase,allowed', [('registration',True),('team_formation',True),('hacking',False),('judging',False),('completed',False)])
async def test_cancel_policy_matches_phase_and_write_gate(phase, allowed, db_session, client):
    data = await seed(db_session)
    tid = data['teams']['cyber']['id']
    await db_session.execute(delete(Submission).where(Submission.team_id == tid))
    config = await db_session.get(HackathonConfig, demo_id('config'))
    config.settings_data = {**config.settings_data, 'status':phase}
    await db_session.commit()
    h = await headers(db_session, 'cyber.leader')
    policy = (await client.get('/api/v1/topics/cancellation-policy',headers=h)).json()['data']
    assert policy['can_cancel_topic'] is allowed
    before = (await db_session.get(Team,tid)).topic_id
    response = await client.post('/api/v1/topics/cancel',headers=h,json={})
    assert response.status_code == (200 if allowed else 409), response.text
    team = await db_session.get(Team,tid); await db_session.refresh(team)
    assert team.topic_id == (None if allowed else before)


@pytest.mark.asyncio
@pytest.mark.parametrize('slug', ['cyber','chain'])
async def test_submitted_or_locked_team_cannot_cancel_even_during_selection(slug, db_session, client):
    data = await seed(db_session)
    cfg = await db_session.get(HackathonConfig, demo_id('config'))
    cfg.settings_data = {**cfg.settings_data, 'status':'team_formation'}
    await db_session.commit()
    h = await headers(db_session,slug+'.leader')
    assert (await client.get('/api/v1/topics/cancellation-policy',headers=h)).json()['data']['can_cancel_topic'] is False
    assert (await client.post('/api/v1/topics/cancel',headers=h,json={})).status_code == 409
    team = await db_session.get(Team,data['teams'][slug]['id']); await db_session.refresh(team)
    assert team.topic_id


@pytest.mark.asyncio
@pytest.mark.parametrize('condition', ['invalid','pending_sha_freeze','sha_verification_failed','missing_sha','outside_window'])
async def test_final_eligibility_blocks_draft_and_submitted_scores(condition, db_session, client):
    data = await seed(db_session)
    sub = await db_session.get(Submission,data['final_submissions']['cyber'])
    sub.status = condition if condition in {'invalid','pending_sha_freeze','sha_verification_failed'} else 'submitted'
    sub.commit_sha = None if condition == 'missing_sha' else 'a'*40
    if condition == 'outside_window': sub.submitted_at = datetime.now(timezone.utc)+timedelta(days=10)
    await db_session.commit()
    h = await headers(db_session,'judge1')
    criteria = (await db_session.execute(select(RubricCriteria))).scalars().all()
    for status in ['draft','submitted']:
        response = await client.post('/api/v1/evaluations',headers=h,json={'submission_id':sub.id,'status':status,'evaluations':[{'criteria_id':c.id,'score':9} for c in criteria]})
        assert response.status_code == 409, response.text
    assert await db_session.scalar(select(func.count()).select_from(Evaluation)) == 0
    row = next(r for r in (await client.get('/api/v1/evaluations/submissions',headers=h)).json()['data']['submissions'] if r['submission_id'] == sub.id)
    assert row['can_evaluate'] is False and row['evaluation_block_reason']


@pytest.mark.asyncio
async def test_valid_submission_can_be_graded_after_deadline(db_session, client):
    data = await seed(db_session)
    sub = await db_session.get(Submission,data['final_submissions']['cyber'])
    cp = await db_session.get(Checkpoint,sub.checkpoint_id)
    now = datetime.now(timezone.utc)
    cp.start_time=now-timedelta(hours=5); cp.deadline=now-timedelta(hours=1)
    sub.submitted_at=now-timedelta(hours=2); sub.status='submitted'; sub.commit_sha='a'*40
    await db_session.commit()
    criteria = (await db_session.execute(select(RubricCriteria))).scalars().all()
    response=await client.post('/api/v1/evaluations',headers=await headers(db_session,'judge1'),json={'submission_id':sub.id,'status':'submitted','evaluations':[{'criteria_id':c.id,'score':9} for c in criteria]})
    assert response.status_code==200, response.text


@pytest.mark.asyncio
async def test_missing_final_is_never_created_and_progress_stays_in_scope(db_session,client,monkeypatch):
    data = await seed(db_session)
    tid=data['teams']['cyber']['id']; sid=data['final_submissions']['cyber']
    await db_session.execute(delete(Submission).where(Submission.id==sid))
    await db_session.execute(delete(JudgeAssignment).where(JudgeAssignment.judge_id==demo_id('user/judge1'),JudgeAssignment.team_id!=tid))
    cp=await db_session.get(Checkpoint,data['checkpoints']['future'])
    cp.start_time=datetime.now(timezone.utc)-timedelta(hours=3)
    db_session.add(Submission(team_id=tid,checkpoint_id=cp.id,status='submitted',repo_url='https://github.com/test/progress'))
    await db_session.commit()
    monkeypatch.setattr(settings,'ENABLE_DEMO_DATA',True)
    h=await headers(db_session,'judge1')
    response=await client.post('/api/v1/evaluations',headers=h,json={'team_id':tid,'status':'submitted','evaluations':[]})
    assert response.status_code==404
    assert await db_session.scalar(select(func.count()).select_from(Submission).where(Submission.team_id==tid,Submission.checkpoint_id==data['checkpoints']['final']))==0
    items=(await client.get('/api/v1/evaluations/submissions',headers=h)).json()['data']['submissions']
    assert len(items)==1 and items[0]['can_evaluate'] is False and items[0]['submission_id'] is None
    progress=items[0]['checkpoint_submissions']
    assert len(progress)==3 and all(p['checkpoint_title'] for p in progress)
    assert all('team_id' not in p and 'submitted_by' not in p and 'email' not in p for p in progress)
    assert (await client.get('/api/v1/submissions',headers=h)).status_code==403


@pytest.mark.asyncio
@pytest.mark.parametrize('code',['ABC123','NINECODE9','TWELVECODE12','ABCDEFGHIJKLMNO','ABCDEFGHIJKLMNOP'])
async def test_admin_create_and_join_share_invite_limits(code,db_session,client):
    await seed(db_session)
    admin=await headers(db_session,'admin')
    response=await client.post('/api/v1/admin/teams',headers=admin,json={'name':'Team '+code,'leader_email':'fresh'+code.lower()+'@example.com','invite_code':code})
    assert response.status_code in (200,201),response.text
    joined=await client.post('/api/v1/teams/join',headers=await headers(db_session,'join1'),json={'invite_code':' '+code.lower()+' '})
    assert joined.status_code==200,joined.text


@pytest.mark.asyncio
async def test_invalid_new_codes_rejected_but_existing_short_code_remains_usable(db_session,client):
    await seed(db_session)
    admin=await headers(db_session,'admin')
    for code in ['OLD4','A'*17,'BAD CODE']:
        response=await client.post('/api/v1/admin/teams',headers=admin,json={'name':'Bad code','leader_email':'no-change@example.com','inviteCode':code})
        assert response.status_code==422,response.text
    legacy=Team(team_name='Legacy code',invite_code='OLD4')
    db_session.add(legacy);await db_session.commit()
    assert (await client.post('/api/v1/teams/join',headers=await headers(db_session,'join1'),json={'invite_code':'old4'})).status_code==200


@pytest.mark.asyncio
async def test_inactive_users_are_visible_in_directory_but_not_matching_pool(db_session,client):
    await seed(db_session)
    h=await headers(db_session,'admin')
    all_users=(await client.get('/api/v1/admin/candidates/directory',headers=h)).json()['data']
    inactive=next(u for u in all_users if u['id']==demo_id('user/inactive'))
    assert inactive['is_active'] is False
    pool=(await client.get('/api/v1/admin/candidates/unassigned',headers=h)).json()['data']
    assert all(u['is_active'] is True and u['approval_status']=='approved' and not u['has_team'] for u in pool)

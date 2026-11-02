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


@pytest.mark.asyncio
async def test_group1_topic_quota_and_subtopic_deletion_constraints(db_session, client):
    from app.models.topic import Topic, Subtopic

    data = await seed(db_session)
    admin = await headers(db_session, 'admin')
    cyber_team = await db_session.get(Team, data['teams']['cyber']['id'])
    sub_id = str(cyber_team.subtopic_id)
    top_id = str(cyber_team.topic_id)

    # LOGIC-01: Cannot delete subtopic that has registered teams
    del_sub = await client.delete(f'/api/v1/topics/subtopics/{sub_id}', headers=admin)
    assert del_sub.status_code == 409
    assert del_sub.json()['error_code'] == 'TOPIC_IN_USE'

    # LOGIC-03: Cannot lower parent topic max_teams below current_teams
    top_obj = await db_session.get(Topic, top_id)
    top_obj.current_teams = 2
    await db_session.commit()
    bad_quota = await client.put(
        f'/api/v1/topics/{top_id}',
        headers=admin,
        json={'max_teams': 1},
    )
    assert bad_quota.status_code == 400
    assert bad_quota.json()['error_code'] == 'INVALID_QUOTA'

    # LOGIC-02: Admin creating a team with subtopic increments current_teams in DB
    sub_obj = await db_session.get(Subtopic, sub_id)
    sub_obj.max_teams = sub_obj.current_teams + 5
    top_obj.max_teams = top_obj.current_teams + 5
    await db_session.commit()
    before_sub = sub_obj.current_teams
    before_top = top_obj.current_teams

    created = await client.post(
        '/api/v1/admin/teams',
        headers=admin,
        json={
            'name': 'Quota Sync Team',
            'leader_email': 'quotasync.leader@example.com',
            'member_count': 3,
            'sub_topic_id': sub_id,
        },
    )
    assert created.status_code in (200, 201), created.text
    await db_session.refresh(sub_obj)
    await db_session.refresh(top_obj)
    assert sub_obj.current_teams == before_sub + 1
    assert top_obj.current_teams == before_top + 1


@pytest.mark.asyncio
async def test_group2_team_leave_decrements_topic_and_locked_or_rejected_guards(db_session, client):
    from app.models.topic import Topic, Subtopic

    data = await seed(db_session)
    admin = await headers(db_session, 'admin')
    cyber_id = data['teams']['cyber']['id']
    cyber_leader = await headers(db_session, 'cyber.leader')

    # LOGIC-04: Locked team blocks leader transfer; rejected team blocks description update
    cyber_team = await db_session.get(Team, cyber_id)
    other_member_id = demo_id('user/cyber.m2')
    cyber_team.is_locked = True
    await db_session.commit()
    transfer_locked = await client.patch(
        '/api/v1/teams/leader',
        headers=cyber_leader,
        json={'new_leader_id': other_member_id},
    )
    assert transfer_locked.status_code == 409
    assert transfer_locked.json()['error_code'] == 'TEAM_LOCKED'

    await client.patch(
        f'/api/v1/admin/teams/{cyber_id}/reject',
        headers=admin,
        json={'reason': 'Vi phạm quy chế'},
    )
    desc_rejected = await client.patch(
        '/api/v1/teams/me',
        headers=cyber_leader,
        json={'description': 'Thử sửa khi đã bị từ chối'},
    )
    assert desc_rejected.status_code == 403
    assert desc_rejected.json()['error_code'] == 'TEAM_REJECTED'

    # LOGIC-05: Sole member leaving team decrements topic/subtopic current_teams
    cfg = await db_session.get(HackathonConfig, demo_id('config'))
    cfg.settings_data = {**cfg.settings_data, 'status': 'registration', 'minTeamMembers': 1, 'minTeamSize': 1}
    solo_user = User(
        email='solo.leave@example.com',
        full_name='Solo Leader',
        role='candidate',
        approval_status='approved',
        is_active=True,
    )
    top = Topic(title='Solo Track', max_teams=5, current_teams=1, is_active=True)
    db_session.add_all([solo_user, top])
    await db_session.flush()
    sub = Subtopic(topic_id=top.id, title='Solo Sub', max_teams=5, current_teams=1, is_active=True)
    db_session.add(sub)
    await db_session.flush()
    solo_team = Team(
        team_name='Solo Leave Team',
        invite_code='SOLO99',
        topic_id=str(top.id),
        subtopic_id=str(sub.id),
        is_locked=False,
    )
    db_session.add(solo_team)
    await db_session.flush()
    from app.models.team import TeamMember
    db_session.add(TeamMember(team_id=str(solo_team.id), user_id=str(solo_user.id), role='leader'))
    await db_session.commit()

    solo_headers = {'Authorization': 'Bearer ' + AuthService.create_user_token(solo_user)}
    leave_res = await client.post('/api/v1/teams/leave', headers=solo_headers)
    assert leave_res.status_code == 200, leave_res.text
    await db_session.refresh(top)
    await db_session.refresh(sub)
    assert top.current_teams == 0
    assert sub.current_teams == 0


@pytest.mark.asyncio
async def test_group3_leaderboard_discrepancy_threshold_and_personnel_soft_delete(db_session, client):
    data = await seed(db_session)
    admin = await headers(db_session, 'admin')
    j1 = await headers(db_session, 'judge1')
    j2 = await headers(db_session, 'judge2')
    sub_id = data['final_submissions']['cyber']
    criteria = (await db_session.execute(select(RubricCriteria))).scalars().all()

    # Judge 1 submits 9/10 (90.0), Judge 2 saves draft 8/10 (80.0) -> spread when both submitted = 10.0
    await client.post(
        '/api/v1/evaluations',
        headers=j1,
        json={'submission_id': sub_id, 'status': 'submitted', 'evaluations': [{'criteria_id': c.id, 'score': 9} for c in criteria]},
    )
    await client.post(
        '/api/v1/evaluations',
        headers=j2,
        json={'submission_id': sub_id, 'status': 'draft', 'evaluations': [{'criteria_id': c.id, 'score': 8} for c in criteria]},
    )

    # LOGIC-08: Leaderboard includes draft judge in all_judge_scores while keeping judge_scores submitted-only
    lb_res = (await client.get('/api/v1/leaderboard', headers=admin)).json()['data']['leaderboard']
    cyber_entry = next(e for e in lb_res if e['submission_id'] == sub_id)
    assert len(cyber_entry['judge_scores']) == 1
    assert len(cyber_entry['all_judge_scores']) == 2

    # Submit Judge 2 (spread = 10.0) and set discrepancyThreshold = 5 in HackathonConfig
    await client.post(
        '/api/v1/evaluations',
        headers=j2,
        json={'submission_id': sub_id, 'status': 'submitted', 'evaluations': [{'criteria_id': c.id, 'score': 8} for c in criteria]},
    )
    await client.patch('/api/v1/admin/config', headers=admin, json={'discrepancyThreshold': 5})
    lb_res2 = (await client.get('/api/v1/leaderboard', headers=admin)).json()['data']['leaderboard']
    cyber_entry2 = next(e for e in lb_res2 if e['submission_id'] == sub_id)
    assert cyber_entry2['has_discrepancy'] is True

    # LOGIC-10: Deleting judge1 (who has evaluations) soft-deletes (is_active=False) and preserves Evaluations
    j1_id = demo_id('user/judge1')
    del_j1 = await client.delete(f'/api/v1/admin/personnel/{j1_id}', headers=admin)
    assert del_j1.status_code == 200
    j1_user = await db_session.get(User, j1_id)
    await db_session.refresh(j1_user)
    assert j1_user is not None and j1_user.is_active is False
    eval_cnt = await db_session.scalar(select(func.count()).select_from(Evaluation).where(Evaluation.judge_id == j1_id))
    assert eval_cnt > 0


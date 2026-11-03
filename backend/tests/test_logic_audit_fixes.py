from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.checkpoint import AuditLog, Checkpoint, Submission, SubmissionStatus
from app.models.evaluation import Evaluation
from app.models.support import SupportTicket, TicketStatus
from app.models.team import Team, TeamMember, TeamMemberRole
from app.models.topic import Subtopic, Topic
from app.models.user import ApprovalStatus, User, UserRole


async def _mk_user(
    db: AsyncSession,
    email: str,
    name: str,
    role: UserRole = UserRole.CANDIDATE,
) -> User:
    u = User(
        email=email,
        full_name=name,
        role=role.value,
        approval_status=ApprovalStatus.APPROVED.value,
        is_active=True,
    )
    db.add(u)
    await db.flush()
    await db.refresh(u)
    return u


def _hdr(user: User) -> dict:
    token = create_access_token(
        subject=str(user.id),
        claims={"role": user.role, "approval_status": user.approval_status},
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_3b_l09_l10_l13_publish_guards_ineligible_exclusion_and_published_freeze(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Verifies:
    - 3b & L13: Cannot publish leaderboard (via /admin/leaderboard/publish OR /admin/config) when 0 valid evaluations exist.
    - L09: Ineligible final submission (sha_verification_failed / empty SHA) is excluded from ranked leaderboard and tracked in ineligible_submissions.
    - L10: Unlocking or modifying evaluations while leaderboard is published is blocked with 409 RESULTS_PUBLISHED_LOCKED.
    """
    admin = await _mk_user(db_session, "admin_audit1@hackflow.tech", "Admin", UserRole.ADMIN)
    judge = await _mk_user(db_session, "judge_audit1@hackflow.tech", "Judge", UserRole.JUDGE)
    leader_valid = await _mk_user(db_session, "l_valid@hackflow.tech", "Leader Valid")
    leader_bad = await _mk_user(db_session, "l_bad@hackflow.tech", "Leader Bad")

    now = datetime.now(timezone.utc)
    cp1 = Checkpoint(
        title="CP1",
        start_time=now - timedelta(days=2),
        deadline=now + timedelta(days=1),
        is_active=True,
        is_final_checkpoint=False,
    )
    cp_final = Checkpoint(
        title="Final CP",
        start_time=now - timedelta(days=1),
        deadline=now + timedelta(days=1),
        is_active=True,
        is_final_checkpoint=True,
    )
    db_session.add_all([cp1, cp_final])
    await db_session.flush()

    team_valid = Team(team_name="ValidRankedTeam", invite_code="VAL12345", is_locked=True)
    team_bad = Team(team_name="BrokenShaTeam", invite_code="BAD12345", is_locked=True)
    db_session.add_all([team_valid, team_bad])
    await db_session.flush()

    db_session.add_all(
        [
            TeamMember(team_id=team_valid.id, user_id=leader_valid.id, role=TeamMemberRole.LEADER.value),
            TeamMember(team_id=team_bad.id, user_id=leader_bad.id, role=TeamMemberRole.LEADER.value),
        ]
    )

    sub_valid = Submission(
        team_id=team_valid.id,
        checkpoint_id=cp_final.id,
        submitted_by=leader_valid.id,
        repo_url="https://github.com/valid/repo",
        commit_sha="a" * 40,
        status=SubmissionStatus.SUBMITTED.value,
        submitted_at=now - timedelta(hours=2),
    )
    sub_bad = Submission(
        team_id=team_bad.id,
        checkpoint_id=cp_final.id,
        submitted_by=leader_bad.id,
        repo_url="https://github.com/bad/repo",
        commit_sha="",
        status="sha_verification_failed",
        submitted_at=now - timedelta(hours=1),
    )
    db_session.add_all([sub_valid, sub_bad])
    await db_session.commit()

    # 1. 3b & L13: Publish with 0 evaluations -> 409 NO_VALID_EVALUATIONS_TO_PUBLISH on both endpoints
    pub_empty = await client.patch(
        "/api/v1/admin/leaderboard/publish",
        headers=_hdr(admin),
        json={"is_result_published": True},
    )
    assert pub_empty.status_code == 409
    assert pub_empty.json()["error_code"] == "NO_VALID_EVALUATIONS_TO_PUBLISH"

    cfg_pub_empty = await client.patch(
        "/api/v1/admin/config",
        headers=_hdr(admin),
        json={"is_result_published": True},
    )
    assert cfg_pub_empty.status_code == 409
    assert cfg_pub_empty.json()["error_code"] == "NO_VALID_EVALUATIONS_TO_PUBLISH"

    # 2. L09: GET /api/v1/leaderboard excludes BrokenShaTeam from ranked leaderboard, lists it in ineligible_submissions
    lb_before = await client.get("/api/v1/leaderboard", headers=_hdr(admin))
    assert lb_before.status_code == 200
    lb_data = lb_before.json()["data"]
    ranked_teams = [r["team_name"] for r in lb_data["leaderboard"]]
    assert "ValidRankedTeam" in ranked_teams
    assert "BrokenShaTeam" not in ranked_teams
    ineligible_teams = [r["team_name"] for r in lb_data["ineligible_submissions"]]
    assert "BrokenShaTeam" in ineligible_teams

    # 3. Configure rubric and submit evaluation for ValidRankedTeam
    rubric_res = await client.post(
        "/api/v1/rubrics",
        headers=_hdr(admin),
        json={
            "name": "Audit Rubric",
            "criteria": [{"title": "Tech", "max_score": 10, "weight": 1.0, "is_required": True, "display_order": 1}],
        },
    )
    assert rubric_res.status_code == 201
    crit_id = rubric_res.json()["data"]["criteria"][0]["id"]

    eval_res = await client.post(
        "/api/v1/evaluations",
        headers=_hdr(judge),
        json={
            "submission_id": sub_valid.id,
            "status": "submitted",
            "evaluations": [{"criteria_id": crit_id, "score": 9.0}],
        },
    )
    assert eval_res.status_code == 200

    # 4. L13: Publish via /api/v1/admin/config now succeeds and writes AuditLog(action="LEADERBOARD_PUBLISHED")
    cfg_pub_ok = await client.patch(
        "/api/v1/admin/config",
        headers=_hdr(admin),
        json={"leaderboardPublished": True},
    )
    assert cfg_pub_ok.status_code == 200
    assert cfg_pub_ok.json()["data"]["is_result_published"] is True
    audit = (
        await db_session.execute(select(AuditLog).where(AuditLog.action == "LEADERBOARD_PUBLISHED"))
    ).scalar_one_or_none()
    assert audit is not None

    # 5. L10: Unlocking while published is blocked with 409 RESULTS_PUBLISHED_LOCKED
    unlock_while_pub = await client.patch(
        f"/api/v1/admin/evaluations/{sub_valid.id}/judges/{judge.id}/unlock",
        headers=_hdr(admin),
        json={"reason": "Try unlock while public"},
    )
    assert unlock_while_pub.status_code == 409
    assert unlock_while_pub.json()["error_code"] == "RESULTS_PUBLISHED_LOCKED"

    # Unpublish -> Unlock succeeds
    await client.patch(
        "/api/v1/admin/leaderboard/publish",
        headers=_hdr(admin),
        json={"is_result_published": False},
    )
    unlock_after_unpub = await client.patch(
        f"/api/v1/admin/evaluations/{sub_valid.id}/judges/{judge.id}/unlock",
        headers=_hdr(admin),
        json={"reason": "Unlock after unpublish"},
    )
    assert unlock_after_unpub.status_code == 200


@pytest.mark.asyncio
async def test_4_5_l11_topic_hierarchy_parent_quota_and_reject_approve_slot_lifecycle(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Verifies:
    - Item 5: Creating or updating a team with a subtopic enforces parent Topic.max_teams quota.
    - L11: Mismatched major_topic_id and sub_topic_id is rejected (400 TOPIC_SUBTOPIC_MISMATCH); switching to major_topic_id only detaches old subtopic.
    - Item 4: Rejecting a team releases Topic/Subtopic slots idempotently; re-approving re-acquires slots (or blocks with 409 TOPIC_FULL); deleting a rejected team does not double-decrement.
    """
    admin = await _mk_user(db_session, "admin_quota@hackflow.tech", "Admin", UserRole.ADMIN)

    top_a = Topic(title="Track A", max_teams=1, current_teams=0, is_active=True)
    top_b = Topic(title="Track B", max_teams=2, current_teams=0, is_active=True)
    db_session.add_all([top_a, top_b])
    await db_session.flush()

    sub_a1 = Subtopic(topic_id=top_a.id, title="Sub A1", max_teams=2, current_teams=0, is_active=True)
    sub_b1 = Subtopic(topic_id=top_b.id, title="Sub B1", max_teams=2, current_teams=0, is_active=True)
    db_session.add_all([sub_a1, sub_b1])
    await db_session.commit()

    # 1. L11: Create team with mismatched major_topic_id (top_b) and sub_topic_id (sub_a1) -> 400 TOPIC_SUBTOPIC_MISMATCH
    mismatch_create = await client.post(
        "/api/v1/admin/teams",
        headers=_hdr(admin),
        json={
            "name": "Mismatch Team",
            "leader_email": "mismatch@hackflow.tech",
            "member_count": 3,
            "major_topic_id": str(top_b.id),
            "sub_topic_id": str(sub_a1.id),
        },
    )
    assert mismatch_create.status_code == 400
    assert mismatch_create.json()["error_code"] == "TOPIC_SUBTOPIC_MISMATCH"

    # 2. Valid create on sub_a1 -> top_a.current_teams becomes 1 (reaching top_a.max_teams = 1), sub_a1.current_teams = 1
    create_t1 = await client.post(
        "/api/v1/admin/teams",
        headers=_hdr(admin),
        json={
            "name": "Team One A1",
            "leader_email": "t1@hackflow.tech",
            "member_count": 3,
            "sub_topic_id": str(sub_a1.id),
        },
    )
    assert create_t1.status_code == 201
    t1_id = create_t1.json()["data"]["id"]

    # 3. Item 5: Second team tries to register sub_a1 (sub_a1 has 1/2 slots, but parent top_a has 1/1 slots) -> 409 TOPIC_FULL
    create_t2_overflow = await client.post(
        "/api/v1/admin/teams",
        headers=_hdr(admin),
        json={
            "name": "Team Two Overflow",
            "leader_email": "t2@hackflow.tech",
            "member_count": 3,
            "sub_topic_id": str(sub_a1.id),
        },
    )
    assert create_t2_overflow.status_code == 409
    assert create_t2_overflow.json()["error_code"] == "TOPIC_FULL"

    # 4. Item 4: Reject Team One -> releases slot on top_a (0/1) and sub_a1 (0/2)
    rej1 = await client.patch(
        f"/api/v1/admin/teams/{t1_id}/reject",
        headers=_hdr(admin),
        json={"reason": "Hồ sơ không hợp lệ"},
    )
    assert rej1.status_code == 200
    await db_session.refresh(top_a)
    await db_session.refresh(sub_a1)
    assert top_a.current_teams == 0
    assert sub_a1.current_teams == 0

    # Rejecting Team One a second time does NOT double-decrement
    rej2 = await client.patch(
        f"/api/v1/admin/teams/{t1_id}/reject",
        headers=_hdr(admin),
        json={"reason": "Từ chối lần 2"},
    )
    assert rej2.status_code == 200
    await db_session.refresh(top_a)
    await db_session.refresh(sub_a1)
    assert top_a.current_teams == 0
    assert sub_a1.current_teams == 0

    # Re-approving Team One re-acquires slot on top_a (1/1) and sub_a1 (1/2)
    app1 = await client.patch(f"/api/v1/admin/teams/{t1_id}/approve", headers=_hdr(admin))
    assert app1.status_code == 200
    await db_session.refresh(top_a)
    await db_session.refresh(sub_a1)
    assert top_a.current_teams == 1
    assert sub_a1.current_teams == 1

    # 5. L11: Update Team One with only major_topic_id = top_b -> detaches sub_a1, decrements top_a & sub_a1, increments top_b
    upd_major_only = await client.put(
        f"/api/v1/admin/teams/{t1_id}",
        headers=_hdr(admin),
        json={"major_topic_id": str(top_b.id)},
    )
    assert upd_major_only.status_code == 200
    await db_session.refresh(top_a)
    await db_session.refresh(sub_a1)
    await db_session.refresh(top_b)
    assert top_a.current_teams == 0
    assert sub_a1.current_teams == 0
    assert top_b.current_teams == 1
    t1_row = await db_session.get(Team, t1_id)
    await db_session.refresh(t1_row)
    assert str(t1_row.topic_id) == str(top_b.id)
    assert t1_row.subtopic_id is None

    # Reject and then delete Team One -> top_b.current_teams goes to 0 and stays 0 on delete
    await client.patch(
        f"/api/v1/admin/teams/{t1_id}/reject",
        headers=_hdr(admin),
        json={"reason": "Loại đội"},
    )
    await db_session.refresh(top_b)
    assert top_b.current_teams == 0
    del_res = await client.delete(f"/api/v1/admin/teams/{t1_id}", headers=_hdr(admin))
    assert del_res.status_code == 200
    await db_session.refresh(top_b)
    assert top_b.current_teams == 0


@pytest.mark.asyncio
async def test_6_7_admin_team_checkpoint_progress_and_open_tickets_stat(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Verifies:
    - Item 6: GET /api/v1/admin/teams returns real checkpointsCompleted / totalCheckpoints from Submission and Checkpoint tables.
    - Item 7: GET /api/v1/admin/stats counts only 'open' and 'in_progress' tickets, excluding 'resolved' and 'closed'.
    """
    admin = await _mk_user(db_session, "admin_stat@hackflow.tech", "Admin", UserRole.ADMIN)
    leader = await _mk_user(db_session, "leader_stat@hackflow.tech", "Leader")

    now = datetime.now(timezone.utc)
    cps = [
        Checkpoint(
            title=f"CP {i}",
            display_order=i,
            start_time=now - timedelta(days=2),
            deadline=now + timedelta(days=2),
            is_active=True,
            is_final_checkpoint=(i == 4),
        )
        for i in range(1, 5)
    ]
    db_session.add_all(cps)
    await db_session.flush()

    team = Team(team_name="ProgressTeam", invite_code="PRG12345", is_locked=True)
    db_session.add(team)
    await db_session.flush()
    db_session.add(TeamMember(team_id=team.id, user_id=leader.id, role=TeamMemberRole.LEADER.value))

    # Submit 2 valid checkpoints and 1 invalid submission
    db_session.add_all(
        [
            Submission(
                team_id=team.id,
                checkpoint_id=cps[0].id,
                submitted_by=leader.id,
                repo_url="https://github.com/prg/cp1",
                status=SubmissionStatus.SUBMITTED.value,
                submitted_at=now - timedelta(hours=3),
            ),
            Submission(
                team_id=team.id,
                checkpoint_id=cps[1].id,
                submitted_by=leader.id,
                repo_url="https://github.com/prg/cp2",
                status=SubmissionStatus.LATE.value,
                submitted_at=now - timedelta(hours=2),
            ),
            Submission(
                team_id=team.id,
                checkpoint_id=cps[2].id,
                submitted_by=leader.id,
                repo_url="https://github.com/prg/cp3",
                status="sha_verification_failed",
                submitted_at=now - timedelta(hours=1),
            ),
        ]
    )

    # Seed 4 tickets: open, in_progress, resolved, closed
    for idx, st in enumerate(
        [
            TicketStatus.OPEN.value,
            TicketStatus.IN_PROGRESS.value,
            TicketStatus.RESOLVED.value,
            TicketStatus.CLOSED.value,
        ]
    ):
        db_session.add(
            SupportTicket(
                team_id=team.id,
                user_id=leader.id,
                title=f"Ticket {idx}",
                content="Help",
                status=st,
            )
        )
    await db_session.commit()

    # Check Item 6: 2 completed out of 4 total checkpoints
    teams_res = await client.get("/api/v1/admin/teams", headers=_hdr(admin))
    assert teams_res.status_code == 200
    t_item = next(t for t in teams_res.json()["data"] if t["id"] == str(team.id))
    assert t_item["checkpointsCompleted"] == 2
    assert t_item["totalCheckpoints"] == 4

    # Check Item 7: only 'open' and 'in_progress' counted (2, not 3)
    stats_res = await client.get("/api/v1/admin/stats", headers=_hdr(admin))
    assert stats_res.status_code == 200
    assert stats_res.json()["data"]["open_tickets"] == 2

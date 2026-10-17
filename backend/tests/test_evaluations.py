from datetime import datetime, timedelta, timezone
import re
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.checkpoint import AuditLog, Checkpoint, Submission, SubmissionStatus
from app.models.evaluation import Evaluation
from app.models.team import Team, TeamMember, TeamMemberRole
from app.models.topic import Subtopic, Topic
from app.models.user import ApprovalStatus, User, UserRole
from app.services.evaluation_service import (
    calculate_weighted_score,
    generate_anonymous_team_code,
)


async def _create_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    role: UserRole,
    approval_status: ApprovalStatus = ApprovalStatus.APPROVED,
) -> User:
    user = User(
        email=email,
        full_name=full_name,
        role=role.value,
        approval_status=approval_status.value,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


def _auth_headers(user: User) -> dict:
    token = create_access_token(
        subject=str(user.id),
        claims={
            "role": user.role,
            "approval_status": user.approval_status,
        },
    )
    return {"Authorization": f"Bearer {token}"}


async def _seed_final_submission(db: AsyncSession, leader: User, team_name: str = "Secret AlphaNova") -> Submission:
    topic = Topic(title=f"AI Healthcare Track ({team_name})", description="AI in Medicine", is_active=True)
    db.add(topic)
    await db.flush()

    subtopic = Subtopic(
        topic_id=topic.id,
        title="Automated Medical Imaging Triage",
        description="Deep learning triage",
        max_teams=5,
        current_teams=1,
        is_active=True,
    )
    db.add(subtopic)
    await db.flush()

    team = Team(
        team_name=team_name,
        invite_code=f"INV-{leader.id[:6].upper()}",
        topic_id=topic.id,
        subtopic_id=subtopic.id,
        is_locked=True,
    )
    db.add(team)
    await db.flush()

    member = TeamMember(
        team_id=team.id,
        user_id=leader.id,
        role=TeamMemberRole.LEADER.value,
    )
    db.add(member)

    now = datetime.now(timezone.utc)
    cp_non_final = Checkpoint(
        title="Checkpoint 1 - Idea Proposal",
        description="Non-final checkpoint",
        start_time=now - timedelta(days=2),
        deadline=now + timedelta(days=1),
        is_active=True,
        is_final_checkpoint=False,
        grace_period_seconds=5,
    )
    cp_final = Checkpoint(
        title="Checkpoint 2 - Final Code Freeze",
        description="Final checkpoint",
        start_time=now - timedelta(days=1),
        deadline=now + timedelta(days=1),
        is_active=True,
        is_final_checkpoint=True,
        grace_period_seconds=5,
    )
    db.add_all([cp_non_final, cp_final])
    await db.flush()

    sub_non_final = Submission(
        team_id=team.id,
        checkpoint_id=cp_non_final.id,
        submitted_by=leader.id,
        repo_url="https://github.com/alphanova/draft-idea",
        status=SubmissionStatus.SUBMITTED.value,
        submitted_at=now - timedelta(hours=5),
    )
    sub_final = Submission(
        team_id=team.id,
        checkpoint_id=cp_final.id,
        submitted_by=leader.id,
        repo_url="https://github.com/alphanova/med-triage-ai",
        demo_url="https://demo.alphanova.tech",
        commit_sha="8f9a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2",
        submission_data={
            "repo_url": "https://github.com/alphanova/med-triage-ai",
            "demo_url": "https://demo.alphanova.tech",
            "slide_url": "https://slides.alphanova.tech/pitch.pdf",
        },
        note="Full end-to-end medical triage prototype with TensorRT inference.",
        status=SubmissionStatus.SUBMITTED.value,
        submitted_at=now - timedelta(hours=1),
    )
    db.add_all([sub_non_final, sub_final])
    await db.commit()
    await db.refresh(sub_final)
    return sub_final


@pytest.mark.asyncio
async def test_unit_anonymous_team_code_and_weighted_score_formula():
    """Step 2 unit checks: deterministic SHA-256 anonymous team code and 100-point weighted score."""
    code1 = generate_anonymous_team_code("team-uuid-12345")
    code2 = generate_anonymous_team_code("team-uuid-12345")
    code_other = generate_anonymous_team_code("team-uuid-99999")

    assert code1 == code2
    assert re.match(r"^Team #[0-9A-F]{4}$", code1)
    assert code1 != code_other

    # S_{j,s} = (8/10 * 0.4 + 9/10 * 0.6) * 100 = (0.32 + 0.54) * 100 = 86.0
    score = calculate_weighted_score([(8.0, 10.0, 0.4), (9.0, 10.0, 0.6)])
    assert score == 86.0


@pytest.mark.asyncio
async def test_rubric_crud_and_weight_validation(
    client: AsyncClient, db_session: AsyncSession
):
    """Step 3 / UAT-S4-01 & UAT-S4-02: GET & POST /api/v1/rubrics and weight = 1.00 validation."""
    admin = await _create_user(db_session, "admin_rubric@hackflow.tech", "Admin BTC", UserRole.ADMIN)
    judge = await _create_user(db_session, "judge_rubric@hackflow.tech", "Judge One", UserRole.JUDGE)
    await db_session.commit()

    # 1. Non-admin cannot configure rubrics (403 FORBIDDEN)
    res_forbidden = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(judge),
        json={
            "name": "Unauthorized Rubric",
            "criteria": [{"title": "Tech", "max_score": 10, "weight": 1.0}],
        },
    )
    assert res_forbidden.status_code == 403

    # 2. Invalid total weight != 1.00 -> 400 CRITERIA_WEIGHT_INVALID
    res_bad_weight = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(admin),
        json={
            "name": "Invalid Weight Rubric",
            "criteria": [
                {"title": "Technical", "max_score": 10, "weight": 0.4, "display_order": 1},
                {"title": "Innovation", "max_score": 10, "weight": 0.4, "display_order": 2},
            ],
        },
    )
    assert res_bad_weight.status_code == 400
    assert res_bad_weight.json()["error_code"] == "CRITERIA_WEIGHT_INVALID"

    # 3. Invalid max_score <= 0 -> 400 CRITERIA_WEIGHT_INVALID
    res_bad_max = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(admin),
        json={
            "name": "Bad Max Score Rubric",
            "criteria": [
                {"title": "Technical", "max_score": 0, "weight": 1.0, "display_order": 1},
            ],
        },
    )
    assert res_bad_max.status_code == 400
    assert res_bad_max.json()["error_code"] == "CRITERIA_WEIGHT_INVALID"

    # 4. Valid rubric with total weight == 1.00 -> 201 Created
    res_ok = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(admin),
        json={
            "name": "HackFlow 2026 Official Rubric",
            "criteria": [
                {
                    "title": "Presentation & Impact",
                    "description": "Pitch clarity and real-world impact",
                    "max_score": 10,
                    "weight": 0.25,
                    "is_required": True,
                    "display_order": 3,
                },
                {
                    "title": "Technical Implementation",
                    "description": "Architecture, code quality, performance",
                    "max_score": 20,
                    "weight": 0.40,
                    "is_required": True,
                    "display_order": 1,
                },
                {
                    "title": "Innovation & Creativity",
                    "description": "Originality of approach",
                    "max_score": 10,
                    "weight": 0.35,
                    "is_required": True,
                    "display_order": 2,
                },
            ],
        },
    )
    assert res_ok.status_code == 201
    body_ok = res_ok.json()
    assert body_ok["success"] is True
    assert body_ok["data"]["total_weight"] == 1.0
    assert len(body_ok["data"]["criteria"]) == 3
    # Sorted by display_order (1, 2, 3)
    assert [c["display_order"] for c in body_ok["data"]["criteria"]] == [1, 2, 3]
    assert body_ok["data"]["criteria"][0]["title"] == "Technical Implementation"

    # 5. GET /api/v1/rubrics by Judge returns sorted criteria + total_weight
    res_get = await client.get("/api/v1/rubrics", headers=_auth_headers(judge))
    assert res_get.status_code == 200
    get_data = res_get.json()["data"]
    assert get_data["total_weight"] == 1.0
    assert len(get_data["criteria"]) == 3
    assert len(get_data["rubrics"]) == 1
    assert get_data["rubrics"][0]["total_weight"] == 1.0


@pytest.mark.asyncio
async def test_blind_judging_submissions_and_evaluation_lifecycle(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Step 4 / UAT-S4-03, UAT-S4-04, UAT-S4-05, UAT-S4-06:
    - Blind Judging hides team_id and team_name, filters only Final Checkpoint submissions.
    - Supports draft saving, validates 422 SCORE_OUT_OF_RANGE & 422 MISSING_RUBRIC_CRITERIA_SCORE.
    - Locks evaluation on status='submitted' and rejects edits with 409 EVALUATION_ALREADY_LOCKED.
    - Isolates Judge A's scores from Judge B; blocks Mentor and Candidate with 403 FORBIDDEN.
    """
    admin = await _create_user(db_session, "admin_eval@hackflow.tech", "Admin BTC", UserRole.ADMIN)
    judge_a = await _create_user(db_session, "judge_a@hackflow.tech", "Judge Alpha", UserRole.JUDGE)
    judge_b = await _create_user(db_session, "judge_b@hackflow.tech", "Judge Beta", UserRole.JUDGE)
    mentor = await _create_user(db_session, "mentor_eval@hackflow.tech", "Mentor One", UserRole.MENTOR)
    leader = await _create_user(db_session, "leader_eval@hackflow.tech", "Leader One", UserRole.CANDIDATE)

    sub_final = await _seed_final_submission(db_session, leader, team_name="SuperSecretTeamName")

    # Configure rubric (2 required criteria + 1 optional criterion)
    res_rubric = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(admin),
        json={
            "name": "HackFlow Final Rubric",
            "criteria": [
                {
                    "title": "Technical Implementation",
                    "max_score": 10,
                    "weight": 0.4,
                    "is_required": True,
                    "display_order": 1,
                },
                {
                    "title": "Innovation",
                    "max_score": 10,
                    "weight": 0.5,
                    "is_required": True,
                    "display_order": 2,
                },
                {
                    "title": "Bonus Polish",
                    "max_score": 10,
                    "weight": 0.1,
                    "is_required": False,
                    "display_order": 3,
                },
            ],
        },
    )
    assert res_rubric.status_code == 201
    criteria = res_rubric.json()["data"]["criteria"]
    c1_id, c2_id, c3_id = criteria[0]["id"], criteria[1]["id"], criteria[2]["id"]

    # 1. Mentor & Candidate are blocked with 403 FORBIDDEN on GET /api/v1/evaluations/submissions
    res_mentor_get = await client.get(
        "/api/v1/evaluations/submissions", headers=_auth_headers(mentor)
    )
    assert res_mentor_get.status_code == 403

    res_cand_get = await client.get(
        "/api/v1/evaluations/submissions", headers=_auth_headers(leader)
    )
    assert res_cand_get.status_code == 403

    # 2. Judge A fetches Blind Judging submissions -> only Final Checkpoint submission is returned,
    #    anonymous_team_code is "Team #XXXX", and team_id / team_name are strictly absent!
    res_blind = await client.get(
        "/api/v1/evaluations/submissions", headers=_auth_headers(judge_a)
    )
    assert res_blind.status_code == 200
    raw_text = res_blind.text
    assert "SuperSecretTeamName" not in raw_text
    assert sub_final.team_id not in raw_text

    subs = res_blind.json()["data"]["submissions"]
    assert len(subs) == 1
    item = subs[0]
    assert item["submission_id"] == sub_final.id
    assert re.match(r"^Team #[0-9A-F]{4}$", item["anonymous_team_code"])
    assert "team_id" not in item
    assert "team_name" not in item
    assert item["topic_title"] == "Automated Medical Imaging Triage"
    assert item["commit_sha"] == "8f9a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2"
    assert item["evaluation_status"] == "not_started"
    assert item["my_total_score"] is None

    # 3. Judge A saves partial draft (only c1 scored) -> 200 OK
    res_draft = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_a),
        json={
            "submission_id": sub_final.id,
            "status": "draft",
            "evaluations": [
                {"criteria_id": c1_id, "score": 8.5, "comment": "Solid backend architecture"}
            ],
        },
    )
    assert res_draft.status_code == 200
    draft_data = res_draft.json()["data"]
    assert draft_data["status"] == "draft"
    # (8.5 / 10) * 0.4 * 100 = 34.0
    assert draft_data["total_score"] == 34.0

    # 4. Judge A tries to lock ('submitted') while missing required criterion c2 -> 422 MISSING_RUBRIC_CRITERIA_SCORE
    res_missing = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_a),
        json={
            "submission_id": sub_final.id,
            "status": "submitted",
            "evaluations": [
                {"criteria_id": c1_id, "score": 8.5, "comment": "Solid backend architecture"}
            ],
        },
    )
    assert res_missing.status_code == 422
    assert res_missing.json()["error_code"] == "MISSING_RUBRIC_CRITERIA_SCORE"
    assert c2_id in res_missing.json()["data"]["missing_criteria_ids"]

    # 5. Judge A sends score > max_score -> 422 SCORE_OUT_OF_RANGE
    res_over = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_a),
        json={
            "submission_id": sub_final.id,
            "status": "draft",
            "evaluations": [
                {"criteria_id": c1_id, "score": 11.0, "comment": "Too high"}
            ],
        },
    )
    assert res_over.status_code == 422
    assert res_over.json()["error_code"] == "SCORE_OUT_OF_RANGE"

    # 6. Judge A sends negative score < 0 -> 422 SCORE_OUT_OF_RANGE
    res_neg = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_a),
        json={
            "submission_id": sub_final.id,
            "status": "draft",
            "evaluations": [
                {"criteria_id": c1_id, "score": -0.5, "comment": "Negative"}
            ],
        },
    )
    assert res_neg.status_code == 422
    assert res_neg.json()["error_code"] == "SCORE_OUT_OF_RANGE"

    # 7. Judge A submits all required criteria (status='submitted') -> 200 OK and locks evaluation
    res_submit = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_a),
        json={
            "submission_id": sub_final.id,
            "status": "submitted",
            "evaluations": [
                {"criteria_id": c1_id, "score": 8.0, "comment": "Clean FastAPI services"},
                {"criteria_id": c2_id, "score": 9.0, "comment": "Novel triage pipeline"},
                {"criteria_id": c3_id, "score": 10.0, "comment": "Great UI polish"},
            ],
        },
    )
    assert res_submit.status_code == 200
    sub_data = res_submit.json()["data"]
    assert sub_data["status"] == "submitted"
    assert sub_data["submitted_at"] is not None
    # (8/10*0.4 + 9/10*0.5 + 10/10*0.1) * 100 = (0.32 + 0.45 + 0.10) * 100 = 87.0
    assert sub_data["total_score"] == 87.0

    # Verify UniqueConstraint uq_eval_submission_judge_criteria: exactly 3 rows in DB for Judge A
    rows = (
        await db_session.execute(
            select(Evaluation).where(
                Evaluation.submission_id == sub_final.id,
                Evaluation.judge_id == judge_a.id,
            )
        )
    ).scalars().all()
    assert len(rows) == 3

    # 8. Judge A attempts to modify after locking -> 409 EVALUATION_ALREADY_LOCKED
    res_locked = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_a),
        json={
            "submission_id": sub_final.id,
            "status": "draft",
            "evaluations": [
                {"criteria_id": c1_id, "score": 5.0, "comment": "Trying to overwrite"}
            ],
        },
    )
    assert res_locked.status_code == 409
    assert res_locked.json()["error_code"] == "EVALUATION_ALREADY_LOCKED"

    # 9. Judge B isolation check: Judge B sees evaluation_status='not_started' and cannot see Judge A's score
    res_judge_b = await client.get(
        "/api/v1/evaluations/submissions", headers=_auth_headers(judge_b)
    )
    assert res_judge_b.status_code == 200
    sub_b = res_judge_b.json()["data"]["submissions"][0]
    assert sub_b["evaluation_status"] == "not_started"
    assert sub_b["my_total_score"] is None
    assert sub_b["my_evaluations"] == []
    assert "Clean FastAPI services" not in res_judge_b.text

    # 10. Mentor & Candidate are blocked with 403 FORBIDDEN on POST /api/v1/evaluations
    res_mentor_post = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(mentor),
        json={
            "submission_id": sub_final.id,
            "status": "draft",
            "evaluations": [{"criteria_id": c1_id, "score": 8.0}],
        },
    )
    assert res_mentor_post.status_code == 403


@pytest.mark.asyncio
async def test_rubric_lock_and_admin_unlock_evaluation_with_audit_log(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Step 3 & Step 4(3):
    - Admin cannot overwrite rubric once a submitted evaluation exists (409 RUBRIC_LOCKED_BY_EVALUATIONS).
    - Admin can unlock a Judge's locked evaluation via PATCH /api/v1/admin/evaluations/{sub_id}/judges/{judge_id}/unlock.
    - Unlock logs EVALUATION_UNLOCKED in audit_logs and allows Judge to edit & re-submit.
    """
    admin = await _create_user(db_session, "admin_unlock@hackflow.tech", "Admin BTC", UserRole.ADMIN)
    judge = await _create_user(db_session, "judge_unlock@hackflow.tech", "Judge Unlock", UserRole.JUDGE)
    leader = await _create_user(db_session, "leader_unlock@hackflow.tech", "Leader Unlock", UserRole.CANDIDATE)

    sub_final = await _seed_final_submission(db_session, leader, team_name="ByteCraft Team")

    res_rubric = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(admin),
        json={
            "name": "Initial Rubric",
            "criteria": [
                {"title": "Core Tech", "max_score": 10, "weight": 1.0, "is_required": True, "display_order": 1}
            ],
        },
    )
    assert res_rubric.status_code == 201
    c_id = res_rubric.json()["data"]["criteria"][0]["id"]

    # Judge locks evaluation
    res_lock = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge),
        json={
            "submission_id": sub_final.id,
            "status": "submitted",
            "evaluations": [{"criteria_id": c_id, "score": 7.5, "comment": "Initial score"}],
        },
    )
    assert res_lock.status_code == 200

    # Admin tries to modify rubric while submitted evaluation exists -> 409 RUBRIC_LOCKED_BY_EVALUATIONS
    res_rubric_locked = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(admin),
        json={
            "name": "Modified Rubric",
            "criteria": [
                {"title": "New Tech", "max_score": 10, "weight": 1.0, "is_required": True, "display_order": 1}
            ],
        },
    )
    assert res_rubric_locked.status_code == 409
    assert res_rubric_locked.json()["error_code"] == "RUBRIC_LOCKED_BY_EVALUATIONS"

    # Judge tries to unlock own evaluation -> 403 FORBIDDEN
    res_judge_unlock = await client.patch(
        f"/api/v1/admin/evaluations/{sub_final.id}/judges/{judge.id}/unlock",
        headers=_auth_headers(judge),
    )
    assert res_judge_unlock.status_code == 403

    # Admin unlocks Judge's evaluation -> 200 OK
    res_admin_unlock = await client.patch(
        f"/api/v1/admin/evaluations/{sub_final.id}/judges/{judge.id}/unlock",
        headers=_auth_headers(admin),
        json={"reason": "High discrepancy re-assessment requested by BTC"},
    )
    assert res_admin_unlock.status_code == 200
    unlock_data = res_admin_unlock.json()["data"]
    assert unlock_data["previous_status"] == "submitted"
    assert unlock_data["status"] == "draft"
    assert unlock_data["unlocked_by"] == admin.id

    # Verify AuditLog record for EVALUATION_UNLOCKED
    audit_stmt = select(AuditLog).where(
        AuditLog.submission_id == sub_final.id,
        AuditLog.action == "EVALUATION_UNLOCKED",
    )
    audit_log = (await db_session.execute(audit_stmt)).scalar_one_or_none()
    assert audit_log is not None
    assert audit_log.user_id == admin.id
    assert audit_log.details["judge_id"] == judge.id

    # Judge can now update score and re-lock -> 200 OK
    res_resubmit = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge),
        json={
            "submission_id": sub_final.id,
            "status": "submitted",
            "evaluations": [{"criteria_id": c_id, "score": 9.0, "comment": "Updated after review"}],
        },
    )
    assert res_resubmit.status_code == 200
    assert res_resubmit.json()["data"]["total_score"] == 90.0


@pytest.mark.asyncio
async def test_judge_assignment_restriction(
    client: AsyncClient, db_session: AsyncSession
):
    """SRS HF-36 Section 7.3: Explicit judge assignment blocks unassigned judges with 403 FORBIDDEN_NOT_ASSIGNED_JUDGE."""
    admin = await _create_user(db_session, "admin_assign@hackflow.tech", "Admin Assign", UserRole.ADMIN)
    judge_assigned = await _create_user(db_session, "judge_assigned@hackflow.tech", "Assigned Judge", UserRole.JUDGE)
    judge_unassigned = await _create_user(db_session, "judge_unassigned@hackflow.tech", "Unassigned Judge", UserRole.JUDGE)
    leader = await _create_user(db_session, "leader_assign@hackflow.tech", "Leader Assign", UserRole.CANDIDATE)

    sub_final = await _seed_final_submission(db_session, leader, team_name="CyberPulse Team")

    res_rubric = await client.post(
        "/api/v1/rubrics",
        headers=_auth_headers(admin),
        json={
            "name": "Assignment Rubric",
            "criteria": [
                {"title": "Implementation", "max_score": 10, "weight": 1.0, "is_required": True, "display_order": 1}
            ],
        },
    )
    c_id = res_rubric.json()["data"]["criteria"][0]["id"]

    # Admin assigns sub_final ONLY to judge_assigned
    res_assign = await client.post(
        "/api/v1/admin/evaluations/assignments",
        headers=_auth_headers(admin),
        json={"judge_id": judge_assigned.id, "submission_id": sub_final.id},
    )
    assert res_assign.status_code == 200

    # Unassigned judge tries to score sub_final -> 403 FORBIDDEN_NOT_ASSIGNED_JUDGE
    res_unassigned = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_unassigned),
        json={
            "submission_id": sub_final.id,
            "status": "draft",
            "evaluations": [{"criteria_id": c_id, "score": 8.0}],
        },
    )
    assert res_unassigned.status_code == 403
    assert res_unassigned.json()["error_code"] == "FORBIDDEN_NOT_ASSIGNED_JUDGE"

    # Unassigned judge's GET /api/v1/evaluations/submissions returns empty list
    res_list_unassigned = await client.get(
        "/api/v1/evaluations/submissions", headers=_auth_headers(judge_unassigned)
    )
    assert res_list_unassigned.status_code == 200
    assert res_list_unassigned.json()["data"]["submissions"] == []

    # Assigned judge can score sub_final -> 200 OK
    res_assigned_ok = await client.post(
        "/api/v1/evaluations",
        headers=_auth_headers(judge_assigned),
        json={
            "submission_id": sub_final.id,
            "status": "submitted",
            "evaluations": [{"criteria_id": c_id, "score": 9.5}],
        },
    )
    assert res_assigned_ok.status_code == 200
    assert res_assigned_ok.json()["data"]["total_score"] == 95.0

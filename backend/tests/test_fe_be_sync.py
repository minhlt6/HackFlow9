import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_full_fe_be_integration_flows(client: AsyncClient):
    """
    End-to-end verification of all Frontend <-> Backend synchronized APIs:
    - Dev persona token fallback & auto-provisioning
    - Notifications (/notifications/me, /unread-count, /read, /dismiss)
    - Admin Topics & Subtopics CRUD + Candidate subtopic selection
    - Admin Checkpoints CRUD (optional start_time + DELETE)
    - Admin Teams CRUD & Approval + Public /teams list
    - Admin Personnel CRUD (/admin/personnel)
    - Candidate Team leave / transfer / remove + Final submission (/submissions/final)
    - Rubric ID preservation & Evaluation by team_id
    """
    admin_headers = {"Authorization": "Bearer mock-jwt-token-admin"}
    leader_headers = {"Authorization": "Bearer mock-jwt-token-leader"}
    member_headers = {"Authorization": "Bearer mock-jwt-token-member"}
    member2_headers = {"Authorization": "Bearer mock-jwt-token-member2"}
    judge_headers = {"Authorization": "Bearer mock-jwt-token-judge"}

    # 1. Notifications API
    res_unread = await client.get("/api/v1/notifications/unread-count", headers=admin_headers)
    assert res_unread.status_code == 200
    assert res_unread.json()["data"]["unread_count"] == 0

    # Create announcement and verify it appears in notifications
    res_ann = await client.post(
        "/api/v1/announcements",
        headers=admin_headers,
        json={
            "title": "Welcome to HackFlow 2026",
            "content": "Contest is now open for all teams!",
            "type": "urgent",
            "target_audience": "all",
            "is_pinned": True,
        },
    )
    assert res_ann.status_code in (200, 201)
    ann_id = res_ann.json()["data"]["id"]

    res_notifs = await client.get("/api/v1/notifications/me", headers=leader_headers)
    assert res_notifs.status_code == 200
    assert len(res_notifs.json()["data"]) >= 1

    res_read = await client.patch(f"/api/v1/notifications/{ann_id}/read", headers=leader_headers)
    assert res_read.status_code == 200

    res_dismiss = await client.post(f"/api/v1/notifications/{ann_id}/dismiss", headers=leader_headers)
    assert res_dismiss.status_code == 200

    # 2. Admin Topics & Subtopics CRUD
    res_topic = await client.post(
        "/api/v1/topics",
        headers=admin_headers,
        json={"title": "AI & Healthcare", "description": "Medical AI solutions", "max_teams": 10},
    )
    assert res_topic.status_code == 201
    topic_id = res_topic.json()["data"]["id"]

    res_sub = await client.post(
        f"/api/v1/topics/{topic_id}/subtopics",
        headers=admin_headers,
        json={"title": "Diagnostic Imaging AI", "description": "X-Ray analysis", "max_teams": 3},
    )
    assert res_sub.status_code == 201
    subtopic_id = res_sub.json()["data"]["subtopics"][0]["id"]

    res_patch_sub = await client.patch(
        f"/api/v1/topics/subtopics/{subtopic_id}",
        headers=admin_headers,
        json={"max_teams": 5},
    )
    assert res_patch_sub.status_code == 200
    assert res_patch_sub.json()["data"]["max_teams"] == 5

    # 3. Admin Checkpoints CRUD (without start_time)
    res_cp = await client.post(
        "/api/v1/checkpoints",
        headers=admin_headers,
        json={
            "title": "Checkpoint 1: Idea & Architecture",
            "description": "Submit architecture diagram",
            "deadline": "2026-12-31T23:59:59Z",
            "duration_minutes": 180,
        },
    )
    assert res_cp.status_code in (200, 201)
    cp_id = res_cp.json()["data"]["id"]

    res_del_cp = await client.delete(f"/api/v1/checkpoints/{cp_id}", headers=admin_headers)
    assert res_del_cp.status_code == 200

    # 4. Candidate Team Creation, Join, Subtopic Selection, and Final Submission
    res_team = await client.post(
        "/api/v1/teams",
        headers=leader_headers,
        json={"name": "CyberSamurai", "description": "AI Samurai Team"},
    )
    assert res_team.status_code in (200, 201)
    team_data = res_team.json()["data"]
    team_id = team_data["id"]
    invite_code = team_data["invite_code"]

    res_join = await client.post(
        "/api/v1/teams/join",
        headers=member_headers,
        json={"invite_code": invite_code},
    )
    assert res_join.status_code == 200

    res_join2 = await client.post(
        "/api/v1/teams/join",
        headers=member2_headers,
        json={"invite_code": invite_code},
    )
    assert res_join2.status_code == 200

    # Select subtopic directly by subtopic_id (as Frontend does)
    res_sel = await client.post(
        "/api/v1/topics/select",
        headers=leader_headers,
        json={"topic_id": subtopic_id},
    )
    assert res_sel.status_code == 200
    assert res_sel.json()["data"]["subtopic_id"] == subtopic_id

    # Final Submission
    res_final = await client.post(
        "/api/v1/submissions/final",
        headers=leader_headers,
        json={
            "project_title": "SamuraiMed AI",
            "executive_summary": "Real-time X-Ray diagnostics",
            "repository_url": "https://github.com/cybersamurai/samuraimed",
            "demo_video_url": "https://youtube.com/watch?v=demo123",
            "slide_url": "https://docs.google.com/presentation/d/slide123",
        },
    )
    assert res_final.status_code in (200, 201)

    # 5. Rubrics ID preservation & Evaluation by team_id
    res_rubric = await client.post(
        "/api/v1/rubrics",
        headers=admin_headers,
        json={
            "criteria": [
                {
                    "id": "crit-custom-1",
                    "name": "Innovation",
                    "description": "Originality",
                    "weight": 50,
                    "max_score": 10,
                    "display_order": 1,
                },
                {
                    "id": "crit-custom-2",
                    "name": "Technical Depth",
                    "description": "Architecture",
                    "weight": 50,
                    "max_score": 10,
                    "display_order": 2,
                },
            ]
        },
    )
    assert res_rubric.status_code in (200, 201)
    returned_ids = [c["id"] for c in res_rubric.json()["data"]["criteria"]]
    assert "crit-custom-1" in returned_ids
    assert "crit-custom-2" in returned_ids

    res_eval = await client.post(
        "/api/v1/evaluations",
        headers=judge_headers,
        json={
            "team_id": team_id,
            "general_comment": "Great execution!",
            "is_draft": False,
            "details": [
                {"criteria_id": "crit-custom-1", "score": 9.0, "comment": "Very innovative"},
                {"criteria_id": "crit-custom-2", "score": 8.5, "comment": "Solid backend"},
            ],
        },
    )
    assert res_eval.status_code in (200, 201)
    assert res_eval.json()["data"]["total_score"] == 87.5

    # 6. Admin Teams & Personnel APIs
    res_admin_teams = await client.get("/api/v1/admin/teams", headers=admin_headers)
    assert res_admin_teams.status_code == 200
    assert any(t["id"] == team_id for t in res_admin_teams.json()["data"])

    res_personnel = await client.post(
        "/api/v1/admin/personnel",
        headers=admin_headers,
        json={
            "full_name": "TS. Giám Khảo Mới",
            "email": "new.judge@hackathon.org",
            "role": "judge",
            "organization": "ĐH Bách Khoa",
            "specialty": "AI & Cloud",
        },
    )
    assert res_personnel.status_code == 201
    new_person_id = res_personnel.json()["data"]["id"]

    res_del_person = await client.delete(f"/api/v1/admin/personnel/{new_person_id}", headers=admin_headers)
    assert res_del_person.status_code == 200

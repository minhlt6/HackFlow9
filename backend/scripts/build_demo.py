"""Create a separate, reproducible demo DB; never replace an existing database.

From backend: python scripts/build_demo.py --stage rehearsal --output ../demo/generated/rehearsal.db
Set SECRET_KEY to the SAME value used by the application (password hashes depend on it).
For an EMPTY PostgreSQL DB: --database-url-env DEMO_DATABASE_URL --manifest <path>.
"""
import argparse
import asyncio
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import secrets
import sys
from uuid import NAMESPACE_URL, uuid5

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401
from app.core.database import Base
from app.core.security import hash_password
from app.models.announcement import Announcement
from app.models.checkpoint import AuditLog, Checkpoint, Submission
from app.models.config import HackathonConfig
from app.models.evaluation import Evaluation, JudgeAssignment, RubricCriteria
from app.models.support import SupportTicket
from app.models.team import Team, TeamMember
from app.models.topic import Subtopic, Topic
from app.models.user import User
from app.models.whitelist import WhitelistEntry


def demo_id(key):
    return str(uuid5(NAMESPACE_URL, f"hackflow-demo-v1/{key}"))


def build_dataset(stage, now, password):
    """Use real model defaults/types and synthetic, explicitly labelled contest records."""
    rows = {table.name: [] for table in Base.metadata.sorted_tables}
    accounts, teams, checkpoints = [], {}, {}

    def add(model, key, **values):
        values.setdefault("created_at", now - timedelta(days=2))
        values.setdefault("updated_at", now)
        obj = model(id=demo_id(key), **values)
        rows[model.__tablename__].append(obj.to_dict())
        return obj.id

    def user(slug, name, role="candidate", approval="approved", complete=True, active=True):
        email = f"{slug}@demo.example.com"
        profile = {"school": "Đại học Demo", "university": "Đại học Demo", "student_id": f"DEMO{len(accounts)+1:04}",
                   "phone": "0900000000", "skills": ["Python", "React"], "bio": "Tài khoản dữ liệu demo",
                   "onboarding_completed": True, "pledged": True} if complete else {}
        if role in {"judge", "mentor"}:
            profile.update(organization="Hội đồng Demo", specialty="AI, Web", assigned_tracks=["AI & Giáo dục"])
        uid = add(User, f"user/{slug}", email=email, full_name=name, role=role, approval_status=approval,
                  hashed_password=hash_password(password), is_active=active, profile_meta=profile)
        accounts.append({"id": uid, "email": email, "name": name, "role": role,
                         "approval": approval, "active": active})
        return uid

    admin = user("admin", "Quản trị Demo", "admin")
    judges = [user(f"judge{i}", f"Giám khảo Demo {i}", "judge") for i in (1, 2)]
    mentors = [user(f"mentor{i}", f"Cố vấn Demo {i}", "mentor") for i in (1, 2)]
    user("pending", "Thí sinh Chờ Duyệt", approval="pending")
    user("rejected", "Thí sinh Bị Từ Chối", approval="rejected")
    user("onboarding", "Thí sinh Hồ Sơ Mới", complete=False)
    user("newleader", "Leader Tạo Đội Trực Tiếp")
    for i in range(1, 4):
        user(f"join{i}", f"Thành viên Tự Do {i}")
    user("inactive", "Tài khoản Ngừng Hoạt Động", active=False)

    results = stage == "results"
    add(HackathonConfig, "config", name="HackFlow — Cuộc thi Demo", start_time=now-timedelta(days=1),
        end_time=now+timedelta(days=3), is_topic_published=True, is_result_published=False,
        settings_data={"status": "judging" if results else "hacking", "season": "Demo",
                       "minTeamMembers": 3, "maxTeamMembers": 5, "minTeamSize": 3, "maxTeamSize": 5,
                       "registrationDeadline": (now+timedelta(days=1)).isoformat(),
                       "blindJudgingEnabled": True, "submissionFreezeEnabled": True, "discrepancyThreshold": 15})

    tracks = []
    subtopics = []
    for idx, (title, cap, count) in enumerate([("AI & Giáo dục", 6, 2), ("IoT & Môi trường", 6, 1), ("Web3 — Đã hết chỗ", 1, 1)]):
        tid = add(Topic, f"topic/{idx}", title=title, description="Đề tài mẫu để trình diễn lựa chọn và kiểm soát số chỗ.",
                  max_teams=cap, current_teams=count, is_active=True)
        tracks.append(tid)
        subs = []
        for sub in (0, 1):
            subs.append(add(Subtopic, f"subtopic/{idx}/{sub}", topic_id=tid,
                            title=["Trợ lý Học Tập", "Quan trắc Không khí", "Truy xuất Nguồn gốc"][idx] + f" — Bài toán {sub+1}",
                            description="Dữ liệu và sản phẩm được trình bày bằng liên kết công khai.",
                            max_teams=cap if sub == 0 else 2, current_teams=count if sub == 0 else 0,
                            is_active=not (idx == 2 and sub == 1), mentor_id=mentors[idx % 2]))
        subtopics.append(subs)

    # Approved roster sizes deliberately exercise minimum, maximum, locked and rejection policies.
    specs = [("CyberSamurai", "cyber", 3, "approved", 0, False),
             ("GreenPulse IoT", "green", 5, "approved", 1, False),
             ("NeuralCrafters", "neural", 4, "approved", 0, False),
             ("ChainTrace", "chain", 3, "approved", 2, True),
             ("PendingPioneers", "pendingteam", 3, "pending", None, False),
             ("BlockShield", "block", 2, "rejected", None, False),
             ("NewBuilders", "builders", 2, "pending", None, False),
             ("TopicExplorers", "explore", 3, "approved", None, False)]
    for name, slug, size, approval, track, locked in specs:
        members = [user(f"{slug}.leader" if n == 0 else f"{slug}.member{n}",
                        f"{name} — {'Trưởng nhóm' if n == 0 else 'Thành viên '+str(n)}") for n in range(size)]
        meta = {"approval_status": approval, "university": "Đại học Demo", "repo_url": "https://github.com/minhlt6/HackFlow9"}
        if approval == "rejected":
            meta.update(rejection_reason="Đội có 2 thành viên, chưa đạt tối thiểu 3 tại thời điểm xét duyệt.", rejection_reason_code="under_min")
        team_id = add(Team, f"team/{slug}", team_name=name, description="Đội trình diễn với dữ liệu giả lập",
                      invite_code=f"DEMO{slug.upper()}", topic_id=tracks[track] if track is not None else None,
                      subtopic_id=subtopics[track][0] if track is not None else None, is_locked=locked, admin_meta=meta)
        for n, uid in enumerate(members):
            add(TeamMember, f"membership/{slug}/{n}", team_id=team_id, user_id=uid,
                role="leader" if n == 0 else "member", joined_at=now-timedelta(days=1))
        teams[slug] = {"id": team_id, "name": name, "leader_id": members[0], "members": members,
                       "invite_code": f"DEMO{slug.upper()}", "size": size, "approval": approval}

    # Two open stages allow real writes; closed/upcoming stages demonstrate server-side time gates.
    cp_specs = [("closed", "Chặng 1 — Đã đóng", -48, -24, False, 15),
                ("open", "Chặng 2 — Nộp tiến độ trực tiếp", -12, 24, False, 20),
                ("future", "Chặng 3 — Chưa mở", 48, 72, False, 25),
                ("final", "Chung kết — Nộp bài và chấm điểm", -6, 36, True, 40)]
    for order, (slug, title, start, end, final, weight) in enumerate(cp_specs, 1):
        checkpoints[slug] = add(Checkpoint, f"checkpoint/{slug}", title=title,
            description="Mốc tương đối theo giờ tạo bộ demo; giờ UTC được giao diện đổi sang giờ địa phương.",
            start_time=now+timedelta(hours=start), deadline=now+timedelta(hours=end),
            is_active=True, is_final_checkpoint=final, grace_period_seconds=5, display_order=order, weight=weight)

    criteria = [add(RubricCriteria, f"criterion/{i}", title=title, max_score=10, weight=weight,
                    display_order=i+1, rubric_name="Rubric Demo", is_required=True, is_active=True)
                for i, (title, weight) in enumerate([("Tính sáng tạo", .30), ("Kỹ thuật", .30), ("Ứng dụng thực tế", .25), ("Trình bày", .15)])]

    final_submissions = {}
    for slug in ("cyber", "green", "neural", "chain"):
        team = teams[slug]
        for cp in ("closed", "open", "final"):
            submitted_at = now-timedelta(hours=30 if cp == "closed" else 2)
            version_history = []
            if cp == "open":
                version_history = [{"version": 1, "repo_url": "https://github.com/minhlt6/HackFlow9",
                    "demo_url": "https://example.com", "submitted_at": (submitted_at-timedelta(hours=1)).isoformat(),
                    "status": "submitted", "note": "Phiên bản dữ liệu mẫu v1", "submission_data": {"demo_url": "https://example.com"}}]
            sid = add(Submission, f"submission/{slug}/{cp}", team_id=team["id"], checkpoint_id=checkpoints[cp],
                submitted_by=team["leader_id"], repo_url="https://github.com/minhlt6/HackFlow9", demo_url="https://example.com",
                commit_sha=None, status="sha_verification_failed" if cp == "final" else "submitted",
                note="DỮ LIỆU MẪU: chưa xác minh SHA; không đại diện bài nộp thực tế.",
                submission_data={"repo_url": "https://github.com/minhlt6/HackFlow9", "demo_url": "https://example.com"},
                submitted_at=submitted_at, version=2 if cp == "open" else 1, version_history=version_history)
            add(AuditLog, f"audit/{slug}/{cp}", user_id=team["leader_id"], team_id=team["id"],
                checkpoint_id=checkpoints[cp], submission_id=sid, action="DEMO_FIXTURE_CREATED", status="success",
                details={"synthetic": True, "sha_verified": False, "stage": stage})
            if cp == "final":
                final_submissions[slug] = sid
                for judge in judges:
                    add(JudgeAssignment, f"assignment/{slug}/{judge}", judge_id=judge, team_id=team["id"], assigned_by=admin)
        # No submitted evaluations in rehearsal: rubric remains editable before live judging.
        if results:
            # Green has a large disagreement; Cyber/Neural tie on total but differ on highest-weight criterion.
            score_pairs = {"cyber": ([9, 8, 8, 8], [9, 8, 8, 8]),
                           "neural": ([8, 9, 8, 8], [8, 9, 8, 8]),
                           "green": ([9, 9, 9, 9], [5, 5, 5, 5]),
                           "chain": ([7, 7, 7, 7], [7, 7, 7, 7])}
            for j, judge in enumerate(judges):
                for i, criterion in enumerate(criteria):
                    add(Evaluation, f"evaluation/{slug}/{j}/{i}", submission_id=final_submissions[slug],
                        judge_id=judge, criteria_id=criterion, score=score_pairs[slug][j][i],
                        comment="Điểm mẫu cho minh họa tổng hợp và xử lý chênh lệch.", general_comment="Dữ liệu demo được gán trước.",
                        status="submitted", evaluated_at=now-timedelta(hours=1), submitted_at=now-timedelta(hours=1))

    ticket_specs = [("open", "open", None, None), ("mine", "in_progress", mentors[0], None),
                    ("other", "in_progress", mentors[1], None), ("recent", "resolved", mentors[0], 1),
                    ("expired", "resolved", mentors[0], 60), ("closed", "closed", mentors[0], 2)]
    ticket_ids = {}
    for slug, status, assignee, hours in ticket_specs:
        response = "Đã hướng dẫn cách tối ưu và kiểm tra lại." if hours is not None else None
        ticket_ids[slug] = add(SupportTicket, f"ticket/{slug}", team_id=teams["cyber"]["id"], user_id=teams["cyber"]["leader_id"],
            created_at=now-timedelta(days=4),
            assigned_to=assignee, title=f"[DEMO {slug}] Hỗ trợ nộp bài và tối ưu ứng dụng", content="Đội cần được cố vấn hướng dẫn.",
            category="technical", priority="high" if slug == "open" else "normal", status=status, response=response,
            resolved_at=now-timedelta(hours=hours) if hours is not None else None,
            messages=[{"id": demo_id(f"message/{slug}"), "senderId": teams["cyber"]["leader_id"],
                       "senderName": "CyberSamurai — Trưởng nhóm", "senderRole": "candidate",
                       "content": "Đội cần được cố vấn hướng dẫn.", "sentAt": (now-timedelta(days=3)).isoformat()}])
    for audience in ("all", "candidate", "mentor", "judge"):
        add(Announcement, f"announcement/{audience}", title=f"[DEMO] Thông báo dành cho {audience}",
            content="Kiểm tra phạm vi hiển thị, đọc thông báo và giữ dữ liệu sau tải lại.", target_audience=audience, priority="info")
    for account in accounts:
        if account["role"] == "candidate" and account["approval"] == "approved":
            add(WhitelistEntry, f"whitelist/{account['id']}", email=account["email"], added_by=admin, note="Thí sinh mẫu đã duyệt")
    add(WhitelistEntry, "whitelist/not-registered", email="whitelisted@demo.example.com", added_by=admin, note="Chưa có tài khoản; minh họa danh sách trắng")
    manifest = {"dataset": "hackflow-demo-v1", "stage": stage, "created_at_utc": now.isoformat(),
                "valid_for_live_demo_until_utc": (now+timedelta(hours=24)).isoformat(),
                "password": password, "accounts": accounts, "teams": teams, "checkpoints": checkpoints,
                "final_submissions": final_submissions, "tickets": ticket_ids,
                "counts": {name: len(items) for name, items in rows.items()},
                "required_runtime": {"ENABLE_STARTUP_SEED": "false", "ENABLE_DEMO_DATA": "false"},
                "note": "Use the same SECRET_KEY for generation and runtime; synthetic submissions have no verified SHA."}
    return rows, manifest


async def write_database(url, rows):
    engine = create_async_engine(url)
    if url.startswith("sqlite"):
        @event.listens_for(engine.sync_engine, "connect")
        def enable_foreign_keys(conn, _):
            conn.execute("PRAGMA foreign_keys=ON")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            for table in Base.metadata.sorted_tables:
                count = await conn.scalar(select(func.count()).select_from(table))
                if count:
                    raise ValueError("Target database is not empty; no demo records were written.")
            for table in Base.metadata.sorted_tables:
                if rows[table.name]:
                    await conn.execute(table.insert(), rows[table.name])
    finally:
        await engine.dispose()


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", choices=["rehearsal", "results"], default="rehearsal")
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--output", type=Path, help="NEW SQLite file; existing files are never replaced")
    target.add_argument("--database-url-env", help="Name of an env var containing an EMPTY target database URL")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--password-env", default="DEMO_PASSWORD")
    parser.add_argument("--at", help="ISO8601 base time with timezone; default now")
    args = parser.parse_args()
    now = datetime.fromisoformat(args.at.replace("Z", "+00:00")) if args.at else datetime.now(timezone.utc)
    if now.tzinfo is None:
        parser.error("--at must include a timezone")
    password = os.environ.get(args.password_env) or secrets.token_urlsafe(18)
    rows, manifest = build_dataset(args.stage, now.astimezone(timezone.utc), password)
    manifest_path = args.manifest or (args.output.with_suffix(".manifest.json") if args.output else None)
    if not manifest_path:
        parser.error("--manifest is required for a remote database")
    manifest_path = manifest_path.resolve()
    account_path = (args.output.with_suffix(".accounts.md") if args.output else manifest_path.with_suffix(".accounts.md")).resolve()
    if account_path.exists():
        parser.error("Account document already exists; choose a new output name")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    # Reserve credential output before any database mutation.
    with manifest_path.open("x", encoding="utf-8") as manifest_file:
        if args.output:
            output = args.output.resolve()
            output.parent.mkdir(parents=True, exist_ok=True)
            with output.open("xb"):
                pass
            url = "sqlite+aiosqlite:///" + output.as_posix()
        else:
            url = os.environ[args.database_url_env]
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        await write_database(url, rows)
        json.dump(manifest, manifest_file, ensure_ascii=False, indent=2)
    account_lines = ["# Tài khoản demo HackFlow", "", f"Bản: **{args.stage}**. Mật khẩu chung: `{password}`.", "",
                     "Chỉ dùng cho bộ dữ liệu demo riêng; không đưa tài liệu này lên GitHub công khai.", "",
                     "| Email | Tên | Vai trò | Duyệt | Hoạt động |", "| --- | --- | --- | --- | --- |"]
    for account in manifest["accounts"]:
        account_lines.append(f"| {account['email']} | {account['name']} | {account['role']} | {account['approval']} | {'Có' if account['active'] else 'Không'} |")
    account_lines += ["", "## Đội thi", "", "| Đội | Mã mời | Thành viên | Duyệt |", "| --- | --- | --- | --- |"]
    for team in manifest["teams"].values():
        account_lines.append(f"| {team['name']} | {team['invite_code']} | {team['size']}/5 | {team['approval']} |")
    with account_path.open("x", encoding="utf-8") as account_file:
        account_file.write("\n".join(account_lines) + "\n")
    print(json.dumps({"stage": args.stage, "manifest": str(manifest_path), "counts": manifest["counts"]}, ensure_ascii=True))


if __name__ == "__main__":
    asyncio.run(main())

import logging
import sys
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("hackflow.main")
logging.getLogger("aiosqlite").setLevel(logging.WARNING)


async def _seed_default_accounts() -> None:
    """
    Ensure default role accounts (Admin, Judge, Mentor, Candidate personas) exist on fresh deployments.
    All operational contest data (Topics, Teams, Checkpoints, Submissions, Tickets, etc.) starts empty.
    """
    from sqlalchemy import select
    import app.models  # noqa: F401
    import app.core.database as db_module
    from app.core.database import Base
    from app.core.security import hash_password
    from app.models.user import User

    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def _ensure_schema_columns(sync_conn) -> None:
            from sqlalchemy import inspect as sa_inspect, text

            inspector = sa_inspect(sync_conn)
            existing_tables = set(inspector.get_table_names())
            for table_name, table in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    continue
                existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(dialect=sync_conn.dialect)
                        default_clause = ""
                        if not col.nullable:
                            if "JSON" in col_type.upper():
                                default_clause = " DEFAULT '{}'"
                            elif "BOOL" in col_type.upper() or "INT" in col_type.upper():
                                default_clause = " DEFAULT 0"
                            else:
                                default_clause = " DEFAULT ''"
                        sync_conn.execute(
                            text(
                                f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type}{default_clause}'
                            )
                        )

        await conn.run_sync(_ensure_schema_columns)

    if not settings.ENABLE_STARTUP_SEED:
        return

    is_test_env = settings.ENVIRONMENT in {"test", "testing"}
    if is_test_env and not settings.demo_enabled:
        return

    default_users = [
        ("admin@hackflow.dev", "BTC HackFlow Administrator", "admin", "approved", "admin-dev"),
        ("admin@hackflow.com", "Admin HackFlow", "admin", "approved", "admin-com"),
        ("judge.tech@hackathon.org", "TS. Nguyễn Hoàng Giám Khảo", "judge", "approved", "judge-hf"),
        ("mentor.ai@ailab.org.vn", "ThS. Phạm Cố Vấn AI", "mentor", "approved", "mentor-hf"),
        ("leader@cybersamurai.team", "Nguyễn Văn Minh", "candidate", "approved", "minh-leader"),
        ("member@cybersamurai.team", "Trần Thị Thảo", "candidate", "approved", "thao-member"),
        ("member2@cybersamurai.team", "Nguyễn Minh Châu", "candidate", "approved", "minhchau-ai"),
    ]
    default_pw_hash = hash_password("123456")

    async with db_module.AsyncSessionLocal() as session:
        rehearsal_admin = (
            await session.execute(select(User).where(User.email == "admin@demo.example.com"))
        ).scalar_one_or_none()
        if rehearsal_admin is not None:
            if rehearsal_admin.hashed_password != default_pw_hash:
                demo_users = (
                    await session.execute(select(User).where(User.email.like("%@demo.example.com")))
                ).scalars().all()
                for u_demo in demo_users:
                    u_demo.hashed_password = default_pw_hash
                await session.commit()
            return

        for email, full_name, role, approval_status, gh_user in default_users:
            res = await session.execute(select(User).where(User.email == email))
            existing = res.scalar_one_or_none()
            if not existing:
                existing = User(
                    email=email,
                    full_name=full_name,
                    hashed_password=default_pw_hash,
                    role=role,
                    approval_status=approval_status,
                    github_username=gh_user,
                    is_active=True,
                )
                session.add(existing)
                await session.flush()
            else:
                if existing.hashed_password != default_pw_hash:
                    existing.hashed_password = default_pw_hash
                if existing.approval_status != approval_status:
                    existing.approval_status = approval_status
                if email == "leader@cybersamurai.team" and existing.full_name == "Trần Quốc Bảo":
                    existing.full_name = "Nguyễn Văn Minh"

        if not is_test_env:
            import json
            from pathlib import Path as _Path
            from datetime import datetime, timedelta, timezone
            from app.models.evaluation import RubricCriteria, Evaluation, EvaluationStatus
            from app.models.topic import Topic, Subtopic
            from app.models.checkpoint import Checkpoint, Submission, SubmissionStatus
            from app.models.team import Team, TeamMember, TeamMemberRole
            from app.models.support import SupportTicket, TicketStatus, TicketPriority
            from app.models.whitelist import WhitelistEntry
            from app.models.announcement import Announcement

            extra_dev_users = [
                # Team 2: NeuralCrafters
                ("hoang.le@hust.edu.vn", "Lê Minh Hoàng", "candidate", "approved", "hoang-hust", "ĐH Bách Khoa Hà Nội (HUST)", "20210412", ["AI/ML", "Computer Vision", "PyTorch"]),
                ("linh.tran@uet.vnu.edu.vn", "Trần Thùy Linh", "candidate", "approved", "linh-uet", "ĐH Công Nghệ - ĐHQGHN (UET)", "21020315", ["Frontend", "React", "TypeScript"]),
                ("anh.do@ptit.edu.vn", "Đỗ Thị Lan Anh", "candidate", "approved", "lananh-ptit", "HV Công Nghệ Bưu Chính Viễn Thông (PTIT)", "B21DCCN088", ["Backend", "FastAPI", "QA Automation"]),
                # Team 3: GreenPulse AI
                ("ly.duong@neu.edu.vn", "Dương Thị Khánh Ly", "candidate", "approved", "khanhly-neu", "ĐH Kinh Tế Quốc Dân (NEU)", "11213409", ["Product Design", "Business Analysis", "Data Analytics"]),
                ("kiet.vo@hcmut.edu.vn", "Võ Tuấn Kiệt", "candidate", "approved", "kiet-hcmut", "ĐH Bách Khoa - ĐHQG TP.HCM (HCMUT)", "2111542", ["IoT", "Embedded AI", "Python"]),
                ("phuong.ngo@fpt.edu.vn", "Ngô Mai Phương", "candidate", "approved", "phuong-fpt", "ĐH FPT Hà Nội", "HE170422", ["Full-Stack", "Next.js", "Cloud"]),
                # 6 Unassigned Approved Candidates (for Admin Email Lookup & 1-Click Random Auto-Match)
                ("duc.pham@hust.edu.vn", "Phạm Minh Đức", "candidate", "approved", "ducpham-hust", "ĐH Bách Khoa Hà Nội (HUST)", "20225101", ["Backend", "FastAPI", "PostgreSQL"]),
                ("huong.vu@uet.vnu.edu.vn", "Vũ Thu Hương", "candidate", "approved", "huongvu-uet", "ĐH Công Nghệ - ĐHQGHN (UET)", "22028114", ["Frontend", "React", "UI/UX"]),
                ("quan.dang@ptit.edu.vn", "Đặng Hồng Quân", "candidate", "approved", "quandang-ptit", "HV Công Nghệ Bưu Chính Viễn Thông (PTIT)", "B22DCCN245", ["AI/ML", "Computer Vision", "PyTorch"]),
                ("trang.bui@fpt.edu.vn", "Bùi Huyền Trang", "candidate", "approved", "trangbui-fpt", "ĐH FPT Hà Nội", "HE172091", ["Product Design", "Pitching", "Business Analysis"]),
                ("son.hoang@hcmus.edu.vn", "Hoàng Thái Sơn", "candidate", "approved", "sonhoang-hcmus", "ĐH Khoa Học Tự Nhiên - ĐHQG TP.HCM", "21120318", ["DevOps", "Docker", "Cloud Security"]),
                ("mai.nguyen@dut.udn.vn", "Nguyễn Ngọc Phương Mai", "candidate", "approved", "mainguyen-dut", "ĐH Bách Khoa - ĐH Đà Nẵng (DUT)", "102210156", ["Data Science", "LLM", "RAG"]),
                # 2 Pending Candidates (for Admin Approvals page)
                ("khanh.trinh@student.hust.edu.vn", "Trịnh Quốc Khánh", "candidate", "pending", "khanhtrinh-hust", "ĐH Bách Khoa Hà Nội (HUST)", "20225890", ["Backend", "Golang", "Kubernetes"]),
                ("vy.le@student.uet.edu.vn", "Lê Thảo Vy", "candidate", "pending", "vyle-uet", "ĐH Công Nghệ - ĐHQGHN (UET)", "22029012", ["AI/ML", "NLP", "Python"]),
            ]

            core_profiles = [
                ("leader@cybersamurai.team", "Nguyễn Văn Minh", "ĐH Bách Khoa Hà Nội (HUST)", "20215001", ["Team Lead", "System Architecture", "AI Security"]),
                ("member@cybersamurai.team", "Lê Hoàng Nam", "ĐH Bách Khoa Hà Nội (HUST)", "20215042", ["Backend", "FastAPI", "CyberSecurity"]),
                ("member2@cybersamurai.team", "Nguyễn Minh Châu", "ĐH Công Nghệ - ĐHQGHN (UET)", "21020188", ["AI/ML", "Deep Learning", "Frontend"]),
            ]

            user_by_email = {}
            all_u_res = await session.execute(select(User))
            for u_obj in all_u_res.scalars().all():
                user_by_email[u_obj.email.lower()] = u_obj

            for em, fn, rl, appr, gh, school, st_id, sk_list in extra_dev_users:
                em_low = em.lower()
                u_obj = user_by_email.get(em_low)
                if not u_obj:
                    u_obj = User(
                        email=em_low,
                        full_name=fn,
                        hashed_password=default_pw_hash,
                        role=rl,
                        approval_status=appr,
                        github_username=gh,
                        is_active=True,
                    )
                    session.add(u_obj)
                    await session.flush()
                    user_by_email[em_low] = u_obj
                entry = dict(u_obj.profile_meta) if isinstance(getattr(u_obj, "profile_meta", None), dict) else {}
                resolved_school = entry.get("school") or entry.get("university") or school
                resolved_st_id = entry.get("student_id") or entry.get("studentId") or st_id
                resolved_skills = entry.get("skills") if isinstance(entry.get("skills"), list) and len(entry.get("skills")) > 0 else sk_list
                entry.update({
                    "full_name": u_obj.full_name or entry.get("full_name") or fn,
                    "email": em_low,
                    "school": resolved_school,
                    "university": resolved_school,
                    "student_id": resolved_st_id,
                    "studentId": resolved_st_id,
                    "github_username": u_obj.github_username or entry.get("github_username") or gh,
                    "skills": resolved_skills,
                    "phone": entry.get("phone") or "0987654321",
                    "bio": entry.get("bio") or f"Thí sinh {u_obj.full_name or fn} đến từ {resolved_school}.",
                })
                u_obj.profile_meta = entry

            for em, fn, school, st_id, sk_list in core_profiles:
                u_obj = user_by_email.get(em.lower())
                if u_obj:
                    entry = dict(u_obj.profile_meta) if isinstance(getattr(u_obj, "profile_meta", None), dict) else {}
                    resolved_school = entry.get("school") or entry.get("university") or school
                    resolved_st_id = entry.get("student_id") or entry.get("studentId") or st_id
                    resolved_skills = entry.get("skills") if isinstance(entry.get("skills"), list) and len(entry.get("skills")) > 0 else sk_list
                    entry.update({
                        "full_name": u_obj.full_name or entry.get("full_name") or fn,
                        "email": em.lower(),
                        "school": resolved_school,
                        "university": resolved_school,
                        "student_id": resolved_st_id,
                        "studentId": resolved_st_id,
                        "github_username": u_obj.github_username or entry.get("github_username") or st_id,
                        "skills": resolved_skills,
                        "phone": entry.get("phone") or "0912345678",
                        "bio": entry.get("bio") or f"Thành viên nòng cốt đội thi đến từ {resolved_school}.",
                    })
                    u_obj.profile_meta = entry

            # Whitelist entries (only seed if table is initially empty so deleted entries stay deleted)
            wl_res = await session.execute(select(WhitelistEntry))
            existing_wl = {w.email.lower() for w in wl_res.scalars().all()}
            if not existing_wl:
                for em_low, u_obj in user_by_email.items():
                    if u_obj.approval_status == "approved" and em_low not in existing_wl:
                        session.add(
                            WhitelistEntry(
                                email=em_low,
                                is_active=True,
                                note=f"Tài khoản {u_obj.role} đã xác thực ({u_obj.full_name})",
                            )
                        )
                        existing_wl.add(em_low)

            rc_res = await session.execute(select(RubricCriteria).limit(1))
            if not rc_res.scalar_one_or_none():
                default_criteria = [
                    ("Kiến trúc & Giải pháp Kỹ thuật", "Độ phức tạp thuật toán, kiến trúc hệ thống và chất lượng mã nguồn.", 10.0, 30.0, 1),
                    ("Tính Đổi mới & Sáng tạo AI", "Tính đột phá của ý tưởng và ứng dụng mô hình trí tuệ nhân tạo.", 10.0, 25.0, 2),
                    ("Khả năng Ứng dụng Thực tiễn", "Tiềm năng triển khai thực tế, trải nghiệm người dùng và tác động xã hội.", 10.0, 25.0, 3),
                    ("Chất lượng Demo & Thuyết trình", "Sản phẩm chạy thực tế ổn định, video demo rõ ràng và bảo vệ thuyết phục.", 10.0, 20.0, 4),
                ]
                for title, desc, max_s, w, order in default_criteria:
                    session.add(
                        RubricCriteria(
                            title=title,
                            description=desc,
                            max_score=max_s,
                            weight=w,
                            display_order=order,
                            is_required=True,
                            is_active=True,
                        )
                    )
                await session.flush()

            tp_res = await session.execute(select(Topic).limit(1))
            if not tp_res.scalar_one_or_none():
                default_topics = [
                    (
                        "Trí tuệ Nhân tạo & Y tế Số (AI in Healthcare)",
                        "Ứng dụng học sâu và thị giác máy tính hỗ trợ chẩn đoán và quản lý hồ sơ bệnh án thông minh.",
                        [
                            ("Hệ thống AI hỗ trợ đọc ảnh X-Quang phổi tự động", "Phát hiện sớm tổn thương phổi trên ảnh DICOM.", 5),
                            ("Trợ lý ảo LLM tư vấn tương tác thuốc lâm sàng", "Cảnh báo xung đột đơn thuốc theo thời gian thực.", 5),
                        ],
                    ),
                    (
                        "An ninh mạng & Định danh Số (CyberSecurity & FinTech)",
                        "Giải pháp chống gian lận giao dịch tài chính và bảo vệ hạ tầng đám mây.",
                        [
                            ("Hệ thống phát hiện bất thường giao dịch eKYC thời gian thực", "Chống giả mạo sinh trắc học Deepfake.", 5),
                            ("Tường lửa AI tự động cô lập tấn công Zero-day", "Phân tích hành vi mạng bằng Graph Neural Network.", 5),
                        ],
                    ),
                    (
                        "Đô thị Thông minh & Chuyển đổi Xanh (Green Smart City)",
                        "Tối ưu hóa năng lượng, giao thông thông minh và giám sát môi trường bằng IoT & AI.",
                        [
                            ("Điều phối đèn tín hiệu giao thông thích ứng bằng Computer Vision", "Giảm ùn tắc giờ cao điểm.", 5),
                            ("Nền tảng dự báo chất lượng không khí & phát thải Carbon", "Tích hợp dữ liệu trạm quan trắc IoT.", 5),
                        ],
                    ),
                ]
                for t_title, t_desc, subs in default_topics:
                    topic_obj = Topic(title=t_title, description=t_desc, max_teams=15, current_teams=0, is_active=True)
                    session.add(topic_obj)
                    await session.flush()
                    for s_title, s_desc, s_max in subs:
                        session.add(
                            Subtopic(
                                topic_id=topic_obj.id,
                                title=s_title,
                                description=s_desc,
                                max_teams=s_max,
                                current_teams=0,
                                is_active=True,
                            )
                        )
                await session.flush()

            cp_res = await session.execute(select(Checkpoint).limit(1))
            if not cp_res.scalar_one_or_none():
                now_utc = datetime.now(timezone.utc)
                default_checkpoints = [
                    ("Chặng 1: Khởi tạo Kiến trúc & Đặc tả Giải pháp", "Nộp liên kết GitHub Repository và tài liệu kiến trúc hệ thống ban đầu.", now_utc - timedelta(hours=2), now_utc + timedelta(hours=12), False, 15.0, 1),
                    ("Chặng 2: Phát triển Core AI / Backend Prototype", "Hoàn thiện pipeline xử lý dữ liệu và các API cốt lõi.", now_utc - timedelta(hours=1), now_utc + timedelta(hours=24), False, 20.0, 2),
                    ("Chặng 3: Tích hợp Giao diện & Kiểm thử End-to-End", "Tích hợp toàn bộ hệ thống và chuẩn bị kịch bản kiểm thử.", now_utc, now_utc + timedelta(hours=36), False, 25.0, 3),
                    ("Chặng Chung Cuộc: Đóng băng Commit SHA & Nộp Video Demo", "Chốt mã nguồn chính thức, slide thuyết trình và video demo sản phẩm để Hội đồng Giám khảo chấm điểm.", now_utc, now_utc + timedelta(hours=48), True, 40.0, 4),
                ]
                for c_title, c_desc, s_time, d_time, is_final, c_weight, c_order in default_checkpoints:
                    session.add(
                        Checkpoint(
                            title=c_title,
                            description=c_desc,
                            start_time=s_time,
                            deadline=d_time,
                            is_active=True,
                            is_final_checkpoint=is_final,
                            grace_period_seconds=5,
                            weight=c_weight,
                            display_order=c_order,
                        )
                    )
                await session.flush()

            # Load Subtopics and Checkpoints for Team & Submission seeding
            sub_res = await session.execute(select(Subtopic).order_by(Subtopic.created_at.asc()))
            all_subtopics = list(sub_res.scalars().all())

            teams_res = await session.execute(select(Team).order_by(Team.created_at.asc()))
            existing_teams = list(teams_res.scalars().all())
            teams_by_name = {t.team_name.lower(): t for t in existing_teams}

            sample_teams_spec = []
            if not existing_teams:
                sample_teams_spec.append(
                    (
                        "CyberSamurai",
                        "He thong tuong lua AI phat hien bat thuong giao dich eKYC va co lap tan cong Zero-day thoi gian thuc.",
                        "CS2026",
                        2 if len(all_subtopics) > 2 else 0,
                        ["leader@cybersamurai.team", "member@cybersamurai.team", "member2@cybersamurai.team"],
                        "DH Bach Khoa Ha Noi (HUST)",
                    )
                )
            sample_teams_spec.extend([
                (
                    "NeuralCrafters",
                    "Nền tảng AI chẩn đoán sớm bất thường ảnh X-Quang phổi kết hợp LLM giải thích lâm sàng.",
                    "HF8899",
                    0,
                    ["hoang.le@hust.edu.vn", "linh.tran@uet.vnu.edu.vn", "anh.do@ptit.edu.vn"],
                    "ĐH Bách Khoa Hà Nội (HUST)",
                ),
                (
                    "GreenPulse AI",
                    "Hệ thống thị giác máy tính điều phối đèn tín hiệu giao thông giảm ùn tắc và phát thải đô thị.",
                    "GP2026",
                    4 if len(all_subtopics) > 4 else 0,
                    ["ly.duong@neu.edu.vn", "kiet.vo@hcmut.edu.vn", "phuong.ngo@fpt.edu.vn"],
                    "ĐH Kinh Tế Quốc Dân (NEU)",
                ),
            ])

            for t_name, t_desc, inv_code, sub_idx, mem_emails, uni_name in sample_teams_spec:
                if t_name.lower() in teams_by_name:
                    existing_t = teams_by_name[t_name.lower()]
                    if not existing_t.description:
                        existing_t.description = t_desc
                    if not getattr(existing_t, "admin_meta", None):
                        existing_t.admin_meta = {
                            "description": t_desc,
                            "approval_status": "approved",
                            "university": uni_name,
                            "major_topic_id": str(existing_t.topic_id) if existing_t.topic_id else None,
                            "sub_topic_id": str(existing_t.subtopic_id) if existing_t.subtopic_id else None,
                            "member_count": len(mem_emails),
                            "repo_url": f"https://github.com/hackflow-2026/{t_name.lower().replace(' ', '-')}",
                            "selected_topic_id": str(existing_t.subtopic_id) if existing_t.subtopic_id else None,
                        }
                    continue
                chosen_sub = all_subtopics[sub_idx % len(all_subtopics)] if all_subtopics else None
                new_t = Team(
                    team_name=t_name,
                    description=t_desc,
                    invite_code=inv_code,
                    topic_id=str(chosen_sub.topic_id) if chosen_sub else None,
                    subtopic_id=str(chosen_sub.id) if chosen_sub else None,
                    is_locked=True,
                    admin_meta={
                        "description": t_desc,
                        "approval_status": "approved",
                        "university": uni_name,
                        "major_topic_id": str(chosen_sub.topic_id) if chosen_sub else None,
                        "sub_topic_id": str(chosen_sub.id) if chosen_sub else None,
                        "member_count": len(mem_emails),
                        "repo_url": f"https://github.com/hackflow-2026/{t_name.lower().replace(' ', '-')}",
                        "selected_topic_id": str(chosen_sub.id) if chosen_sub else None,
                    },
                )
                session.add(new_t)
                await session.flush()
                teams_by_name[t_name.lower()] = new_t
                existing_teams.append(new_t)

                for idx_m, em in enumerate(mem_emails):
                    u_m = user_by_email.get(em.lower())
                    if not u_m:
                        continue
                    existing_m = await session.execute(select(TeamMember).where(TeamMember.user_id == str(u_m.id)))
                    if existing_m.scalar_one_or_none():
                        continue
                    session.add(
                        TeamMember(
                            team_id=str(new_t.id),
                            user_id=str(u_m.id),
                            role=TeamMemberRole.LEADER.value if idx_m == 0 else TeamMemberRole.MEMBER.value,
                        )
                    )
                await session.flush()

            # Seed Submissions & Evaluations if empty
            subm_check = await session.execute(select(Submission).limit(1))
            if not subm_check.scalar_one_or_none() and existing_teams:
                cp_all_res = await session.execute(select(Checkpoint).order_by(Checkpoint.display_order.asc()))
                all_cps = list(cp_all_res.scalars().all())
                first_cp = all_cps[0] if all_cps else None
                final_cp = next((c for c in all_cps if c.is_final_checkpoint), (all_cps[-1] if all_cps else None))

                created_final_submissions = []
                for idx_t, t_obj in enumerate(existing_teams[:3]):
                    t_mems = await session.execute(select(TeamMember).where(TeamMember.team_id == str(t_obj.id)))
                    first_mem = t_mems.scalars().first()
                    submitter_id = str(first_mem.user_id) if first_mem else str(list(user_by_email.values())[0].id)
                    slug = t_obj.team_name.lower().replace(" ", "-")
                    if first_cp:
                        session.add(
                            Submission(
                                checkpoint_id=str(first_cp.id),
                                team_id=str(t_obj.id),
                                submitted_by=submitter_id,
                                repo_url=f"https://github.com/hackflow-2026/{slug}",
                                demo_url=f"https://youtu.be/demo-{slug}-cp1",
                                commit_sha=f"a1b2c3d4e5f6000{idx_t + 1}",
                                submission_data={
                                    "repo_url": f"https://github.com/hackflow-2026/{slug}",
                                    "slide_url": f"https://docs.google.com/presentation/d/1{slug}",
                                    "architecture_summary": f"Kiến trúc Microservices + AI Inference Pipeline của đội {t_obj.team_name}.",
                                },
                                note=f"Bàn giao đặc tả kiến trúc và repository khởi tạo của đội {t_obj.team_name}.",
                                status=SubmissionStatus.SUBMITTED.value,
                                version=1,
                            )
                        )
                    if final_cp and str(final_cp.id) != (str(first_cp.id) if first_cp else ""):
                        final_sub = Submission(
                            checkpoint_id=str(final_cp.id),
                            team_id=str(t_obj.id),
                            submitted_by=submitter_id,
                            repo_url=f"https://github.com/hackflow-2026/{slug}",
                            demo_url=f"https://youtu.be/final-demo-{slug}",
                            commit_sha=f"9f8e7d6c5b4a111{idx_t + 1}",
                            submission_data={
                                "repo_url": f"https://github.com/hackflow-2026/{slug}",
                                "demo_video_url": f"https://youtu.be/final-demo-{slug}",
                                "slide_url": f"https://docs.google.com/presentation/d/final-{slug}",
                                "release_notes": f"Phiên bản hoàn chỉnh đóng băng Commit SHA phục vụ chấm thi chung cuộc của {t_obj.team_name}.",
                            },
                            note=f"Bản nộp chung cuộc hoàn chỉnh kèm Video Demo và Slide bảo vệ của đội {t_obj.team_name}.",
                            status=SubmissionStatus.SUBMITTED.value,
                            version=1,
                        )
                        session.add(final_sub)
                        await session.flush()
                        created_final_submissions.append((t_obj, final_sub))

                # Seed sample Evaluations for Judge on the first 2 final submissions
                judge_user = user_by_email.get("judge.tech@hackathon.org")
                crit_res = await session.execute(select(RubricCriteria).order_by(RubricCriteria.display_order.asc()))
                all_criteria = list(crit_res.scalars().all())
                if judge_user and all_criteria and created_final_submissions:
                    sample_scores = [
                        [9.2, 9.0, 8.8, 9.5],
                        [8.5, 8.8, 8.6, 8.4],
                    ]
                    for s_idx, (t_obj, f_sub) in enumerate(created_final_submissions[:2]):
                        scores_row = sample_scores[s_idx % len(sample_scores)]
                        now_eval = datetime.now(timezone.utc)
                        for c_idx, crit in enumerate(all_criteria):
                            sc_val = scores_row[c_idx % len(scores_row)]
                            session.add(
                                Evaluation(
                                    submission_id=str(f_sub.id),
                                    judge_id=str(judge_user.id),
                                    criteria_id=str(crit.id),
                                    score=sc_val,
                                    comment=f"Đánh giá tiêu chí '{crit.title}': Giải pháp của {t_obj.team_name} thể hiện độ hoàn thiện cao.",
                                    general_comment=f"Đội {t_obj.team_name} có kiến trúc rõ ràng, demo chạy mượt và giải quyết tốt bài toán thực tế.",
                                    status=EvaluationStatus.SUBMITTED.value,
                                    evaluated_at=now_eval,
                                    submitted_at=now_eval,
                                )
                            )

            # Seed Support Tickets if empty
            tk_check = await session.execute(select(SupportTicket).limit(1))
            if not tk_check.scalar_one_or_none() and existing_teams:
                mentor_user = user_by_email.get("mentor.ai@ailab.org.vn")
                leader1 = user_by_email.get("leader@cybersamurai.team")
                leader2 = user_by_email.get("hoang.le@hust.edu.vn")
                now_iso = datetime.now(timezone.utc).isoformat()
                if leader1 and existing_teams:
                    session.add(
                        SupportTicket(
                            team_id=str(existing_teams[0].id),
                            user_id=str(leader1.id),
                            assigned_to=str(mentor_user.id) if mentor_user else None,
                            title="Hỗ trợ tối ưu hóa độ trễ推理 mô hình LLM trên GPU T4",
                            content="Đội em đang triển khai pipeline RAG nhưng thời gian phản hồi trung bình 4.2s. Nhờ Mentor tư vấn cách cấu hình vLLM / quantization phù hợp.",
                            status=TicketStatus.IN_PROGRESS.value,
                            priority=TicketPriority.HIGH.value,
                            category="AI / Machine Learning",
                            messages=[
                                {
                                    "id": "msg-seed-1",
                                    "senderId": str(leader1.id),
                                    "senderName": leader1.full_name,
                                    "senderRole": "candidate",
                                    "content": "Đội em đang triển khai pipeline RAG nhưng thời gian phản hồi trung bình 4.2s. Nhờ Mentor tư vấn cách cấu hình vLLM / quantization phù hợp.",
                                    "sentAt": now_iso,
                                },
                                {
                                    "id": "msg-seed-2",
                                    "senderId": str(mentor_user.id) if mentor_user else "mentor",
                                    "senderName": mentor_user.full_name if mentor_user else "Mentor AI",
                                    "senderRole": "mentor",
                                    "content": "Chào đội! Các bạn hãy bật AWQ 4-bit quantization kết hợp streaming SSE trên FastAPI để giảm TTFT xuống dưới 600ms nhé.",
                                    "sentAt": now_iso,
                                },
                            ],
                        )
                    )
                if leader2 and len(existing_teams) > 1:
                    session.add(
                        SupportTicket(
                            team_id=str(existing_teams[1].id),
                            user_id=str(leader2.id),
                            assigned_to=None,
                            title="Hỏi về quy chuẩn đóng băng Commit SHA tại Chặng Chung Cuộc",
                            content="Cho đội em hỏi mã Commit SHA nộp ở Chặng Chung Cuộc cần lấy trên nhánh main hay nhánh release của GitHub ạ?",
                            status=TicketStatus.OPEN.value,
                            priority=TicketPriority.NORMAL.value,
                            category="Quy chế & Nộp bài",
                            messages=[
                                {
                                    "id": "msg-seed-3",
                                    "senderId": str(leader2.id),
                                    "senderName": leader2.full_name,
                                    "senderRole": "candidate",
                                    "content": "Cho đội em hỏi mã Commit SHA nộp ở Chặng Chung Cuộc cần lấy trên nhánh main hay nhánh release của GitHub ạ?",
                                    "sentAt": now_iso,
                                }
                            ],
                        )
                    )

            # Seed Announcements if < 2
            ann_res = await session.execute(select(Announcement))
            if len(list(ann_res.scalars().all())) < 2:
                session.add(
                    Announcement(
                        title="[BTC] Chính thức mở cổng chọn Đề tài & Chặng 1 Hackathon 2026",
                        content="Các đội thi đã đủ 3-5 thành viên vui lòng truy cập mục Đề tài để khóa chọn bài toán trước 18:00 hôm nay.",
                        priority="high",
                        target_audience="all",
                    )
                )
                session.add(
                    Announcement(
                        title="[Hội đồng Giám khảo] Lưu ý về Video Demo và Commit SHA Chặng Chung Cuộc",
                        content="Mọi bài nộp tại Chặng Chung Cuộc cần đính kèm mã Commit SHA 40 ký tự và liên kết Video Demo công khai (tối đa 5 phút).",
                        priority="urgent",
                        target_audience="candidates",
                    )
                )
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan management: executes startup and shutdown routines.
    """
    import app.core.database as db_module

    # Startup
    logger.info(f"Khởi động {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    try:
        await _seed_default_accounts()
        logger.info("Đã khởi tạo schema cơ sở dữ liệu và tài khoản mặc định thành công.")
    except Exception as exc:
        logger.warning(
            f"Không thể kết nối DATABASE_URL từ xa ({exc}). Tự động chuyển sang SQLite dự phòng (hackflow.db)..."
        )
        try:
            db_module.switch_to_sqlite_fallback()
            await _seed_default_accounts()
            logger.info("Đã khởi tạo SQLite dự phòng (hackflow.db) và tài khoản mặc định thành công.")
        except Exception as fallback_exc:
            logger.error(f"Lỗi khi khởi tạo SQLite dự phòng: {fallback_exc}")
    logger.info(f"CORS origins cho phép: {settings.CORS_ORIGINS}")
    logger.info(f"Docs UI sẵn sàng tại: http://localhost:8000/docs")
    yield
    # Shutdown
    logger.info("Đang giải phóng tài nguyên và đóng database engine...")
    await db_module.engine.dispose()
    logger.info("Hoàn tất tắt ứng dụng an toàn.")


API_DESCRIPTION = """\
# 🚀 HackFlow Backend API — Nền tảng tổ chức & Chấm thi Hackathon

Chào mừng bạn đến với tài liệu kỹ thuật API chính thức của dự án **HackFlow9**. Tài liệu này được thiết kế và bàn giao bởi **Lê Tiến Minh (Tech Lead / Core Backend Architect)** phục vụ cho việc tích hợp của Frontend (Trần Thùy Linh), QA/Postman (Đỗ Thị Lan Anh) và nghiệm thu chức năng từ BA (Dương Thị Khánh Ly).

---

## 🏛️ Kiến trúc hệ thống (3-Tier Architecture)
Hệ thống tuân thủ nghiêm ngặt mô hình 3 tầng phân tách độc lập:
1. **Router (API Layer)**: Tiếp nhận HTTP request, xác thực schema Pydantic, bảo mật JWT Bearer / RBAC, trả về Envelope chuẩn hóa.
2. **Service (Business Layer)**: Thực thi toàn bộ quy tắc nghiệp vụ Hackathon (ràng buộc 3-5 thành viên/đội, kiểm tra hạn chót, kiểm tra trạng thái phê duyệt).
3. **Repository (Data Layer)**: Truy xuất cơ sở dữ liệu qua Async SQLAlchemy 2.0 (PostgreSQL / Supabase), hỗ trợ khóa chống tranh chấp `SELECT FOR UPDATE`.
"""

TAGS_METADATA = [
    {
        "name": "Health",
        "description": "Kiểm tra tình trạng hoạt động của hệ thống, môi trường và kết nối cơ sở dữ liệu Supabase/PostgreSQL.",
    },
    {
        "name": "Auth (HF-19)",
        "description": "Xác thực & Phân quyền: Đăng nhập/Đăng ký nội bộ, GitHub OAuth 2.0 flow, cấp phát JWT Bearer Token và quản lý thông tin tài khoản hiện tại.",
    },
    {
        "name": "Admin",
        "description": "Dành cho Ban Tổ Chức (BTC): Quản lý Whitelist email (cho phép thí sinh đăng nhập), phê duyệt hoặc từ chối đơn đăng ký ứng viên.",
    },
    {
        "name": "Teams (HF-20)",
        "description": "Quản lý Đội thi: Tạo đội mới (tự sinh mã mời 6 ký tự ngẫu nhiên), tham gia đội qua mã mời, xem thông tin đội của tôi, kiểm tra ràng buộc số lượng thành viên (3 - 5 người).",
    },
    {
        "name": "Topics (HF-21)",
        "description": "Quản lý Đề tài thi: Xem danh sách đề tài & Quota giới hạn số đội, đăng ký đề tài bằng giao dịch nguyên tử chống tranh chấp đồng thời (SELECT FOR UPDATE) và hủy chọn đề tài.",
    },
    {
        "name": "Checkpoints (HF-32)",
        "description": "Quản lý mốc Checkpoint nộp bài & Kiểm tra Time-gated (Mở/Khóa cổng nộp bài, thời gian ân hạn mạng 5 giây).",
    },
    {
        "name": "Examples & Envelope Demo",
        "description": "Minh họa chuẩn định dạng API Envelope (ApiResponse[T]) và cơ chế xử lý ngoại lệ toàn cục.",
    },
    {
        "name": "Root",
        "description": "Endpoint gốc trả về thông tin phiên bản và đường dẫn tài liệu Swagger / ReDoc.",
    },
]


def create_app() -> FastAPI:
    """
    FastAPI application factory.
    """
    app = FastAPI(
        title=f"{settings.PROJECT_NAME} — API Documentation",
        version=settings.VERSION,
        description=API_DESCRIPTION,
        openapi_tags=TAGS_METADATA,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        contact={
            "name": "Lê Tiến Minh (Tech Lead / Core Backend Architect)",
            "email": "minhlt@hackflow.dev",
            "url": "https://github.com/minhlt6/HackFlow9",
        },
        license_info={
            "name": "MIT License",
            "url": "https://opensource.org/licenses/MIT",
        },
        servers=[
            {"url": "http://127.0.0.1:8000", "description": "Local Development Server"},
            {"url": "https://api.hackflow.dev", "description": "Staging / Production Server (Mock)"},
        ],
        swagger_ui_parameters={
            "defaultModelsExpandDepth": 2,
            "docExpansion": "list",
            "filter": True,
            "syntaxHighlight.theme": "monokai",
            "persistAuthorization": True,
        },
        lifespan=lifespan,
    )

    # 1. Cấu hình CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=r"https://.*\.(vercel\.app|up\.railway\.app|onrender\.com)",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Process Time & Request Logging Middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time-Sec"] = f"{process_time:.4f}"
        return response

    # 3. Đăng ký Global Exception Handlers (chuẩn hóa Envelope cho mọi lỗi)
    register_exception_handlers(app)

    # 4. Gắn các router API phiên bản v1
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # 5. Root endpoint chào mừng
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "success": True,
            "data": {
                "name": settings.PROJECT_NAME,
                "version": settings.VERSION,
                "environment": settings.ENVIRONMENT,
                "docs": "/docs",
                "redoc": "/redoc",
                "openapi": f"{settings.API_V1_STR}/openapi.json",
                "health": f"{settings.API_V1_STR}/health",
            },
            "message": "Chào mừng bạn đến với HackFlow Backend API! Truy cập /docs để xem tài liệu Swagger tương tác.",
        }

    return app


app = create_app()

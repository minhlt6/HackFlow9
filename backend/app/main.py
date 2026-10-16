import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

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


async def _seed_default_accounts() -> None:
    """
    Ensure default demo accounts, topics, and demo team exist on fresh deployments (Supabase / SQLite).
    """
    from sqlalchemy import select, func
    import app.models  # noqa: F401
    import app.core.database as db_module
    from app.core.database import Base
    from app.core.security import hash_password
    from app.models.user import User
    from app.models.topic import Topic, Subtopic
    from app.models.team import Team, TeamMember, TeamMemberRole

    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    default_users = [
        ("admin@hackflow.dev", "BTC HackFlow Administrator", "admin", "approved", "admin-dev"),
        ("admin@hackflow.com", "Admin HackFlow", "admin", "approved", "admin-com"),
        ("judge.tech@hackathon.org", "TS. Nguyễn Hoàng Giám Khảo", "judge", "approved", "judge-hf"),
        ("mentor.ai@ailab.org.vn", "ThS. Phạm Cố Vấn AI", "mentor", "approved", "mentor-hf"),
        ("leader@cybersamurai.team", "Nguyễn Văn Minh", "candidate", "approved", "leader-cyber"),
        ("member@cybersamurai.team", "Trần Thị Thảo", "candidate", "approved", "member-cyber"),
        ("member2@cybersamurai.team", "Hoàng Quốc Việt", "candidate", "approved", "member2-cyber"),
        ("pending@hust.edu.vn", "Vũ Hoàng Chờ Duyệt", "candidate", "pending", "pending-hust"),
        ("rejected@fpt.edu.vn", "Đặng Tuấn Từ Chối", "candidate", "rejected", "rejected-fpt"),
    ]
    default_pw_hash = hash_password("123456")

    async with db_module.AsyncSessionLocal() as session:
        user_by_email: dict[str, User] = {}
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
            elif existing.hashed_password != default_pw_hash:
                existing.hashed_password = default_pw_hash
            user_by_email[email] = existing

        # Seed default topics & subtopics if table is empty
        topic_count = (await session.execute(select(func.count(Topic.id)))).scalar() or 0
        if topic_count == 0:
            default_topics = [
                (
                    "top-01",
                    "AI Agent Tự Động Hóa Quy Trình Doanh Nghiệp (Enterprise AI Agents)",
                    "Xây dựng các hệ sinh thái AI Agents tự hành, tích hợp khả năng suy luận đa bước (Multi-step Reasoning), gọi công cụ (Function Calling) và truy xuất dữ liệu doanh nghiệp (Enterprise RAG) để tự động hóa các nghiệp vụ phức tạp.",
                    5,
                    3,
                    [
                        (
                            "sub-01-a",
                            "Hệ thống AI Customer Support Agent Đa Kênh với Hybrid Search RAG",
                            "Tự động xử lý khiếu nại, đối soát thông tin giao dịch và phản hồi khách hàng theo thời gian thực.",
                            3,
                            2,
                        ),
                        (
                            "sub-01-b",
                            "AI Agent Tự Động Đối Soát Hợp Đồng & Thẩm Định Hồ Sơ Pháp Lý",
                            "Trích xuất điều khoản, kiểm tra rủi ro tuân thủ pháp lý và cảnh báo sai lệch tài chính.",
                            2,
                            1,
                        ),
                    ],
                ),
                (
                    "top-02",
                    "DeepTech & Generative AI Trong Y Tế & Chăm Sóc Sức Khỏe",
                    "Ứng dụng các mô hình thị giác máy tính và học sâu trên dữ liệu ảnh y tế (DICOM/X-quang) kết hợp Large Language Models hỗ trợ bác sĩ sàng lọc tiền lâm sàng.",
                    5,
                    5,
                    [
                        (
                            "sub-02-a",
                            "Sàng Lọc Tổn Thương Phổi Thời Gian Thực Trên Ảnh Chụp X-Quang",
                            "Mô hình phân vùng tổn thương hỗ trợ bác sĩ chẩn đoán tại trạm y tế tuyến đầu.",
                            3,
                            3,
                        ),
                        (
                            "sub-02-b",
                            "Trợ Lý Ảo Tổng Hợp Bệnh Án & Khuyến Nghị Liều Lượng Thuốc",
                            "Phân tích tiền sử bệnh nhân, tương tác thuốc và cảnh báo dị ứng tự động.",
                            2,
                            2,
                        ),
                    ],
                ),
                (
                    "top-03",
                    "GreenTech & Tối Ưu Năng Lượng Tái Tạo Với AI & IoT",
                    "Phát triển giải pháp giám sát, phân tích chuỗi thời gian (Time-series) và dự báo phụ tải năng lượng mặt trời, điện gió kết hợp điều khiển biên IoT thông minh.",
                    5,
                    1,
                    [
                        (
                            "sub-03-a",
                            "Dự Báo Sản Lượng Điện Năng Lượng Mặt Trời Bằng Vision & Weather AI",
                            "Kết hợp ảnh mây vệ tinh và dữ liệu thời tiết để dự báo công suất phát lưới điện.",
                            3,
                            1,
                        ),
                        (
                            "sub-03-b",
                            "Hệ Thống Tối Ưu Tiêu Thụ Điện Tòa Nhà Thông Minh Theo Thời Gian Thực",
                            "Học tăng cường (RL) điều chỉnh HVAC và chiếu sáng giảm phát thải carbon.",
                            2,
                            0,
                        ),
                    ],
                ),
                (
                    "top-04",
                    "FinTech: Phát Hiện Gian Lận Giao Dịch Bằng Đồ Thị Tri Thức (Graph AI)",
                    "Sử dụng Graph Neural Networks (GNN) và phân tích luồng tiền đa tầng nhằm phát hiện các mẫu hình rửa tiền, tài khoản mạo danh và mạng lưới gian lận thẻ tín dụng.",
                    4,
                    4,
                    [],
                ),
                (
                    "top-05",
                    "Smart City: Điều Tiết Giao Thông Thông Minh & Edge Vision AI",
                    "Triển khai các mô hình Object Detection nhẹ chạy trực tiếp trên thiết bị nhúng (Jetson, Raspberry Pi) để đếm lưu lượng, phát hiện sự cố và điều phối tín hiệu đèn.",
                    6,
                    2,
                    [
                        (
                            "sub-05-a",
                            "Tự Động Phát Hiện Tai Nạn & Xe Cứu Hộ Tại Các Nút Giao",
                            "Ưu tiên luồng xanh cho phương tiện khẩn cấp và cảnh báo va chạm giao thông.",
                            3,
                            1,
                        ),
                        (
                            "sub-05-b",
                            "Thuật Toán Điều Tiết Chu Kỳ Đèn Giao Thông Thích Ứng Mật Độ Xe",
                            "Giảm thời gian chờ trung bình tại các giao lộ giờ cao điểm bằng Machine Learning.",
                            3,
                            1,
                        ),
                    ],
                ),
            ]
            for t_id, t_title, t_desc, t_max, t_curr, subs in default_topics:
                session.add(
                    Topic(
                        id=t_id,
                        title=t_title,
                        description=t_desc,
                        max_teams=t_max,
                        current_teams=t_curr,
                        is_active=True,
                    )
                )
                for s_id, s_title, s_desc, s_max, s_curr in subs:
                    session.add(
                        Subtopic(
                            id=s_id,
                            topic_id=t_id,
                            title=s_title,
                            description=s_desc,
                            max_teams=s_max,
                            current_teams=s_curr,
                            is_active=True,
                        )
                    )
            await session.flush()

        # Seed default CyberSamurai team for demo candidate accounts if not exists
        cs_team_res = await session.execute(select(Team).where(Team.team_name == "CyberSamurai"))
        cs_team = cs_team_res.scalar_one_or_none()
        if not cs_team:
            top01_res = await session.execute(select(Topic).where(Topic.id == "top-01"))
            has_top01 = top01_res.scalar_one_or_none() is not None
            cs_team = Team(
                id="team-cs-01",
                team_name="CyberSamurai",
                invite_code="CS2026",
                topic_id="top-01" if has_top01 else None,
                subtopic_id="sub-01-a" if has_top01 else None,
                is_locked=False,
            )
            session.add(cs_team)
            await session.flush()

            demo_members = [
                ("leader@cybersamurai.team", TeamMemberRole.LEADER.value),
                ("member@cybersamurai.team", TeamMemberRole.MEMBER.value),
                ("member2@cybersamurai.team", TeamMemberRole.MEMBER.value),
            ]
            for m_email, m_role in demo_members:
                u = user_by_email.get(m_email)
                if u:
                    existing_mem = (
                        await session.execute(
                            select(TeamMember).where(TeamMember.user_id == u.id)
                        )
                    ).scalar_one_or_none()
                    if not existing_mem:
                        session.add(
                            TeamMember(
                                team_id=cs_team.id,
                                user_id=u.id,
                                role=m_role,
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

---

## 📦 Chuẩn hóa phản hồi (API Envelope Pattern)
Toàn bộ phản hồi HTTP (cả 2xx thành công lẫn 4xx/5xx lỗi) đều được đóng gói theo định dạng `ApiResponse[T]` thống nhất:

### Thành công (HTTP 200 / 201):
```json
{
  "success": true,
  "data": { ... },
  "message": "Thông báo kết quả thao tác thành công"
}
```

### Thất bại (HTTP 400 / 401 / 403 / 404 / 409 / 422 / 500):
```json
{
  "success": false,
  "data": null,
  "message": "Mô tả chi tiết nguyên nhân lỗi",
  "error_code": "TEN_MA_LOI_CHUAN_HOA"
}
```

---

## 🔐 Xác thực & Phân quyền (Authentication & Authorization)
- **Cơ chế xác thực**: JSON Web Token (JWT) theo chuẩn RFC 7519.
- **Header gửi kèm**: `Authorization: Bearer <access_token>`
- **Phương thức đăng nhập**:
  - Email + Password nội bộ (cho Admin, Judge, Mentor)
  - GitHub OAuth 2.0 (dành cho Thí sinh - Candidate)
- **Trạng thái phê duyệt (Approval Status)**:
  - `pending`: Thí sinh mới đăng ký, chờ BTC phê duyệt.
  - `approved`: Đã được duyệt hoặc có trong Whitelist, toàn quyền tạo đội & chọn đề tài.
  - `rejected`: Đơn đăng ký bị từ chối.
- **Vai trò người dùng (Roles)**:
  - `admin`: Ban Tổ Chức (toàn quyền quản lý Whitelist, duyệt thí sinh, cấu hình đề tài).
  - `judge`: Giám khảo chấm thi.
  - `mentor`: Cố vấn hướng dẫn.
  - `candidate`: Thí sinh thi đấu (Leader / Member).

---

## ⚠️ Bảng mã lỗi chuẩn hóa (Standard Error Codes)
| Mã lỗi (`error_code`) | HTTP Status | Ý nghĩa & Hướng xử lý cho Frontend |
|---|---|---|
| `UNAUTHORIZED` | 401 | Thiếu token hoặc token đã hết hạn/không hợp lệ. Điều hướng về `/login`. |
| `FORBIDDEN_ROLE` | 403 | Người dùng không đủ quyền RBAC truy cập chức năng này. |
| `ACCOUNT_NOT_APPROVED` | 403 | Tài khoản chưa được BTC phê duyệt (`approval_status != 'approved'`). |
| `ALREADY_IN_TEAM` | 400 | Thí sinh đã tham gia một đội thi khác, không thể tạo hoặc tham gia thêm. |
| `TEAM_FULL` | 400 | Đội thi đã đạt số lượng tối đa 5 thành viên. |
| `TEAM_NAME_TAKEN` | 400 | Tên đội thi đã được đăng ký trước đó. |
| `NOT_IN_TEAM` | 400 | Thao tác yêu cầu người dùng phải thuộc một đội thi. |
| `ONLY_LEADER_CAN_PERFORM`| 403 | Thao tác (như chọn hoặc hủy đề tài) chỉ dành riêng cho Đội trưởng. |
| `TEAM_NOT_QUALIFIED` | 400 | Đội thi chưa đủ điều kiện (chưa đạt tối thiểu 3 thành viên để đăng ký đề tài). |
| `TOPIC_FULL` | 409 | Đề tài đã đạt giới hạn quota số đội đăng ký tối đa. |
| `TOPIC_SELECTION_CLOSED` | 400 | Thời gian đăng ký đề tài đã kết thúc hoặc đề tài tạm khóa. |
| `TOPIC_ALREADY_SELECTED` | 400 | Đội thi đã chọn một đề tài trước đó (cần hủy đề tài cũ trước). |
| `CHECKPOINT_NOT_OPEN` | 403 | Cổng nộp bài cho checkpoint này chưa đến giờ mở (`now < start_time`). |
| `CHECKPOINT_INACTIVE` | 403 | Checkpoint này đang tạm khóa hoặc đã bị vô hiệu hóa bởi Ban tổ chức (`is_active=False`). |
| `DEADLINE_EXCEEDED` | 403/400 | Đã quá hạn chót cho phép thao tác (chọn đề tài hoặc nộp bài sau Deadline + Grace Period 5s). |
| `GITHUB_REPO_INACCESSIBLE`| 400 | Repo GitHub nộp bài không công khai hoặc không truy cập được. |
| `NOT_FOUND` | 404 | Không tìm thấy bản ghi/tài nguyên yêu cầu. |
| `VALIDATION_ERROR` | 422 | Dữ liệu gửi lên sai kiểu dữ liệu hoặc vi phạm validation rules. |

---

## 🗺️ Lộ trình triển khai API (Implementation Status)
- ✅ **Sprint 1 (Hoàn tất)**:
  - `HF-17`: Khởi tạo kiến trúc 3 tầng & chuẩn hóa ApiResponse Envelope.
  - `HF-19`: Xác thực JWT, GitHub OAuth 2.0 Callback, RBAC, Admin Whitelist & Candidate Approval.
  - `HF-20`: Quản lý Đội thi (Create, Join by 6-char code, Me, Team Detail, giới hạn 3-5 thành viên).
  - `HF-21`: Quản lý Đề tài thi (List Topics, Quota, Atomic Select `SELECT FOR UPDATE`, Cancel Topic).
  - `HF-22`: Xuất Swagger Docs & Tài liệu Bàn giao API Contract.
- 🚀 **Sprint 2 (Đang triển khai)**:
  - `HF-32`: Lập trình API Checkpoint Time-gated (Mở/Khóa cổng nộp bài, ân hạn mạng 5s) — **Hoàn tất**.
  - `HF-33`: Lập trình module tích hợp GitHub API xác thực HEAD Commit SHA.
  - `HF-34`: Lập trình API POST /submissions (Lưu trữ bài nộp) và Audit Log.
- ⏳ **Sprint 3 (Roadmap sắp tới)**:
  - Evaluation & Scoring Matrix API (Chấm điểm Rubric cho Giám khảo, xếp hạng tự động).
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

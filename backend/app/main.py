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
    Ensure default demo accounts and whitelist entries exist on fresh deployments (Supabase / SQLite).
    """
    from sqlalchemy import select
    import app.models  # noqa: F401
    import app.core.database as db_module
    from app.core.database import Base
    from app.core.security import hash_password
    from app.models.user import User

    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    default_users = [
        ("admin@hackflow.dev", "BTC HackFlow Administrator", "admin", "approved", "admin-dev"),
        ("admin@hackflow.com", "Admin HackFlow", "admin", "approved", "admin-com"),
        ("judge.tech@hackathon.org", "TS. Nguyễn Hoàng Giám Khảo", "judge", "approved", "judge-hf"),
        ("mentor.ai@ailab.org.vn", "ThS. Phạm Cố Vấn AI", "mentor", "approved", "mentor-hf"),
        ("leader@cybersamurai.team", "Trần Minh Trưởng Nhóm", "candidate", "approved", "leader-cyber"),
        ("member@cybersamurai.team", "Lê Thu Thành Viên", "candidate", "approved", "member-cyber"),
        ("pending@hust.edu.vn", "Vũ Hoàng Chờ Duyệt", "candidate", "pending", "pending-hust"),
        ("rejected@fpt.edu.vn", "Đặng Tuấn Từ Chối", "candidate", "rejected", "rejected-fpt"),
    ]
    default_pw_hash = hash_password("123456")

    async with db_module.AsyncSessionLocal() as session:
        for email, full_name, role, approval_status, gh_user in default_users:
            res = await session.execute(select(User).where(User.email == email))
            existing = res.scalar_one_or_none()
            if not existing:
                session.add(
                    User(
                        email=email,
                        full_name=full_name,
                        hashed_password=default_pw_hash,
                        role=role,
                        approval_status=approval_status,
                        github_username=gh_user,
                        is_active=True,
                    )
                )
            elif existing.hashed_password != default_pw_hash:
                existing.hashed_password = default_pw_hash

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

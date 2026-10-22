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

    default_users = [
        ("admin@hackflow.dev", "BTC HackFlow Administrator", "admin", "approved", "admin-dev"),
        ("admin@hackflow.com", "Admin HackFlow", "admin", "approved", "admin-com"),
        ("judge.tech@hackathon.org", "TS. Nguyễn Hoàng Giám Khảo", "judge", "approved", "judge-hf"),
        ("mentor.ai@ailab.org.vn", "ThS. Phạm Cố Vấn AI", "mentor", "approved", "mentor-hf"),
        ("leader@cybersamurai.team", "Trần Quốc Bảo", "candidate", "approved", "quocbao-dev"),
        ("member@cybersamurai.team", "Lê Hoàng Nam", "candidate", "approved", "hoangnam-fe"),
        ("member2@cybersamurai.team", "Nguyễn Minh Châu", "candidate", "approved", "minhchau-ai"),
    ]
    default_pw_hash = hash_password("123456")

    async with db_module.AsyncSessionLocal() as session:
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

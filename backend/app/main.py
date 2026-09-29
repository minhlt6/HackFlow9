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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan management: executes startup and shutdown routines.
    """
    # Startup
    logger.info(f"Khởi động {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    logger.info(f"CORS origins cho phép: {settings.CORS_ORIGINS}")
    logger.info(f"Docs UI sẵn sàng tại: http://localhost:8000/docs")
    yield
    # Shutdown
    logger.info("Đang giải phóng tài nguyên và đóng database engine...")
    await engine.dispose()
    logger.info("Hoàn tất tắt ứng dụng an toàn.")


def create_app() -> FastAPI:
    """
    FastAPI application factory.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=(
            "HackFlow Backend API — Nền tảng tổ chức & chấm thi Hackathon tập trung.\n\n"
            "Cấu trúc 3 tầng: **Router (API)** → **Service (Business)** → **Repository (Database)**."
        ),
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # 1. Cấu hình CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
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
                "health": f"{settings.API_V1_STR}/health",
            },
            "message": "Chào mừng bạn đến với HackFlow Backend API! Truy cập /docs để xem tài liệu Swagger.",
        }

    return app


app = create_app()

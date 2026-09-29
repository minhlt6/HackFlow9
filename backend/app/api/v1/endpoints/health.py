from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import check_db_connection
from app.schemas.response import ApiResponse

router = APIRouter()


class HealthCheckData(BaseModel):
    status: str
    project: str
    version: str
    environment: str
    timestamp: str
    database: str


@router.get(
    "/health",
    response_model=ApiResponse[HealthCheckData],
    summary="Health check hệ thống",
    description="Kiểm tra trạng thái hoạt động của server FastAPI, môi trường và kết nối cơ sở dữ liệu.",
)
async def get_health_check() -> ApiResponse[HealthCheckData]:
    """
    Returns application and database connectivity health status.
    """
    db_connected = await check_db_connection()
    db_status = "connected" if db_connected else "disconnected (or not yet migrated)"

    data = HealthCheckData(
        status="ok",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=db_status,
    )

    return ApiResponse[HealthCheckData](
        success=True,
        data=data,
        message="Hệ thống Backend FastAPI đang hoạt động bình thường.",
    )

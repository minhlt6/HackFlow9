from typing import Any, Dict
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.exceptions import NotFoundException, BadRequestException
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/examples", tags=["Examples & Envelope Demo"])


class DemoPayload(BaseModel):
    name: str = Field(..., min_length=3, description="Tên demo tối thiểu 3 ký tự")
    email: str = Field(..., description="Email hợp lệ")


@router.get("/success", response_model=ApiResponse[Dict[str, Any]])
async def demo_success():
    """
    Demo endpoint returning a successful API envelope.
    """
    return ApiResponse(
        success=True,
        data={"framework": "FastAPI", "architecture": "3-Tier", "envelope": "ApiResponse[T]"},
        message="Dữ liệu mẫu trả về thành công!",
    )


@router.get("/error-not-found")
async def demo_not_found():
    """
    Demo endpoint triggering a 404 NotFoundException wrapped in API envelope.
    """
    raise NotFoundException(message="Không tìm thấy tài nguyên mẫu theo yêu cầu.")


@router.get("/error-bad-request")
async def demo_bad_request():
    """
    Demo endpoint triggering a 400 BadRequestException wrapped in API envelope.
    """
    raise BadRequestException(message="Tham số yêu cầu không hợp lệ hoặc thiếu dữ liệu bắt buộc.")


@router.post("/validation", response_model=ApiResponse[DemoPayload])
async def demo_validation(payload: DemoPayload):
    """
    Demo endpoint triggering automatic 422 RequestValidationError envelope if fields are invalid.
    """
    return ApiResponse(
        success=True,
        data=payload,
        message="Payload hợp lệ!",
    )

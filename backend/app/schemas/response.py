from typing import Any, Generic, Optional, TypeVar
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standardized API Envelope structure matching frontend ApiResponse contract:
    {
        "success": bool,
        "data": Optional[T],
        "message": Optional[str],
        "error_code": Optional[str]
    }
    """
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = "Success"
    error_code: Optional[str] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    @classmethod
    def ok(
        cls,
        data: Optional[T] = None,
        message: Optional[str] = "Success",
        error_code: Optional[str] = None,
    ) -> "ApiResponse[T]":
        return cls(success=True, data=data, message=message, error_code=error_code)


class ErrorResponse(BaseModel):
    """
    Standard error envelope structure.
    """
    success: bool = False
    data: Optional[Any] = None
    message: str = "An error occurred"
    error_code: Optional[str] = None


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    error_code: Optional[str] = None,
) -> JSONResponse:
    """
    Helper function to return a formatted JSONResponse with ApiResponse envelope.
    Uses jsonable_encoder to safely serialize Pydantic models, dates, and enums.
    """
    content = {
        "success": True,
        "data": jsonable_encoder(data) if data is not None else None,
        "message": message,
        "error_code": error_code,
    }
    return JSONResponse(status_code=status_code, content=content)


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    data: Any = None,
    error_code: Optional[str] = None,
) -> JSONResponse:
    """
    Helper function to return a formatted error JSONResponse with ApiResponse envelope.
    """
    content = {
        "success": False,
        "data": jsonable_encoder(data) if data is not None else None,
        "message": message,
        "error_code": error_code,
    }
    return JSONResponse(status_code=status_code, content=content)

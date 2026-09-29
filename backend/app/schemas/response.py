from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, ConfigDict
from fastapi.responses import JSONResponse

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standardized API Envelope structure matching frontend ApiResponse contract:
    {
        "success": bool,
        "data": Optional[T],
        "message": Optional[str]
    }
    """
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = "Success"

    model_config = ConfigDict(arbitrary_types_allowed=True)


class ErrorResponse(BaseModel):
    """
    Standard error envelope structure.
    """
    success: bool = False
    data: Optional[Any] = None
    message: str = "An error occurred"


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
) -> JSONResponse:
    """
    Helper function to return a formatted JSONResponse with ApiResponse envelope.
    """
    content = {
        "success": True,
        "data": data,
        "message": message,
    }
    return JSONResponse(status_code=status_code, content=content)


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    data: Any = None,
) -> JSONResponse:
    """
    Helper function to return a formatted error JSONResponse with ApiResponse envelope.
    """
    content = {
        "success": False,
        "data": data,
        "message": message,
    }
    return JSONResponse(status_code=status_code, content=content)

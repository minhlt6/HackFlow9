import logging
from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings

logger = logging.getLogger("hackflow.exceptions")


class AppException(Exception):
    """
    Base application exception with standardized status code, message, error_code, and optional details.
    """
    def __init__(
        self,
        message: str = "An error occurred",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        data: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.data = data
        self.error_code = error_code
        super().__init__(self.message)


class NotFoundException(AppException):
    def __init__(
        self,
        message: str = "Resource not found",
        data: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            data=data,
            error_code=error_code,
        )


class BadRequestException(AppException):
    def __init__(
        self,
        message: str = "Bad request",
        data: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            data=data,
            error_code=error_code,
        )


class UnauthorizedException(AppException):
    def __init__(
        self,
        message: str = "Unauthorized",
        data: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            data=data,
            error_code=error_code,
        )


class ForbiddenException(AppException):
    def __init__(
        self,
        message: str = "Forbidden",
        data: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            data=data,
            error_code=error_code,
        )


class ConflictException(AppException):
    def __init__(
        self,
        message: str = "Resource conflict",
        data: Optional[Any] = None,
        error_code: Optional[str] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            data=data,
            error_code=error_code,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers on FastAPI application instance to guarantee
    all errors follow the standardized envelope:
    {
        "success": False,
        "data": ...,
        "message": ...,
        "error_code": ...
    }
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        content = {
            "success": False,
            "data": exc.data,
            "message": exc.message,
            "error_code": exc.error_code,
        }
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = []
        for err in exc.errors():
            loc = " -> ".join(str(item) for item in err.get("loc", []))
            msg = err.get("msg", "Invalid value")
            errors.append({"field": loc, "message": msg})

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "success": False,
                "data": errors,
                "message": "Dữ liệu yêu cầu không hợp lệ (Validation Error)",
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = str(exc.detail) if isinstance(exc.detail, str) else "HTTP Exception"
        data = exc.detail if not isinstance(exc.detail, str) else None
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": data,
                "message": message,
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
        message = str(exc) if settings.DEBUG else "Lỗi máy chủ nội bộ (Internal Server Error)"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": message,
            },
        )

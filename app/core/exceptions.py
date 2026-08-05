"""Application exceptions and global exception handlers.

Every error leaves the API in one consistent global envelope:
{
    "status": false,
    "message": str,
    "data": list | dict | None,
    "meta": {
        "path": str,
        "timestamp": str,
        "status_code": int
    }
}

Unhandled exceptions are logged with their full traceback server-side and never
leak internals to the client.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger
from app.core.response import error_response

logger = get_logger(__name__)


class AppError(Exception):
    """Base class for expected, client-facing application errors."""

    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def _build_error_meta(status_code: int, path: str) -> dict[str, Any]:
    return {
        "path": path,
        "status_code": status_code,
        "timestamp": datetime.now(UTC).isoformat(),
    }


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(
        message=exc.detail,
        meta=_build_error_meta(exc.status_code, request.url.path),
        status_code=exc.status_code,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    data = exc.detail if not isinstance(exc.detail, str) else None
    return error_response(
        message=message,
        data=data,
        meta=_build_error_meta(exc.status_code, request.url.path),
        status_code=exc.status_code,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    validation_errors = [
        {"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")}
        for e in exc.errors()
    ]
    return error_response(
        message="Validation error",
        data=validation_errors,
        meta=_build_error_meta(status.HTTP_422_UNPROCESSABLE_ENTITY, request.url.path),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        exc_info=exc,
    )
    return error_response(
        message="Internal server error",
        meta=_build_error_meta(status.HTTP_500_INTERNAL_SERVER_ERROR, request.url.path),
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)

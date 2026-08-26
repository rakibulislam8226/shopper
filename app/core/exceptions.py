"""Application exceptions and global exception handlers.

Every error leaves the API in one consistent global envelope:
{
    "status": false,
    "message": str,
    "data": list | dict | None,
    "error": {
        "path": str,
        "timestamp": str,
        "status_code": int
    },
    "meta": null
}

``meta`` stays reserved for pagination and is never populated on an error.

Unhandled exceptions are logged with their full traceback server-side and never
leak internals to the client.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger
from app.core.response import error_response

logger = get_logger(__name__)


class AppError(Exception):
    """Base class for expected, client-facing application errors."""

    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
        self.headers = headers


def _build_error_detail(status_code: int, path: str) -> dict[str, Any]:
    return {
        "path": path,
        "status_code": status_code,
        "timestamp": datetime.now(UTC).isoformat(),
    }


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(
        message=exc.detail,
        error=_build_error_detail(exc.status_code, request.url.path),
        status_code=exc.status_code,
        headers=exc.headers,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    data = exc.detail if not isinstance(exc.detail, str) else None
    return error_response(
        message=message,
        data=data,
        error=_build_error_detail(exc.status_code, request.url.path),
        status_code=exc.status_code,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    validation_errors = [
        {"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()
    ]
    return error_response(
        message="Validation error",
        data=validation_errors,
        error=_build_error_detail(status.HTTP_422_UNPROCESSABLE_ENTITY, request.url.path),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def pydantic_validation_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handles a bare ``pydantic.ValidationError`` — raised when a route builds
    a request model itself (e.g. from individually-declared ``Form(...)``
    fields, to work around FastAPI not flattening a Form-model alongside
    File() params) rather than letting FastAPI validate it during parameter
    resolution. Same envelope shape as ``RequestValidationError`` below, so
    the client can't tell which path produced it.
    """
    validation_errors = [
        {"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()
    ]
    return error_response(
        message="Validation error",
        data=validation_errors,
        error=_build_error_detail(status.HTTP_422_UNPROCESSABLE_ENTITY, request.url.path),
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
        error=_build_error_detail(status.HTTP_500_INTERNAL_SERVER_ERROR, request.url.path),
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(ValidationError, pydantic_validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)

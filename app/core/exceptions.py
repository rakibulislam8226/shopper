"""Application exceptions and global exception handlers.

Every error leaves the API in one consistent global envelope (see
`core/response.py` for the full shape):
{
    "status": false,
    "message": str,
    "data": null,
    "error": [{"field": str, "msg": str}] | null,
    "meta": null
}

Request-path/status/timestamp detail is not part of that envelope — it's
already captured server-side by the request-logging middleware in
`main.py`, so repeating it in every error body would be pure noise for a
client that already knows what it requested and what status came back.

Unhandled exceptions are logged with their full traceback server-side and never
leak internals to the client.
"""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger
from app.core.response import ApiFieldError, error_response

logger = get_logger(__name__)

# loc segments that describe *where* a value came from, not the field name
# itself — stripped before joining the rest into a dotted field path.
_NON_FIELD_LOC_PARTS = {"body", "query", "path", "header", "cookie"}


def _field_from_loc(loc: tuple[int | str, ...]) -> str:
    """Turn a pydantic/FastAPI error ``loc`` into a dotted field name.

    ``("body", "name")`` -> ``"name"``; ``("body", "items", 0, "sku")`` ->
    ``"items.0.sku"``; ``("body",)`` alone (a whole-model validator, e.g.
    "passwords don't match") -> ``""``, meaning "not any one field" — see
    `ApiFieldError`.
    """
    parts = [str(part) for part in loc if str(part) not in _NON_FIELD_LOC_PARTS]
    return ".".join(parts)


def _field_errors_from_pydantic(
    exc: ValidationError | RequestValidationError,
) -> list[ApiFieldError]:
    return [
        ApiFieldError(
            field=_field_from_loc(tuple(e.get("loc", ()))), msg=e.get("msg", "Invalid value")
        )
        for e in exc.errors()
    ]


class AppError(Exception):
    """Base class for expected, client-facing application errors.

    ``field`` names the request field this error belongs to (e.g.
    ``"phone"`` for "this phone number is already registered") so the client
    can show it inline; leave it unset for an error that isn't about any one
    field (auth/authorization failures, not-found, ...) — those are
    toast-only, carried by ``message`` alone.
    """

    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        field: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
        self.field = field
        self.headers = headers


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    errors = [ApiFieldError(field=exc.field, msg=exc.detail)] if exc.field else None
    return error_response(
        message=exc.detail,
        errors=errors,
        status_code=exc.status_code,
        headers=exc.headers,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    return error_response(message=message, status_code=exc.status_code)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return error_response(
        message="Please check the highlighted fields.",
        errors=_field_errors_from_pydantic(exc),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def pydantic_validation_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handles a bare ``pydantic.ValidationError`` — raised when a route builds
    a request model itself (e.g. from individually-declared ``Form(...)``
    fields, to work around FastAPI not flattening a Form-model alongside
    File() params) rather than letting FastAPI validate it during parameter
    resolution. Same envelope shape as ``RequestValidationError`` above, so
    the client can't tell which path produced it.
    """
    return error_response(
        message="Please check the highlighted fields.",
        errors=_field_errors_from_pydantic(exc),
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
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(ValidationError, pydantic_validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)

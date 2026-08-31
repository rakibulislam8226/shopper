"""Global standard API response envelope and response utility functions.

All API responses adhere to the standard schema:
{
    "status": bool,
    "message": str,
    "data": T | None,
    "error": list[{"field": str, "msg": str}] | None,
    "meta": PaginationMeta | None
}

``meta`` is reserved for pagination — it is only ever populated by
``paginated_response`` and is always ``null`` otherwise.

``error`` is always ``null`` on success. On failure it is either ``null``
(a general error with nothing to attach to a specific input — the client
shows ``message`` in a toast and nothing more) or a list of one-or-more
``{field, msg}`` pairs a form can match against its own field names to show
inline, alongside ``message`` in a toast. ``field`` is ``""`` for an error
that fails a whole submission rather than one input (e.g. a cross-field
rule) — a client should treat that the same as no field: toast-only.
"""

from __future__ import annotations

from typing import Any

from fastapi import status as http_status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class PaginationMeta(BaseModel):
    """Metadata payload for paginated list endpoints."""

    page: int = Field(ge=1, description="Current page number (1-indexed)")
    limit: int = Field(ge=1, description="Number of items per page")
    total: int = Field(ge=0, description="Total count of items across all pages")
    total_pages: int = Field(ge=0, description="Total number of pages")
    has_next: bool = Field(description="Whether a next page is available")
    has_prev: bool = Field(description="Whether a previous page is available")

    @classmethod
    def create(cls, page: int, limit: int, total: int) -> PaginationMeta:
        total_pages = (total + limit - 1) // limit if limit > 0 else 0
        return cls(
            page=page,
            limit=limit,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )


class ApiFieldError(BaseModel):
    """One error, matched to the request field it should be shown under.

    ``field`` is ``""`` when the error belongs to the submission as a whole
    rather than any single input (see the module docstring).
    """

    field: str = ""
    msg: str


class ApiResponse[T](BaseModel):
    """Standard unified response wrapper for all API endpoints."""

    status: bool = True
    message: str = "Success"
    data: T | None = None
    error: list[ApiFieldError] | None = None
    meta: PaginationMeta | None = None


def success_response(
    data: Any = None,
    message: str = "Success",
    meta: PaginationMeta | None = None,
    status_code: int = http_status.HTTP_200_OK,
) -> JSONResponse:
    """Build a standard JSONResponse for successful requests."""
    meta_dict = meta.model_dump() if isinstance(meta, BaseModel) else meta
    content = {
        "status": True,
        "message": message,
        "data": data,
        "error": None,
        "meta": meta_dict,
    }
    return JSONResponse(status_code=status_code, content=content)


def paginated_response(
    data: list[Any],
    page: int,
    limit: int,
    total: int,
    message: str = "Items retrieved successfully",
    status_code: int = http_status.HTTP_200_OK,
) -> JSONResponse:
    """Build a standard JSONResponse for paginated list queries."""
    meta = PaginationMeta.create(page=page, limit=limit, total=total)
    return success_response(
        data=data,
        message=message,
        meta=meta,
        status_code=status_code,
    )


def error_response(
    message: str = "An error occurred",
    errors: list[ApiFieldError] | None = None,
    status_code: int = http_status.HTTP_400_BAD_REQUEST,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Build a standard JSONResponse for failed/error requests.

    ``data`` is always ``null`` on an error response — a failure has nothing
    to hand back but ``message`` and, optionally, ``errors``.
    """
    content = {
        "status": False,
        "message": message,
        "data": None,
        "error": [e.model_dump() for e in errors] if errors else None,
        "meta": None,
    }
    return JSONResponse(status_code=status_code, content=content, headers=headers)

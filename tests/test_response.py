"""Unit tests for standard API response module."""

from __future__ import annotations

import json
from app.core.response import (
    PaginationMeta,
    error_response,
    paginated_response,
    success_response,
)


def test_pagination_meta_calculation() -> None:
    meta = PaginationMeta.create(page=2, limit=10, total=25)
    assert meta.page == 2
    assert meta.limit == 10
    assert meta.total == 25
    assert meta.total_pages == 3
    assert meta.has_next is True
    assert meta.has_prev is True


def test_pagination_meta_first_page() -> None:
    meta = PaginationMeta.create(page=1, limit=10, total=5)
    assert meta.total_pages == 1
    assert meta.has_next is False
    assert meta.has_prev is False


def test_success_response_structure() -> None:
    res = success_response(data={"id": 123}, message="Success test")
    assert res.status_code == 200
    content = json.loads(res.body.decode())
    assert content["status"] is True
    assert content["message"] == "Success test"
    assert content["data"] == {"id": 123}
    assert content["meta"] is None


def test_paginated_response_structure() -> None:
    items = [{"id": 1}, {"id": 2}]
    res = paginated_response(data=items, page=1, limit=10, total=2)
    assert res.status_code == 200
    content = json.loads(res.body.decode())
    assert content["status"] is True
    assert content["message"] == "Items retrieved successfully"
    assert content["data"] == items
    assert content["meta"] == {
        "page": 1,
        "limit": 10,
        "total": 2,
        "total_pages": 1,
        "has_next": False,
        "has_prev": False,
    }


def test_error_response_structure() -> None:
    res = error_response(message="Operation failed", status_code=400)
    assert res.status_code == 400
    content = json.loads(res.body.decode())
    assert content["status"] is False
    assert content["message"] == "Operation failed"
    assert content["data"] is None
    assert content["meta"] is None

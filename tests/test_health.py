"""Smoke test — confirms the app boots and the health endpoint answers.

Uses httpx's ASGI transport (no network). It accepts either a healthy 200 or a 503
with per-dependency status wrapped in the standard ApiResponse envelope.
"""

from __future__ import annotations

import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_health_contract() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")

    assert response.status_code in (200, 503)
    body = response.json()
    assert set(body) == {"status", "message", "data", "error", "meta"}
    assert isinstance(body["status"], bool)
    assert isinstance(body["message"], str)
    assert set(body["data"]) == {"status", "database", "redis"}
    assert body["data"]["status"] in ("ok", "error")
    # `meta` is reserved for pagination and is never populated by this endpoint.
    assert body["meta"] is None


def test_app_metadata() -> None:
    assert app.title == "Shopper API"

"""Smoke test — confirms the app boots and the health endpoint answers.

Uses httpx's ASGI transport (no network). It does not assume Postgres/Redis are
up: it accepts either a healthy 200 or a 503 with per-dependency status, so it
verifies the test runner and the endpoint contract rather than infrastructure.
"""

from __future__ import annotations

import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_health_contract() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code in (200, 503)
    body = response.json()
    assert set(body) == {"status", "database", "redis"}
    assert body["status"] in ("ok", "error")


def test_app_metadata() -> None:
    assert app.title == "Shopper API"

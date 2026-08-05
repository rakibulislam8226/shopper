"""Liveness/readiness endpoint.

Checks the two external dependencies the app needs — Postgres and Redis — and
reports each independently. Overall status is 200 only when both are reachable,
otherwise 503 so orchestrators and load balancers can act on it.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import get_db
from app.redis.client import get_redis

router = APIRouter(tags=["health"])
logger = get_logger(__name__)


async def _check_database(db: AsyncSession) -> bool:
    try:
        await db.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning("health_database_down", error=str(exc))
        return False


async def _check_redis(redis: Redis) -> bool:
    try:
        return bool(await redis.ping())
    except Exception as exc:
        logger.warning("health_redis_down", error=str(exc))
        return False


@router.get("/health", summary="Service health")
async def health(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> JSONResponse:
    database_ok = await _check_database(db)
    redis_ok = await _check_redis(redis)
    healthy = database_ok and redis_ok

    body = {
        "status": "ok" if healthy else "error",
        "database": "ok" if database_ok else "down",
        "redis": "ok" if redis_ok else "down",
    }
    code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=code, content=body)

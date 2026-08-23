"""Async Redis client.

A single connection pool is created from ``settings.redis_url`` and shared for
the process lifetime. It backs rate limiting and refresh-token storage today,
and caching in later phases.
"""

from __future__ import annotations

from redis.asyncio import Redis

from app.config import settings

redis_client: Redis = Redis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
)


async def get_redis() -> Redis:
    """FastAPI dependency returning the shared Redis client."""
    return redis_client


async def close_redis() -> None:
    """Close the Redis connection pool on application shutdown."""
    await redis_client.aclose()

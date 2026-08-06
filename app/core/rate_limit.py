"""Redis-backed request rate limiting.

Enforced as a global FastAPI dependency for every ``/api/`` route, keyed by
client IP + route path, using a fixed window counter (``INCR`` + ``PEXPIRE``
in a single Lua script so concurrent requests can never race past the limit).
Defaults come from ``settings.rate_limit_times`` / ``settings.rate_limit_seconds``.

Override or exempt one endpoint with the ``rate_limit`` decorator:

    @router.post("/login")
    @rate_limit(times=5, seconds=60)          # stricter than the global default
    async def login(...): ...

    @router.get("")
    @rate_limit(exempt=True)                  # not limited at all
    async def health(...): ...

The decorator must sit directly above the endpoint function (below the route
decorator) so its attribute lands on the exact callable FastAPI stores as
``route.endpoint`` — that object is what this module reads back via
``request.scope["route"]``, which Starlette populates once routing has
resolved, before dependencies run.
"""

from __future__ import annotations

import math
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, TypeVar

from starlette.requests import Request

from app.config import settings
from app.core.exceptions import AppError
from app.redis.client import redis_client

F = TypeVar("F", bound=Callable[..., Awaitable[Any]])

_CONFIG_ATTR = "_rate_limit_config"

# Atomic fixed-window counter: only the first request in a window sets the TTL,
# so concurrent requests can never each reset the window and bypass the limit.
_INCR_WITH_TTL = """
local count = redis.call("INCR", KEYS[1])
if count == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return count
"""


@dataclass(frozen=True)
class RateLimitConfig:
    times: int
    seconds: int
    exempt: bool = False


def rate_limit(
    *, times: int | None = None, seconds: int | None = None, exempt: bool = False
) -> Callable[[F], F]:
    """Override (or exempt) the global default rate limit for one endpoint."""

    def decorator(func: F) -> F:
        setattr(
            func,
            _CONFIG_ATTR,
            RateLimitConfig(
                times=times if times is not None else settings.rate_limit_times,
                seconds=seconds if seconds is not None else settings.rate_limit_seconds,
                exempt=exempt,
            ),
        )
        return func

    return decorator


def _client_identifier(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(request: Request) -> None:
    """Global dependency — wire once via ``FastAPI(dependencies=[...])``."""
    if not request.url.path.startswith("/api/"):
        return

    route = request.scope.get("route")
    endpoint = getattr(route, "endpoint", None)
    config = getattr(endpoint, _CONFIG_ATTR, None) or RateLimitConfig(
        times=settings.rate_limit_times, seconds=settings.rate_limit_seconds
    )
    if config.exempt:
        return

    route_path = getattr(route, "path", request.url.path)
    identifier = _client_identifier(request)
    key = f"ratelimit:{route_path}:{identifier}"

    count = await redis_client.eval(_INCR_WITH_TTL, 1, key, config.seconds * 1000)
    if count > config.times:
        ttl_ms = await redis_client.pttl(key)
        retry_after = max(1, math.ceil(ttl_ms / 1000)) if ttl_ms > 0 else config.seconds
        raise AppError(
            detail=f"Too many requests. Try again in {retry_after}s.",
            status_code=429,
            headers={"Retry-After": str(retry_after)},
        )

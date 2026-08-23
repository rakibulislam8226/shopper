"""FastAPI application entrypoint.

Wires configuration, structured logging, CORS, global exception handling, a
request-id logging middleware, and the health router. Startup verifies that
Postgres and Redis are reachable and logs loudly if they are not.
"""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.middleware.base import RequestResponseEndpoint

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import enforce_rate_limit
from app.core.spa import register_spa
from app.db import models as _models  # noqa: F401  — registers every ORM mapper
from app.db.session import engine
from app.health.router import router as health_router
from app.modules.users.router import router as users_router
from app.redis.client import close_redis, redis_client

logger = get_logger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"


async def _verify_dependencies() -> None:
    """Log the reachability of Postgres and Redis at startup."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("startup_database_ok", host=settings.postgres_host, db=settings.postgres_db)
    except Exception as exc:
        logger.error("startup_database_unreachable", error=str(exc))

    try:
        await redis_client.ping()
        logger.info("startup_redis_ok", host=settings.redis_host)
    except Exception as exc:
        logger.error("startup_redis_unreachable", error=str(exc))


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger.info("startup", app_env=settings.app_env, port=settings.api_port)
    await _verify_dependencies()
    yield
    await close_redis()
    await engine.dispose()
    logger.info("shutdown")


app = FastAPI(
    title="Shopper API",
    description="Multi-tenant shop/organization management SaaS — API surface",
    version="0.0.1",
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    openapi_url=settings.openapi_url,
    lifespan=lifespan,
    dependencies=[Depends(enforce_rate_limit)],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[REQUEST_ID_HEADER],
)

register_exception_handlers(app)


@app.middleware("http")
async def request_context_middleware(
    request: Request, call_next: RequestResponseEndpoint
) -> Response:
    """Attach a per-request id to logs and echo it back on the response."""
    request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())

    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - started) * 1000, 2)

    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    response.headers[REQUEST_ID_HEADER] = request_id
    return response


app.include_router(health_router, prefix="/api/health")
app.include_router(users_router, prefix="/api/users")
register_spa(app)

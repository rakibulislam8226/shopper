"""Async SQLAlchemy engine and session factory.

The engine is built from ``settings.database_url`` (asyncpg). ``get_db`` is the
FastAPI dependency route handlers use to obtain a scoped ``AsyncSession``.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

# Importing the registry here — not in each entrypoint — is what makes every
# ORM mapper resolvable. Without it a string relationship like
# ``Mapped[Shop]`` fails the moment a session runs its first query
# from a process that imported only one model (the seed CLI, a script).
from app.db import models as _models  # noqa: F401

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Yield a request-scoped async session, rolling back on error."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise

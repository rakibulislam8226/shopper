"""Database access for the users module. No business rules live here."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import User


async def get_user_by_phone(db: AsyncSession, phone: str) -> User | None:
    """Return the active (not soft-deleted) user with this phone, if any."""
    result = await db.execute(select(User).where(User.phone == phone, User.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_user_by_uid(db: AsyncSession, uid: UUID) -> User | None:
    """Return the active (not soft-deleted) user with this public uid, if any."""
    result = await db.execute(select(User).where(User.uid == uid, User.deleted_at.is_(None)))
    return result.scalar_one_or_none()

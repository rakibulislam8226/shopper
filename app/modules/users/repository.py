"""Database access for the users module. No business rules live here."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.users.models import User

# active_shop is read on every login/refresh response (UserPublic.active_shop),
# so it is always eager-loaded here — AsyncSession has no implicit lazy load.
_WITH_ACTIVE_SHOP = selectinload(User.active_shop)


async def get_user_by_phone(db: AsyncSession, phone: str) -> User | None:
    """Return the active (not soft-deleted) user with this phone, if any."""
    result = await db.execute(
        select(User)
        .where(User.phone == phone, User.deleted_at.is_(None))
        .options(_WITH_ACTIVE_SHOP)
    )
    return result.scalar_one_or_none()


async def get_user_by_uid(db: AsyncSession, uid: UUID) -> User | None:
    """Return the active (not soft-deleted) user with this public uid, if any."""
    result = await db.execute(
        select(User).where(User.uid == uid, User.deleted_at.is_(None)).options(_WITH_ACTIVE_SHOP)
    )
    return result.scalar_one_or_none()


async def list_users(
    db: AsyncSession, *, q: str | None = None, page: int = 1, limit: int = 20
) -> tuple[list[User], int]:
    """One page of every platform user, newest first — the platform-admin
    "manage users" screen. ``q`` matches a substring of name or phone.
    """
    conditions: list[ColumnElement[bool]] = [User.deleted_at.is_(None)]
    if q:
        pattern = f"%{q}%"
        conditions.append(or_(User.name.ilike(pattern), User.phone.ilike(pattern)))

    base_query = select(User).where(*conditions)
    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))

    result = await db.execute(
        base_query.options(_WITH_ACTIVE_SHOP)
        .order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return list(result.scalars().all()), total or 0


async def count_users(db: AsyncSession) -> tuple[int, int]:
    """Return (total users, total superusers) for the admin stats screen."""
    total = await db.scalar(select(func.count()).where(User.deleted_at.is_(None)))
    superusers = await db.scalar(
        select(func.count()).where(User.deleted_at.is_(None), User.is_superuser.is_(True))
    )
    return total or 0, superusers or 0

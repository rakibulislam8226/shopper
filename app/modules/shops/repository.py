"""Database access for the shops module. No business rules live here."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.shops.models import Shop


async def get_shop_by_slug(db: AsyncSession, slug: str) -> Shop | None:
    """Return the active (not soft-deleted) shop with this slug, if any."""
    result = await db.execute(select(Shop).where(Shop.slug == slug, Shop.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def slug_exists(db: AsyncSession, slug: str) -> bool:
    return await get_shop_by_slug(db, slug) is not None

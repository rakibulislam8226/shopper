"""Database access for the shops module. No business rules live here."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.shops.models import Shop, ShopDocument


async def get_shop_by_slug(db: AsyncSession, slug: str) -> Shop | None:
    """Return the active (not soft-deleted) shop with this slug, if any."""
    result = await db.execute(select(Shop).where(Shop.slug == slug, Shop.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def slug_exists(db: AsyncSession, slug: str) -> bool:
    return await get_shop_by_slug(db, slug) is not None


async def get_shop_by_uid(db: AsyncSession, uid: UUID) -> Shop | None:
    """Return the active (not soft-deleted) shop with this public uid, if any."""
    result = await db.execute(select(Shop).where(Shop.uid == uid, Shop.deleted_at.is_(None)))
    return result.scalar_one_or_none()


async def get_shop_documents(db: AsyncSession, shop_id: int) -> list[ShopDocument]:
    """Return every document submitted for this shop, newest first."""
    result = await db.execute(
        select(ShopDocument)
        .where(ShopDocument.shop_id == shop_id, ShopDocument.deleted_at.is_(None))
        .order_by(ShopDocument.created_at.desc())
    )
    return list(result.scalars().all())

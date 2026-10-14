"""Database access for the products module. No business rules live here."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import Product, ProductCategory


async def get_category_by_name(
    db: AsyncSession, *, shop_id: int, name: str
) -> ProductCategory | None:
    result = await db.execute(
        select(ProductCategory).where(
            ProductCategory.shop_id == shop_id,
            ProductCategory.name == name,
            ProductCategory.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def get_category_by_uid(
    db: AsyncSession, *, shop_id: int, uid: UUID
) -> ProductCategory | None:
    result = await db.execute(
        select(ProductCategory).where(
            ProductCategory.shop_id == shop_id,
            ProductCategory.uid == uid,
            ProductCategory.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def list_categories(db: AsyncSession, *, shop_id: int) -> list[ProductCategory]:
    result = await db.execute(
        select(ProductCategory)
        .where(ProductCategory.shop_id == shop_id, ProductCategory.deleted_at.is_(None))
        .order_by(func.lower(ProductCategory.name))
    )
    return list(result.scalars().all())


async def get_product_by_uid(
    db: AsyncSession, *, shop_id: int, uid: UUID
) -> tuple[Product, ProductCategory | None] | None:
    result = await db.execute(
        select(Product, ProductCategory)
        .outerjoin(ProductCategory, ProductCategory.id == Product.category_id)
        .where(Product.shop_id == shop_id, Product.uid == uid, Product.deleted_at.is_(None))
    )
    row = result.first()
    return (row[0], row[1]) if row else None


async def get_product_by_sku(db: AsyncSession, *, shop_id: int, sku: str) -> Product | None:
    result = await db.execute(
        select(Product).where(
            Product.shop_id == shop_id, Product.sku == sku, Product.deleted_at.is_(None)
        )
    )
    return result.scalar_one_or_none()


async def list_products(
    db: AsyncSession,
    *,
    shop_id: int,
    q: str | None = None,
    category_id: int | None = None,
    is_active: bool | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[tuple[Product, ProductCategory | None]], int]:
    conditions = [Product.shop_id == shop_id, Product.deleted_at.is_(None)]
    if category_id is not None:
        conditions.append(Product.category_id == category_id)
    if is_active is not None:
        conditions.append(Product.is_active == is_active)
    if q:
        pattern = f"%{q}%"
        conditions.append(or_(Product.name.ilike(pattern), Product.sku.ilike(pattern)))

    base_query = (
        select(Product, ProductCategory)
        .outerjoin(ProductCategory, ProductCategory.id == Product.category_id)
        .where(*conditions)
    )
    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))

    result = await db.execute(
        base_query.order_by(func.lower(Product.name)).offset((page - 1) * limit).limit(limit)
    )
    rows = [(row[0], row[1]) for row in result.all()]
    return rows, total or 0

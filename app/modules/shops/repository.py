"""Database access for the shops module. No business rules live here."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import MembershipRole, MembershipStatus, ShopDocumentType, ShopStatus
from app.modules.memberships.models import ShopMembership
from app.modules.shops.models import Shop, ShopDocument
from app.modules.users.models import User


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


async def get_current_shop_document(
    db: AsyncSession, *, shop_id: int, document_type: ShopDocumentType
) -> ShopDocument | None:
    """Return the current (not soft-deleted) document of this type, if any.

    A shop has at most one *current* document per type — re-submitting a
    type supersedes the previous row rather than adding a second one.
    """
    result = await db.execute(
        select(ShopDocument).where(
            ShopDocument.shop_id == shop_id,
            ShopDocument.type == document_type,
            ShopDocument.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def get_shop_owner(db: AsyncSession, shop_id: int) -> User | None:
    """Return the shop's ACTIVE owner, if any — for the admin review screen."""
    result = await db.execute(
        select(User)
        .join(ShopMembership, ShopMembership.user_id == User.id)
        .where(
            ShopMembership.shop_id == shop_id,
            ShopMembership.role == MembershipRole.OWNER,
            ShopMembership.status == MembershipStatus.ACTIVE,
        )
    )
    return result.scalar_one_or_none()


async def list_shops_for_review(
    db: AsyncSession,
    *,
    status_filter: ShopStatus | None = None,
    q: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[tuple[Shop, User | None]], int]:
    """One page of shops together with their owner, newest-submitted first —
    the platform-admin "review shops" screen.

    ``status_filter`` narrows to one lifecycle status (typically PENDING, the
    review queue); omitted, every non-deleted shop is returned. ``q`` matches
    a substring of the shop's name/slug or its owner's name/phone.
    """
    owner_join = ShopMembership.role == MembershipRole.OWNER
    base_query = (
        select(Shop, User)
        .outerjoin(
            ShopMembership,
            (ShopMembership.shop_id == Shop.id)
            & owner_join
            & (ShopMembership.status == MembershipStatus.ACTIVE),
        )
        .outerjoin(User, User.id == ShopMembership.user_id)
        .where(Shop.deleted_at.is_(None))
    )

    if status_filter is not None:
        base_query = base_query.where(Shop.status == status_filter)
    if q:
        pattern = f"%{q}%"
        base_query = base_query.where(
            or_(
                Shop.name.ilike(pattern),
                Shop.slug.ilike(pattern),
                User.name.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))

    result = await db.execute(
        base_query.order_by(Shop.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    rows = [(row[0], row[1]) for row in result.all()]
    return rows, total or 0


async def count_shops_by_status(db: AsyncSession) -> dict[ShopStatus, int]:
    """Row count per lifecycle status, for the admin stats screen."""
    result = await db.execute(
        select(Shop.status, func.count()).where(Shop.deleted_at.is_(None)).group_by(Shop.status)
    )
    return {row[0]: row[1] for row in result.all()}

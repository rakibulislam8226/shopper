"""Database access for the memberships module. No business rules live here."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import MembershipStatus
from app.modules.memberships.models import ShopMembership
from app.modules.sales.models import SaleTransaction
from app.modules.users.models import User


async def get_active_membership(
    db: AsyncSession, *, user_id: int, shop_id: int
) -> ShopMembership | None:
    """Return the caller's ACTIVE membership on this shop, if any."""
    result = await db.execute(
        select(ShopMembership).where(
            ShopMembership.user_id == user_id,
            ShopMembership.shop_id == shop_id,
            ShopMembership.status == MembershipStatus.ACTIVE,
        )
    )
    return result.scalar_one_or_none()


async def get_membership(
    db: AsyncSession, *, user_id: int, shop_id: int
) -> ShopMembership | None:
    """Return the (user, shop) membership row regardless of status, if any.

    Exactly one row ever exists per pair (see the model docstring) — used to
    tell apart creating a brand-new row from reactivating an existing one.
    """
    result = await db.execute(
        select(ShopMembership).where(
            ShopMembership.user_id == user_id,
            ShopMembership.shop_id == shop_id,
        )
    )
    return result.scalar_one_or_none()


async def list_shop_members(
    db: AsyncSession, *, shop_id: int
) -> list[tuple[ShopMembership, User]]:
    """Return every ACTIVE membership for a shop together with its user."""
    result = await db.execute(
        select(ShopMembership, User)
        .join(User, User.id == ShopMembership.user_id)
        .where(
            ShopMembership.shop_id == shop_id,
            ShopMembership.status == MembershipStatus.ACTIVE,
        )
    )
    return [(row[0], row[1]) for row in result.all()]


async def get_total_sales_by_user(
    db: AsyncSession, *, shop_id: int, user_ids: list[int]
) -> dict[int, Decimal]:
    """Sum of `total_amount` per seller, for the employee list's "total sales"
    column. One grouped query for every member being listed — never a
    per-row query. Sellers with no sales simply have no entry (treat a
    missing key as zero).
    """
    if not user_ids:
        return {}

    result = await db.execute(
        select(SaleTransaction.sold_by_user_id, func.sum(SaleTransaction.total_amount))
        .where(
            SaleTransaction.shop_id == shop_id,
            SaleTransaction.sold_by_user_id.in_(user_ids),
            SaleTransaction.deleted_at.is_(None),
        )
        .group_by(SaleTransaction.sold_by_user_id)
    )
    totals: dict[int, Decimal] = {}
    for user_id, total in result.all():
        totals[user_id] = total
    return totals

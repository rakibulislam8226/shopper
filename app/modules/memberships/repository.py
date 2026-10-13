"""Database access for the memberships module. No business rules live here."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import MembershipRole, MembershipStatus
from app.modules.memberships.models import ShopMembership
from app.modules.sales.models import SaleTransaction
from app.modules.shops.models import Shop
from app.modules.users.models import User

# Owner, then manager, then salesman — the employee list's display order.
# A SQL-level CASE rather than a Python sort: rows are paginated in the
# database, so the ordering that determines *which* rows land on which page
# has to happen there too.
_ROLE_RANK = case(
    (ShopMembership.role == MembershipRole.OWNER, 0),
    (ShopMembership.role == MembershipRole.MANAGER, 1),
    (ShopMembership.role == MembershipRole.SALESMAN, 2),
    else_=3,
)


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
    db: AsyncSession,
    *,
    shop_id: int,
    q: str | None = None,
    role: MembershipRole | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[tuple[ShopMembership, User]], int]:
    """Return one page of ACTIVE memberships for a shop together with their
    user, ordered owner-first then alphabetically, plus the total row count
    across every page (for the response's pagination `meta`).

    ``q`` matches a substring of the member's name or phone
    (case-insensitive); ``role`` narrows to exactly one role. Both are
    optional — an absent filter matches every row.
    """
    conditions = [
        ShopMembership.shop_id == shop_id,
        ShopMembership.status == MembershipStatus.ACTIVE,
    ]
    if role is not None:
        conditions.append(ShopMembership.role == role)
    if q:
        pattern = f"%{q}%"
        conditions.append(or_(User.name.ilike(pattern), User.phone.ilike(pattern)))

    base_query = (
        select(ShopMembership, User)
        .join(User, User.id == ShopMembership.user_id)
        .where(*conditions)
    )

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))

    result = await db.execute(
        base_query.order_by(_ROLE_RANK, func.lower(User.name))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = [(row[0], row[1]) for row in result.all()]
    return rows, total or 0


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


async def get_user_organizations(
    db: AsyncSession, *, user_ids: list[int]
) -> dict[int, list[tuple[Shop, MembershipRole]]]:
    """Active (shop, role) pairs per user — one query for any number of users."""
    if not user_ids:
        return {}

    result = await db.execute(
        select(ShopMembership.user_id, Shop, ShopMembership.role)
        .join(Shop, Shop.id == ShopMembership.shop_id)
        .where(
            ShopMembership.user_id.in_(user_ids),
            ShopMembership.status == MembershipStatus.ACTIVE,
        )
    )
    organizations: dict[int, list[tuple[Shop, MembershipRole]]] = {}
    for user_id, shop, role in result.all():
        organizations.setdefault(user_id, []).append((shop, role))
    return organizations

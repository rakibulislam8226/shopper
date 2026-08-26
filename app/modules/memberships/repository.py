"""Database access for the memberships module. No business rules live here."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import MembershipStatus
from app.modules.memberships.models import ShopMembership


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

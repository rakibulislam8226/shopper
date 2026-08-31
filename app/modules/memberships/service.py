"""Business logic for shop staff management — adding and listing managers and
salesmen for the caller's shop.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.security import hash_password
from app.db.enums import MembershipRole, MembershipStatus
from app.modules.memberships.models import ShopMembership
from app.modules.memberships.repository import (
    get_active_membership,
    get_membership,
    get_total_sales_by_user,
    list_shop_members,
)
from app.modules.memberships.schemas import (
    AddMemberRequest,
    AddMemberResponse,
    MemberPublic,
    MembersListResponse,
)
from app.modules.shops.models import Shop
from app.modules.shops.repository import get_shop_by_uid
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_phone

logger = get_logger(__name__)

_SHOP_NOT_FOUND = "Shop not found"
_ONLY_MANAGERS = "Only the shop owner or a manager can do this"
_ONLY_OWNER_ADDS_MANAGER = "Only the shop owner can add a manager"
_ALREADY_A_MEMBER = "This phone number already belongs to a member of this shop"


async def _require_membership(
    db: AsyncSession, *, shop_uid: UUID, user_id: int
) -> tuple[Shop, ShopMembership]:
    """Return the shop and the caller's ACTIVE membership on it.

    404 either way — the caller has no reason to know a shop uid resolves to
    anything if they aren't already one of its members.
    """
    shop = await get_shop_by_uid(db, shop_uid)
    if shop is None:
        raise AppError(_SHOP_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    membership = await get_active_membership(db, user_id=user_id, shop_id=shop.id)
    if membership is None:
        raise AppError(_SHOP_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    return shop, membership


async def require_shop_manager(
    db: AsyncSession, *, shop_uid: UUID, user_id: int
) -> tuple[Shop, ShopMembership]:
    """Return the shop and the caller's membership if it's OWNER or MANAGER.

    Shared by every staff-management endpoint — a salesman can see the shop
    exists (they're a member of it) but has no say in who else works there.
    """
    shop, membership = await _require_membership(db, shop_uid=shop_uid, user_id=user_id)
    if membership.role not in (MembershipRole.OWNER, MembershipRole.MANAGER):
        raise AppError(_ONLY_MANAGERS, status_code=status.HTTP_403_FORBIDDEN)
    return shop, membership


def _member_public(
    user: User, membership: ShopMembership, *, total_sales: Decimal = Decimal("0.00")
) -> MemberPublic:
    return MemberPublic(
        user_uid=user.uid,
        name=user.name,
        phone=user.phone,
        role=membership.role,
        status=membership.status,
        joined_at=membership.joined_at,
        last_login_at=user.last_login_at,
        total_sales=total_sales,
    )


async def add_member(
    db: AsyncSession, *, shop_uid: UUID, actor_user_id: int, payload: AddMemberRequest
) -> AddMemberResponse:
    """Add a manager or salesman to the caller's shop.

    Owners can add either role; managers can only add salesmen (checked
    below, on top of `require_shop_manager` which already keeps plain
    salesmen out entirely). If ``payload.phone`` already belongs to a user,
    that existing account is attached to this shop instead of a second one
    being created — see `AddMemberRequest` for why its password is ignored
    in that case.
    """
    shop, actor_membership = await require_shop_manager(
        db, shop_uid=shop_uid, user_id=actor_user_id
    )

    if payload.role == MembershipRole.MANAGER and actor_membership.role != MembershipRole.OWNER:
        raise AppError(_ONLY_OWNER_ADDS_MANAGER, status_code=status.HTTP_403_FORBIDDEN)

    user = await get_user_by_phone(db, payload.phone)
    created_new_account = user is None

    if user is None:
        user = User(
            name=payload.name,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        await db.flush()  # assign user.id for the membership FK below

    membership = await get_membership(db, user_id=user.id, shop_id=shop.id)
    if membership is not None:
        if membership.status == MembershipStatus.ACTIVE:
            raise AppError(_ALREADY_A_MEMBER, status_code=status.HTTP_409_CONFLICT, field="phone")
        # Reactivate rather than insert a second row — see the model docstring.
        membership.role = payload.role
        membership.status = MembershipStatus.ACTIVE
        membership.invited_by_user_id = actor_user_id
        membership.joined_at = datetime.now(UTC)
        membership.left_at = None
    else:
        membership = ShopMembership(
            user_id=user.id,
            shop_id=shop.id,
            role=payload.role,
            invited_by_user_id=actor_user_id,
        )
        db.add(membership)

    await db.commit()
    await db.refresh(user)
    await db.refresh(membership)

    logger.info(
        "shop_member_added",
        shop_uid=str(shop.uid),
        user_uid=str(user.uid),
        role=payload.role.value,
        created_new_account=created_new_account,
    )
    return AddMemberResponse(
        member=_member_public(user, membership), created_new_account=created_new_account
    )


async def list_members(
    db: AsyncSession,
    *,
    shop_uid: UUID,
    user_id: int,
    q: str | None = None,
    role: MembershipRole | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[MembersListResponse, int]:
    """List one page of the caller's shop's active members, optionally
    filtered by a name/phone search (``q``) and/or an exact ``role``.

    Any active member can view. Returns the response alongside the total
    row count across every page, for the caller (the router) to build the
    envelope's pagination ``meta`` from.
    """
    shop, viewer_membership = await _require_membership(db, shop_uid=shop_uid, user_id=user_id)

    rows, total = await list_shop_members(
        db, shop_id=shop.id, q=q, role=role, page=page, limit=limit
    )

    sales_by_user = await get_total_sales_by_user(
        db, shop_id=shop.id, user_ids=[user.id for _membership, user in rows]
    )

    response = MembersListResponse(
        members=[
            _member_public(
                user, membership, total_sales=sales_by_user.get(user.id, Decimal("0.00"))
            )
            for membership, user in rows
        ],
        viewer_role=viewer_membership.role,
    )
    return response, total

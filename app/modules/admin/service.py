"""Business logic for platform-admin: shop review and user management."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.db.enums import MembershipRole, ShopStatus
from app.modules.admin.schemas import (
    AdminShopDetailResponse,
    AdminShopListResponse,
    AdminShopMembersResponse,
    AdminShopSummary,
    AdminStatsResponse,
    AdminUserOrganization,
    AdminUsersListResponse,
    AdminUserSummary,
    RejectShopRequest,
    ShopStatusCounts,
)
from app.modules.memberships.repository import (
    get_total_sales_by_user,
    get_user_organizations,
    list_shop_members,
)
from app.modules.memberships.service import member_public
from app.modules.shops.models import Shop
from app.modules.shops.repository import (
    count_shops_by_status,
    get_shop_by_uid,
    get_shop_documents,
    get_shop_owner,
    list_shops_for_review,
)
from app.modules.shops.schemas import ShopDocumentPublic, ShopPublic
from app.modules.users.models import User
from app.modules.users.repository import count_users, get_user_by_uid
from app.modules.users.repository import list_users as list_users_repo
from app.modules.users.schemas import UserPublic

logger = get_logger(__name__)

_SHOP_NOT_FOUND = "Shop not found"
_NOT_PENDING_OR_REJECTED = "Only a pending or previously rejected shop can be approved"
_NOT_PENDING = "Only a pending shop can be rejected"
_NOT_ACTIVE = "Only an active shop can be suspended"
_NOT_SUSPENDED = "Only a suspended shop can be reactivated"
_ALREADY_REMOVED = "This shop has already been removed"
_USER_NOT_FOUND = "User not found"
_CANNOT_DEACTIVATE_SELF = "You can't deactivate your own account"


async def _get_shop_or_404(db: AsyncSession, shop_uid: UUID) -> Shop:
    shop = await get_shop_by_uid(db, shop_uid)
    if shop is None:
        raise AppError(_SHOP_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)
    return shop


def _user_summary(user: User, organizations: list[tuple[Shop, MembershipRole]]) -> AdminUserSummary:
    return AdminUserSummary(
        uid=user.uid,
        name=user.name,
        phone=user.phone,
        is_superuser=user.is_superuser,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        organizations=[
            AdminUserOrganization(shop=ShopPublic.model_validate(shop), role=role)
            for shop, role in organizations
        ],
    )


async def list_shops(
    db: AsyncSession, *, status_filter: ShopStatus | None, q: str | None, page: int, limit: int
) -> tuple[AdminShopListResponse, int]:
    rows, total = await list_shops_for_review(
        db, status_filter=status_filter, q=q, page=page, limit=limit
    )
    response = AdminShopListResponse(
        shops=[
            AdminShopSummary(
                shop=ShopPublic.model_validate(shop),
                owner=UserPublic.model_validate(owner) if owner else None,
            )
            for shop, owner in rows
        ]
    )
    return response, total


async def get_shop_for_review(db: AsyncSession, *, shop_uid: UUID) -> AdminShopDetailResponse:
    shop = await _get_shop_or_404(db, shop_uid)
    owner = await get_shop_owner(db, shop.id)
    documents = await get_shop_documents(db, shop.id)

    return AdminShopDetailResponse(
        shop=ShopPublic.model_validate(shop),
        owner=UserPublic.model_validate(owner) if owner else None,
        documents=[ShopDocumentPublic.model_validate(document) for document in documents],
    )


async def approve_shop(db: AsyncSession, *, shop_uid: UUID, reviewed_by_user_id: int) -> ShopPublic:
    """PENDING or REJECTED -> ACTIVE; the latter covers reconsideration."""
    shop = await _get_shop_or_404(db, shop_uid)
    if shop.status not in (ShopStatus.PENDING, ShopStatus.REJECTED):
        raise AppError(_NOT_PENDING_OR_REJECTED, status_code=status.HTTP_409_CONFLICT)

    shop.status = ShopStatus.ACTIVE
    shop.rejection_reason = None
    await db.commit()
    await db.refresh(shop)

    logger.info("shop_approved", shop_uid=str(shop.uid), reviewed_by_user_id=reviewed_by_user_id)
    return ShopPublic.model_validate(shop)


async def reject_shop(
    db: AsyncSession, *, shop_uid: UUID, reviewed_by_user_id: int, payload: RejectShopRequest
) -> ShopPublic:
    shop = await _get_shop_or_404(db, shop_uid)
    if shop.status != ShopStatus.PENDING:
        raise AppError(_NOT_PENDING, status_code=status.HTTP_409_CONFLICT)

    shop.status = ShopStatus.REJECTED
    shop.rejection_reason = payload.reason
    await db.commit()
    await db.refresh(shop)

    logger.info(
        "shop_rejected",
        shop_uid=str(shop.uid),
        reviewed_by_user_id=reviewed_by_user_id,
        has_reason=bool(payload.reason),
    )
    return ShopPublic.model_validate(shop)


async def suspend_shop(db: AsyncSession, *, shop_uid: UUID, reviewed_by_user_id: int) -> ShopPublic:
    shop = await _get_shop_or_404(db, shop_uid)
    if shop.status != ShopStatus.ACTIVE:
        raise AppError(_NOT_ACTIVE, status_code=status.HTTP_409_CONFLICT)

    shop.status = ShopStatus.SUSPENDED
    await db.commit()
    await db.refresh(shop)

    logger.info("shop_suspended", shop_uid=str(shop.uid), reviewed_by_user_id=reviewed_by_user_id)
    return ShopPublic.model_validate(shop)


async def reactivate_shop(
    db: AsyncSession, *, shop_uid: UUID, reviewed_by_user_id: int
) -> ShopPublic:
    shop = await _get_shop_or_404(db, shop_uid)
    if shop.status != ShopStatus.SUSPENDED:
        raise AppError(_NOT_SUSPENDED, status_code=status.HTTP_409_CONFLICT)

    shop.status = ShopStatus.ACTIVE
    await db.commit()
    await db.refresh(shop)

    logger.info("shop_reactivated", shop_uid=str(shop.uid), reviewed_by_user_id=reviewed_by_user_id)
    return ShopPublic.model_validate(shop)


async def remove_shop(db: AsyncSession, *, shop_uid: UUID, reviewed_by_user_id: int) -> ShopPublic:
    """Terminal: there is no endpoint back out of REMOVED."""
    shop = await _get_shop_or_404(db, shop_uid)
    if shop.status == ShopStatus.REMOVED:
        raise AppError(_ALREADY_REMOVED, status_code=status.HTTP_409_CONFLICT)

    shop.status = ShopStatus.REMOVED
    await db.commit()
    await db.refresh(shop)

    logger.info("shop_removed", shop_uid=str(shop.uid), reviewed_by_user_id=reviewed_by_user_id)
    return ShopPublic.model_validate(shop)


async def list_users(
    db: AsyncSession, *, q: str | None, page: int, limit: int
) -> tuple[AdminUsersListResponse, int]:
    rows, total = await list_users_repo(db, q=q, page=page, limit=limit)
    organizations = await get_user_organizations(db, user_ids=[user.id for user in rows])

    response = AdminUsersListResponse(
        users=[_user_summary(user, organizations.get(user.id, [])) for user in rows]
    )
    return response, total


async def get_user_for_admin(db: AsyncSession, *, user_uid: UUID) -> AdminUserSummary:
    user = await get_user_by_uid(db, user_uid)
    if user is None:
        raise AppError(_USER_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    organizations = await get_user_organizations(db, user_ids=[user.id])
    return _user_summary(user, organizations.get(user.id, []))


async def set_user_active(
    db: AsyncSession, *, user_uid: UUID, active: bool, actor_user_id: int
) -> AdminUserSummary:
    user = await get_user_by_uid(db, user_uid)
    if user is None:
        raise AppError(_USER_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    if not active and user.id == actor_user_id:
        raise AppError(_CANNOT_DEACTIVATE_SELF, status_code=status.HTTP_403_FORBIDDEN)

    user.is_active = active
    await db.commit()
    await db.refresh(user)

    logger.info(
        "user_active_flag_changed",
        user_uid=str(user.uid),
        active=active,
        actor_user_id=actor_user_id,
    )
    organizations = await get_user_organizations(db, user_ids=[user.id])
    return _user_summary(user, organizations.get(user.id, []))


async def get_stats(db: AsyncSession) -> AdminStatsResponse:
    shop_counts = await count_shops_by_status(db)
    total_users, total_superusers = await count_users(db)

    return AdminStatsResponse(
        shops_by_status=ShopStatusCounts.from_counts(shop_counts),
        total_users=total_users,
        total_superusers=total_superusers,
    )


async def list_shop_members_for_admin(
    db: AsyncSession, *, shop_uid: UUID, page: int, limit: int
) -> tuple[AdminShopMembersResponse, int]:
    """Unlike the owner/manager-facing endpoint in `memberships`, a superuser
    needs no membership of their own on the shop to see its staff.
    """
    shop = await _get_shop_or_404(db, shop_uid)
    rows, total = await list_shop_members(db, shop_id=shop.id, page=page, limit=limit)

    sales_by_user = await get_total_sales_by_user(
        db, shop_id=shop.id, user_ids=[user.id for _membership, user in rows]
    )
    response = AdminShopMembersResponse(
        members=[
            member_public(user, membership, total_sales=sales_by_user.get(user.id, Decimal("0.00")))
            for membership, user in rows
        ]
    )
    return response, total

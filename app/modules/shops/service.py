"""Business logic for shop registration."""

from __future__ import annotations

import re
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.enums import MembershipRole
from app.modules.memberships.models import ShopMembership
from app.modules.shops.models import Shop
from app.modules.shops.repository import slug_exists
from app.modules.shops.schemas import ShopPublic, ShopRegisterRequest, ShopRegisterResponse
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_phone
from app.modules.users.schemas import TokenPair, UserPublic
from app.redis.client import redis_client

logger = get_logger(__name__)

_WRONG_PASSWORD = "Invalid password for this phone number"
_SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")


async def _unique_slug(db: AsyncSession, name: str) -> str:
    """Slugify ``name`` and disambiguate with a numeric suffix if taken."""
    base = _SLUG_INVALID_CHARS.sub("-", name.lower()).strip("-") or "shop"
    slug = base
    suffix = 1
    while await slug_exists(db, slug):
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


async def _issue_tokens(user: User) -> TokenPair:
    subject = str(user.uid)
    access = create_access_token(subject)
    refresh = create_refresh_token(subject)

    await redis_client.set(
        f"refresh:{subject}:{refresh.jti}",
        "1",
        ex=settings.jwt_refresh_expires_days * 24 * 60 * 60,
    )

    return TokenPair(
        access_token=access.token,
        refresh_token=refresh.token,
        expires_in=settings.jwt_access_expires_days * 24 * 60 * 60,
    )


async def register_shop(db: AsyncSession, payload: ShopRegisterRequest) -> ShopRegisterResponse:
    """Create a shop together with its owner in one transaction.

    An existing user (matched by phone) can own more than one shop: the
    password is verified and a new ShopMembership is attached to that
    account instead of creating a second User row.
    """
    user = await get_user_by_phone(db, payload.phone)

    if user is not None:
        if not verify_password(payload.password, user.password_hash):
            logger.info("shop_register_rejected_wrong_password", phone=payload.phone)
            raise AppError(_WRONG_PASSWORD, status_code=status.HTTP_401_UNAUTHORIZED)
    else:
        user = User(
            name=payload.owner_name,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        await db.flush()  # assign user.id for the FKs below

    slug = await _unique_slug(db, payload.shop_name)
    shop = Shop(
        name=payload.shop_name,
        slug=slug,
        email=payload.shop_email,
        phone=payload.shop_phone,
        address=payload.shop_address,
        created_by_user_id=user.id,
    )
    db.add(shop)
    await db.flush()  # assign shop.id for the membership FK

    membership = ShopMembership(
        user_id=user.id,
        shop_id=shop.id,
        role=MembershipRole.OWNER,
        invited_by_user_id=user.id,
    )
    db.add(membership)

    user.last_active_shop_id = shop.id
    user.last_login_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(user)
    await db.refresh(shop)

    tokens = await _issue_tokens(user)
    logger.info("shop_registered", shop_uid=str(shop.uid), user_uid=str(user.uid))

    return ShopRegisterResponse(
        user=UserPublic.model_validate(user),
        shop=ShopPublic.model_validate(shop),
        tokens=tokens,
    )

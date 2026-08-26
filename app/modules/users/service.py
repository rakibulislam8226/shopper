"""Business logic for user authentication."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    needs_rehash,
    verify_password,
)
from app.db.enums import ShopStatus
from app.modules.memberships.repository import get_active_membership
from app.modules.shops.repository import get_shop_by_uid
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_phone, get_user_by_uid
from app.modules.users.schemas import (
    LoginResponse,
    RefreshResponse,
    SwitchActiveShopResponse,
    TokenPair,
    UserPublic,
)
from app.redis.client import redis_client

logger = get_logger(__name__)

# Deliberately identical for "no such phone" and "wrong password" — a distinct
# message would turn the endpoint into a phone-number oracle.
_INVALID_CREDENTIALS = "Invalid phone number or password"

# Only ever reached *after* the password checked out, so it tells a legitimate
# owner why they are locked out without revealing account existence to anyone
# guessing phone numbers.
_ACCOUNT_INACTIVE = "This account has been deactivated. Contact your administrator."

# One message for every way a refresh can fail — expired, tampered, already
# rotated, revoked, unknown user. The client's response is identical in all of
# them (send the user back to login), so distinguishing them only helps an
# attacker probe the token store.
_INVALID_REFRESH = "Invalid or expired refresh token"

# Refresh jtis are tracked in Redis so a session can be revoked (logout, forced
# sign-out) before the token's own expiry. Key: refresh:<user uid>:<jti>.
_REFRESH_KEY = "refresh:{subject}:{jti}"


def _refresh_key(subject: str, jti: str) -> str:
    return _REFRESH_KEY.format(subject=subject, jti=jti)


async def issue_tokens(user: User) -> TokenPair:
    """Mint an access/refresh pair for ``user`` and register the refresh jti."""
    subject = str(user.uid)
    access = create_access_token(subject)
    refresh = create_refresh_token(subject)

    await redis_client.set(
        _refresh_key(subject, refresh.jti),
        "1",
        ex=settings.jwt_refresh_expires_days * 24 * 60 * 60,
    )

    return TokenPair(
        access_token=access.token,
        refresh_token=refresh.token,
        expires_in=settings.jwt_access_expires_days * 24 * 60 * 60,
    )


async def _revoke_refresh_jti(subject: str, jti: str) -> bool:
    """Consume a refresh jti. False if it was not registered (reused or revoked)."""
    return bool(await redis_client.delete(_refresh_key(subject, jti)))


async def login(db: AsyncSession, phone: str, password: str) -> LoginResponse:
    """Authenticate by phone + password and return the user with fresh tokens."""
    user = await get_user_by_phone(db, phone)
    if user is None or not verify_password(password, user.password_hash):
        logger.info("login_failed", phone=phone)
        raise AppError(_INVALID_CREDENTIALS, status_code=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        logger.info("login_rejected_inactive", user_uid=str(user.uid))
        raise AppError(_ACCOUNT_INACTIVE, status_code=status.HTTP_403_FORBIDDEN)

    # Argon2 parameters can be tightened over time; upgrade the stored hash
    # transparently while we legitimately hold the plaintext.
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    user.last_login_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)

    tokens = await issue_tokens(user)
    logger.info("login_succeeded", user_uid=str(user.uid))

    return LoginResponse(user=UserPublic.model_validate(user), tokens=tokens)


async def refresh(db: AsyncSession, refresh_token: str) -> RefreshResponse:
    """Exchange a valid refresh token for a brand-new access/refresh pair.

    Refresh tokens are single-use: the presented jti is consumed before a new
    pair is issued (rotation). A token that has already been rotated no longer
    exists in Redis and is rejected, so a stolen copy is useful only until the
    legitimate client refreshes once.
    """
    try:
        claims = decode_token(refresh_token, "refresh")
    except TokenError as exc:
        logger.info("refresh_rejected_invalid_token", reason=str(exc))
        raise AppError(_INVALID_REFRESH, status_code=status.HTTP_401_UNAUTHORIZED) from exc

    subject = str(claims["sub"])
    jti = str(claims["jti"])

    # Consume first: two concurrent requests carrying the same token race here,
    # and Redis DELETE returns 1 to exactly one of them.
    if not await _revoke_refresh_jti(subject, jti):
        logger.warning("refresh_rejected_unknown_jti", user_uid=subject, jti=jti)
        raise AppError(_INVALID_REFRESH, status_code=status.HTTP_401_UNAUTHORIZED)

    try:
        user_uid = UUID(subject)
    except ValueError as exc:
        raise AppError(_INVALID_REFRESH, status_code=status.HTTP_401_UNAUTHORIZED) from exc

    user = await get_user_by_uid(db, user_uid)
    if user is None:
        logger.warning("refresh_rejected_unknown_user", user_uid=subject)
        raise AppError(_INVALID_REFRESH, status_code=status.HTTP_401_UNAUTHORIZED)

    # Deactivation takes effect at the next refresh — an already-issued access
    # token stays valid until it expires, which is what its short lifetime is for.
    if not user.is_active:
        logger.info("refresh_rejected_inactive", user_uid=subject)
        raise AppError(_ACCOUNT_INACTIVE, status_code=status.HTTP_403_FORBIDDEN)

    tokens = await issue_tokens(user)
    logger.info("refresh_succeeded", user_uid=subject)
    return RefreshResponse(tokens=tokens)


async def switch_active_shop(
    db: AsyncSession, user: User, shop_uid: UUID
) -> SwitchActiveShopResponse:
    """Select ``shop_uid`` as the caller's active shop.

    Requires an ACTIVE ShopMembership on that shop *and* the shop itself
    being ACTIVE — a PENDING/REJECTED/SUSPENDED/REMOVED shop cannot be
    selected, which is the actual enforcement point for "you can't use a
    shop under review": login always succeeds, but switching into it does not.
    """
    shop = await get_shop_by_uid(db, shop_uid)
    if shop is None:
        raise AppError("Shop not found", status_code=status.HTTP_404_NOT_FOUND)

    membership = await get_active_membership(db, user_id=user.id, shop_id=shop.id)
    if membership is None:
        raise AppError("You are not a member of this shop", status_code=status.HTTP_403_FORBIDDEN)

    if shop.status != ShopStatus.ACTIVE:
        logger.info(
            "shop_switch_rejected_not_active",
            user_uid=str(user.uid),
            shop_uid=str(shop.uid),
            shop_status=shop.status.value,
        )
        raise AppError(
            _shop_unavailable_message(shop.status), status_code=status.HTTP_403_FORBIDDEN
        )

    user.active_shop = shop
    await db.commit()
    await db.refresh(user)

    logger.info("shop_switched", user_uid=str(user.uid), shop_uid=str(shop.uid))
    return SwitchActiveShopResponse(user=UserPublic.model_validate(user))


def _shop_unavailable_message(shop_status: ShopStatus) -> str:
    if shop_status == ShopStatus.PENDING:
        return "This shop is under admin review and is not yet active."
    if shop_status == ShopStatus.REJECTED:
        return "This shop's approval was rejected. Contact support."
    if shop_status == ShopStatus.SUSPENDED:
        return "This shop has been suspended. Contact your administrator."
    return "This shop is no longer available."

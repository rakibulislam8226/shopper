"""Business logic for user authentication."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.otp import send_otp
from app.core.otp import verify_otp as verify_otp_code
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
    ForgotPasswordRequest,
    LoginResponse,
    RefreshResponse,
    ResetPasswordRequest,
    SwitchActiveShopResponse,
    TokenPair,
    UserPublic,
    VerifyResetOtpRequest,
    VerifyResetOtpResponse,
)
from app.redis.client import redis_client

logger = get_logger(__name__)

_PASSWORD_RESET_OTP_PURPOSE = "password_reset"

# Separate from the OTP's own TTL: the reset token is minted only after the
# OTP already verified, so this window is "how long to finish typing a new
# password", not "how long the SMS code is valid".
_RESET_TOKEN_TTL_SECONDS = 300
_RESET_TOKEN_KEY = "password_reset_token:{token}"

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


async def forgot_password(db: AsyncSession, payload: ForgotPasswordRequest) -> None:
    """Send a password-reset OTP if ``payload.phone`` belongs to a user.

    Deliberately reveals whether the phone is registered (raises 404 if not)
    — a product choice made for clearer UX on this internal shop-management
    tool, at the cost of the usual enumeration protection on this endpoint.
    """
    user = await get_user_by_phone(db, payload.phone)
    if user is None:
        logger.info("forgot_password_unknown_phone", phone=payload.phone)
        raise AppError(
            "This phone number is not registered",
            status_code=status.HTTP_404_NOT_FOUND,
            field="phone",
        )

    await send_otp(payload.phone, _PASSWORD_RESET_OTP_PURPOSE)
    logger.info("forgot_password_otp_sent", user_uid=str(user.uid))


async def verify_reset_otp(
    db: AsyncSession, payload: VerifyResetOtpRequest
) -> VerifyResetOtpResponse:
    """Verify a password-reset OTP and mint a short-lived, single-use reset token.

    The token — not the phone — is what `reset_password` trusts, so the
    client never has to resend the phone number (or the OTP) alongside the
    new password.
    """
    user = await get_user_by_phone(db, payload.phone)
    if user is None or not await verify_otp_code(
        payload.phone, _PASSWORD_RESET_OTP_PURPOSE, payload.code
    ):
        logger.info("reset_otp_verify_failed", phone=payload.phone)
        raise AppError(
            "Invalid or expired OTP", status_code=status.HTTP_400_BAD_REQUEST, field="code"
        )

    token = secrets.token_urlsafe(32)
    await redis_client.set(
        _RESET_TOKEN_KEY.format(token=token), str(user.uid), ex=_RESET_TOKEN_TTL_SECONDS
    )

    logger.info("reset_otp_verified", user_uid=str(user.uid))
    return VerifyResetOtpResponse(reset_token=token, expires_in=_RESET_TOKEN_TTL_SECONDS)


async def reset_password(db: AsyncSession, payload: ResetPasswordRequest) -> None:
    """Consume a reset token and set the account's new password.

    The token is deleted before the password is touched: a retried or raced
    request with the same token fails cleanly instead of resetting twice.
    """
    key = _RESET_TOKEN_KEY.format(token=payload.reset_token)
    user_uid = await redis_client.get(key)
    if user_uid is None:
        raise AppError("Invalid or expired reset link", status_code=status.HTTP_400_BAD_REQUEST)
    await redis_client.delete(key)

    # redis_client is created with decode_responses=True, so this is always
    # str at runtime — the client's stubs just don't express that.
    user = await get_user_by_uid(db, UUID(str(user_uid)))
    if user is None:
        raise AppError("Invalid or expired reset link", status_code=status.HTTP_400_BAD_REQUEST)

    user.password_hash = hash_password(payload.new_password)
    await db.commit()

    logger.info("password_reset_succeeded", user_uid=str(user.uid))


def _shop_unavailable_message(shop_status: ShopStatus) -> str:
    if shop_status == ShopStatus.PENDING:
        return "This shop is under admin review and is not yet active."
    if shop_status == ShopStatus.REJECTED:
        return "This shop's approval was rejected. Contact support."
    if shop_status == ShopStatus.SUSPENDED:
        return "This shop has been suspended. Contact your administrator."
    return "This shop is no longer available."

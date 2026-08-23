"""Business logic for user authentication."""

from __future__ import annotations

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    needs_rehash,
    verify_password,
)
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_phone
from app.modules.users.schemas import LoginResponse, TokenPair, UserPublic
from app.redis.client import redis_client

logger = get_logger(__name__)

# Deliberately identical for "no such phone" and "wrong password" — a distinct
# message would turn the endpoint into a phone-number oracle.
_INVALID_CREDENTIALS = "Invalid phone number or password"

# Refresh jtis are tracked in Redis so a session can be revoked (logout, forced
# sign-out) before the token's own expiry. Key: refresh:<user uid>:<jti>.
_REFRESH_KEY = "refresh:{subject}:{jti}"


def _refresh_key(subject: str, jti: str) -> str:
    return _REFRESH_KEY.format(subject=subject, jti=jti)


async def _issue_tokens(user: User) -> TokenPair:
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
        expires_in=settings.jwt_access_expires_minutes * 60,
    )


async def login(db: AsyncSession, phone: str, password: str) -> LoginResponse:
    """Authenticate by phone + password and return the user with fresh tokens."""
    user = await get_user_by_phone(db, phone)
    if user is None or not verify_password(password, user.password_hash):
        logger.info("login_failed", phone=phone)
        raise AppError(_INVALID_CREDENTIALS, status_code=status.HTTP_401_UNAUTHORIZED)

    # Argon2 parameters can be tightened over time; upgrade the stored hash
    # transparently while we legitimately hold the plaintext.
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        await db.commit()

    tokens = await _issue_tokens(user)
    logger.info("login_succeeded", user_uid=str(user.uid))

    return LoginResponse(user=UserPublic.model_validate(user), tokens=tokens)

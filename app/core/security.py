"""Security helpers.

Password hashing (Argon2 via passlib) and JWT access/refresh token issuing and
verification. Secrets and lifetimes come from ``settings`` — access and refresh
tokens are signed with *different* secrets, so a leaked access secret cannot be
used to mint refresh tokens.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from passlib.context import CryptContext

from app.config import settings

JWT_ALGORITHM = "HS256"

TokenType = Literal["access", "refresh"]

# Argon2id — modern, memory-hard, and the current OWASP-recommended default.
_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return an Argon2 hash for the given plaintext password."""
    return str(_pwd_context.hash(plain_password))


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored Argon2 hash."""
    return bool(_pwd_context.verify(plain_password, password_hash))


def needs_rehash(password_hash: str) -> bool:
    """True if the hash was produced with outdated parameters and should be re-hashed."""
    return bool(_pwd_context.needs_update(password_hash))


@dataclass(frozen=True)
class IssuedToken:
    """A signed JWT plus the claims callers need to track it."""

    token: str
    jti: str
    expires_at: datetime


class TokenError(Exception):
    """Raised when a token is malformed, expired, or of the wrong type."""


def _secret_for(token_type: TokenType) -> str:
    return settings.jwt_access_secret if token_type == "access" else settings.jwt_refresh_secret


def _create_token(
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> IssuedToken:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + expires_delta
    jti = str(uuid.uuid4())

    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
        **(extra_claims or {}),
    }
    token = jwt.encode(payload, _secret_for(token_type), algorithm=JWT_ALGORITHM)
    return IssuedToken(token=token, jti=jti, expires_at=expires_at)


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> IssuedToken:
    """Issue a short-lived access token for ``subject`` (the user's uid)."""
    return _create_token(
        subject=subject,
        token_type="access",
        expires_delta=timedelta(minutes=settings.jwt_access_expires_minutes),
        extra_claims=extra_claims,
    )


def create_refresh_token(subject: str, extra_claims: dict[str, Any] | None = None) -> IssuedToken:
    """Issue a long-lived refresh token for ``subject`` (the user's uid)."""
    return _create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=timedelta(days=settings.jwt_refresh_expires_days),
        extra_claims=extra_claims,
    )


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    """Verify a token's signature, expiry, and type; return its claims.

    Raises :class:`TokenError` for anything invalid — callers translate that
    into a 401 rather than leaking the underlying PyJWT reason.
    """
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            _secret_for(expected_type),
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "sub", "jti"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc

    if claims.get("type") != expected_type:
        raise TokenError(f"Expected a {expected_type} token")
    return claims

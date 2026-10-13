"""Shared FastAPI dependencies — currently just the bearer-token auth guard."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import TokenError, decode_token
from app.db.session import get_db
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_uid

_bearer = HTTPBearer(auto_error=False)

_INVALID_TOKEN = "Invalid or expired access token"
_ACCOUNT_INACTIVE = "This account has been deactivated. Contact your administrator."
_NOT_SUPERUSER = "This action requires a platform administrator"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the caller from their access token. Raises 401 on any failure."""
    if credentials is None:
        raise AppError(_INVALID_TOKEN, status_code=status.HTTP_401_UNAUTHORIZED)

    try:
        claims = decode_token(credentials.credentials, "access")
    except TokenError as exc:
        raise AppError(_INVALID_TOKEN, status_code=status.HTTP_401_UNAUTHORIZED) from exc

    try:
        user_uid = UUID(str(claims["sub"]))
    except ValueError as exc:
        raise AppError(_INVALID_TOKEN, status_code=status.HTTP_401_UNAUTHORIZED) from exc

    user = await get_user_by_uid(db, user_uid)
    if user is None:
        raise AppError(_INVALID_TOKEN, status_code=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        raise AppError(_ACCOUNT_INACTIVE, status_code=status.HTTP_403_FORBIDDEN)

    return user


async def get_current_superuser(user: User = Depends(get_current_user)) -> User:
    """Resolve the caller and require ``is_superuser`` — platform-admin-only
    routes (reviewing/approving shops, ...) depend on this instead of
    `get_current_user` directly.
    """
    if not user.is_superuser:
        raise AppError(_NOT_SUPERUSER, status_code=status.HTTP_403_FORBIDDEN)
    return user

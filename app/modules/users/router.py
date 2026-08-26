"""User-facing auth routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.core.response import success_response
from app.db.session import get_db
from app.modules.users import service
from app.modules.users.models import User
from app.modules.users.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    SwitchActiveShopRequest,
    VerifyResetOtpRequest,
)

router = APIRouter(tags=["users-auth"])


@router.post("/login", summary="User login")
@rate_limit(times=5, seconds=60)  # credential stuffing guard, tighter than global
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    result = await service.login(db, phone=payload.phone, password=payload.password)
    return success_response(
        data=result.model_dump(mode="json"),
        message="Login successful",
        status_code=status.HTTP_200_OK,
    )


@router.post("/refresh", summary="Exchange a refresh token for a new token pair")
@rate_limit(times=30, seconds=60)  # legitimate clients refresh rarely; abuse does not
async def refresh(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    result = await service.refresh(db, refresh_token=payload.refresh_token)
    return success_response(
        data=result.model_dump(mode="json"),
        message="Token refreshed",
        status_code=status.HTTP_200_OK,
    )


@router.post("/active-shop", summary="Switch the caller's active shop")
async def switch_active_shop(
    payload: SwitchActiveShopRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.switch_active_shop(db, current_user, payload.shop_uid)
    return success_response(
        data=result.model_dump(mode="json"),
        message="Active shop switched",
        status_code=status.HTTP_200_OK,
    )


@router.post("/forgot-password", summary="Request a password-reset OTP")
@rate_limit(times=3, seconds=60)  # SMS is the expensive/abusable path
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    await service.forgot_password(db, payload)
    # Always the same response, whether or not the phone is registered.
    return success_response(
        data=None,
        message="If that phone number is registered, an OTP has been sent.",
        status_code=status.HTTP_200_OK,
    )


@router.post("/verify-reset-otp", summary="Verify a password-reset OTP")
@rate_limit(times=10, seconds=60)  # a handful of typo retries, not a brute-force window
async def verify_reset_otp(
    payload: VerifyResetOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    result = await service.verify_reset_otp(db, payload)
    return success_response(
        data=result.model_dump(mode="json"),
        message="OTP verified",
        status_code=status.HTTP_200_OK,
    )


@router.post("/reset-password", summary="Set a new password with a verified reset token")
@rate_limit(times=10, seconds=60)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    await service.reset_password(db, payload)
    return success_response(
        data=None,
        message="Password reset successfully",
        status_code=status.HTTP_200_OK,
    )

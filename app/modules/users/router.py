"""User-facing auth routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import rate_limit
from app.core.response import success_response
from app.db.session import get_db
from app.modules.users import service
from app.modules.users.schemas import LoginRequest

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

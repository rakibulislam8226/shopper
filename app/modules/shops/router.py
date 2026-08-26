"""Shop-facing routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import rate_limit
from app.core.response import success_response
from app.db.session import get_db
from app.modules.shops import service
from app.modules.shops.schemas import ShopRegisterRequest

router = APIRouter(tags=["shops"])


@router.post("/register", summary="Register a shop with its owner")
@rate_limit(times=5, seconds=60)  # signup abuse guard, matches login's rate limit
async def register_shop(
    payload: ShopRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    result = await service.register_shop(db, payload)
    return success_response(
        data=result.model_dump(mode="json"),
        message="Shop registered successfully",
        status_code=status.HTTP_201_CREATED,
    )

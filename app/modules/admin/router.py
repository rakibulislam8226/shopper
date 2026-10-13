"""Platform-admin routes. Every route depends on `get_current_superuser`."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_superuser
from app.core.response import PaginationMeta, success_response
from app.db.enums import ShopStatus
from app.db.session import get_db
from app.modules.admin import service
from app.modules.admin.schemas import RejectShopRequest
from app.modules.users.models import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/shops", summary="List shops for review, optionally filtered by status")
async def list_shops(
    status_filter: ShopStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=255, description="Search by shop or owner"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result, total = await service.list_shops(
        db, status_filter=status_filter, q=q, page=page, limit=limit
    )
    meta = PaginationMeta.create(page=page, limit=limit, total=total)
    return success_response(
        data=result.model_dump(mode="json"), meta=meta, status_code=status.HTTP_200_OK
    )


@router.get("/shops/{shop_uid}", summary="Get a shop's profile, owner, and documents for review")
async def get_shop(
    shop_uid: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.get_shop_for_review(db, shop_uid=shop_uid)
    return success_response(data=result.model_dump(mode="json"), status_code=status.HTTP_200_OK)


@router.get("/shops/{shop_uid}/members", summary="List a shop's staff (read-only)")
async def list_shop_members(
    shop_uid: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result, total = await service.list_shop_members_for_admin(
        db, shop_uid=shop_uid, page=page, limit=limit
    )
    meta = PaginationMeta.create(page=page, limit=limit, total=total)
    return success_response(
        data=result.model_dump(mode="json"), meta=meta, status_code=status.HTTP_200_OK
    )


@router.post("/shops/{shop_uid}/approve", summary="Approve a shop, making it usable")
async def approve_shop(
    shop_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.approve_shop(db, shop_uid=shop_uid, reviewed_by_user_id=current_user.id)
    return success_response(
        data=result.model_dump(mode="json"), message="Shop approved", status_code=status.HTTP_200_OK
    )


@router.post("/shops/{shop_uid}/reject", summary="Reject a pending shop")
async def reject_shop(
    shop_uid: UUID,
    payload: RejectShopRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.reject_shop(
        db, shop_uid=shop_uid, reviewed_by_user_id=current_user.id, payload=payload
    )
    return success_response(
        data=result.model_dump(mode="json"), message="Shop rejected", status_code=status.HTTP_200_OK
    )


@router.post("/shops/{shop_uid}/suspend", summary="Suspend an active shop")
async def suspend_shop(
    shop_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.suspend_shop(db, shop_uid=shop_uid, reviewed_by_user_id=current_user.id)
    return success_response(
        data=result.model_dump(mode="json"),
        message="Shop suspended",
        status_code=status.HTTP_200_OK,
    )


@router.post("/shops/{shop_uid}/reactivate", summary="Reactivate a suspended shop")
async def reactivate_shop(
    shop_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.reactivate_shop(
        db, shop_uid=shop_uid, reviewed_by_user_id=current_user.id
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Shop reactivated",
        status_code=status.HTTP_200_OK,
    )


@router.post("/shops/{shop_uid}/remove", summary="Remove a shop (terminal, soft)")
async def remove_shop(
    shop_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.remove_shop(db, shop_uid=shop_uid, reviewed_by_user_id=current_user.id)
    return success_response(
        data=result.model_dump(mode="json"), message="Shop removed", status_code=status.HTTP_200_OK
    )


@router.get("/users", summary="List every platform user")
async def list_users(
    q: str | None = Query(default=None, max_length=255, description="Search by name or phone"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result, total = await service.list_users(db, q=q, page=page, limit=limit)
    meta = PaginationMeta.create(page=page, limit=limit, total=total)
    return success_response(
        data=result.model_dump(mode="json"), meta=meta, status_code=status.HTTP_200_OK
    )


@router.get("/users/{user_uid}", summary="Get one platform user")
async def get_user(
    user_uid: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.get_user_for_admin(db, user_uid=user_uid)
    return success_response(data=result.model_dump(mode="json"), status_code=status.HTTP_200_OK)


@router.post("/users/{user_uid}/activate", summary="Reactivate a deactivated user account")
async def activate_user(
    user_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.set_user_active(
        db, user_uid=user_uid, active=True, actor_user_id=current_user.id
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Account activated",
        status_code=status.HTTP_200_OK,
    )


@router.post("/users/{user_uid}/deactivate", summary="Deactivate a user account")
async def deactivate_user(
    user_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.set_user_active(
        db, user_uid=user_uid, active=False, actor_user_id=current_user.id
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Account deactivated",
        status_code=status.HTTP_200_OK,
    )


@router.get("/stats", summary="Platform-wide shop and user counts")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_superuser),
) -> JSONResponse:
    result = await service.get_stats(db)
    return success_response(data=result.model_dump(mode="json"), status_code=status.HTTP_200_OK)

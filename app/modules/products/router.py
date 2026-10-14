"""Product catalogue routes."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.response import PaginationMeta, success_response
from app.db.session import get_db
from app.modules.products import service
from app.modules.products.schemas import (
    CreateCategoryRequest,
    CreateProductRequest,
    UpdateProductRequest,
)
from app.modules.users.models import User

router = APIRouter(tags=["products"])


@router.get("/{shop_uid}/products/categories", summary="List a shop's product categories")
async def list_categories(
    shop_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.list_categories(db, shop_uid=shop_uid, user_id=current_user.id)
    return success_response(data=result.model_dump(mode="json"), status_code=status.HTTP_200_OK)


@router.post("/{shop_uid}/products/categories", summary="Create a product category")
async def create_category(
    shop_uid: UUID,
    payload: CreateCategoryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.create_category(
        db, shop_uid=shop_uid, user_id=current_user.id, payload=payload
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Category created",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/{shop_uid}/products", summary="List a shop's products")
async def list_products(
    shop_uid: UUID,
    q: str | None = Query(default=None, max_length=255, description="Search by name or SKU"),
    category_uid: UUID | None = Query(default=None),
    status_filter: Literal["active", "inactive", "all"] = Query(default="active", alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    is_active = {"active": True, "inactive": False, "all": None}[status_filter]
    result, total = await service.list_products(
        db,
        shop_uid=shop_uid,
        user_id=current_user.id,
        q=q,
        category_uid=category_uid,
        is_active=is_active,
        page=page,
        limit=limit,
    )
    meta = PaginationMeta.create(page=page, limit=limit, total=total)
    return success_response(
        data=result.model_dump(mode="json"), meta=meta, status_code=status.HTTP_200_OK
    )


@router.post("/{shop_uid}/products", summary="Create a product")
async def create_product(
    shop_uid: UUID,
    payload: CreateProductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.create_product(
        db, shop_uid=shop_uid, user_id=current_user.id, payload=payload
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Product created",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/{shop_uid}/products/{product_uid}", summary="Get one product")
async def get_product(
    shop_uid: UUID,
    product_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.get_product(
        db, shop_uid=shop_uid, product_uid=product_uid, user_id=current_user.id
    )
    return success_response(data=result.model_dump(mode="json"), status_code=status.HTTP_200_OK)


@router.patch("/{shop_uid}/products/{product_uid}", summary="Update a product")
async def update_product(
    shop_uid: UUID,
    product_uid: UUID,
    payload: UpdateProductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.update_product(
        db, shop_uid=shop_uid, product_uid=product_uid, user_id=current_user.id, payload=payload
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Product updated",
        status_code=status.HTTP_200_OK,
    )


@router.post("/{shop_uid}/products/{product_uid}/image", summary="Upload a product's image")
async def upload_product_image(
    shop_uid: UUID,
    product_uid: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.upload_product_image(
        db, shop_uid=shop_uid, product_uid=product_uid, user_id=current_user.id, file=file
    )
    return success_response(
        data=result.model_dump(mode="json"), message="Image updated", status_code=status.HTTP_200_OK
    )


@router.post("/{shop_uid}/products/{product_uid}/activate", summary="Reactivate a product")
async def activate_product(
    shop_uid: UUID,
    product_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.set_product_active(
        db, shop_uid=shop_uid, product_uid=product_uid, user_id=current_user.id, active=True
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Product activated",
        status_code=status.HTTP_200_OK,
    )


@router.post("/{shop_uid}/products/{product_uid}/deactivate", summary="Deactivate a product")
async def deactivate_product(
    shop_uid: UUID,
    product_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.set_product_active(
        db, shop_uid=shop_uid, product_uid=product_uid, user_id=current_user.id, active=False
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Product deactivated",
        status_code=status.HTTP_200_OK,
    )

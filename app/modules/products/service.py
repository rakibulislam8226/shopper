"""Business logic for product catalogue management.

Read (list/get) is open to any active shop member — a salesman needs to see
the catalogue to sell from it. Write (create/update/activate/image) is
owner/manager-only, via `memberships.service.require_shop_manager`.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.storage import save_upload
from app.modules.memberships.models import ShopMembership
from app.modules.memberships.repository import get_active_membership
from app.modules.memberships.service import require_shop_manager
from app.modules.products.models import Product, ProductCategory
from app.modules.products.repository import (
    get_category_by_name,
    get_product_by_sku,
    get_product_by_uid,
)
from app.modules.products.repository import get_category_by_uid as _get_category_by_uid
from app.modules.products.repository import list_categories as list_categories_repo
from app.modules.products.repository import list_products as list_products_repo
from app.modules.products.schemas import (
    CategoriesListResponse,
    CreateCategoryRequest,
    CreateProductRequest,
    ProductCategoryPublic,
    ProductPublic,
    ProductsListResponse,
    UpdateProductRequest,
)
from app.modules.shops.models import Shop
from app.modules.shops.repository import get_shop_by_uid

logger = get_logger(__name__)

_SHOP_NOT_FOUND = "Shop not found"
_PRODUCT_NOT_FOUND = "Product not found"
_CATEGORY_NOT_FOUND = "Category not found"
_CATEGORY_EXISTS = "A category with this name already exists"
_SKU_EXISTS = "A product with this SKU already exists"


async def _require_member(
    db: AsyncSession, *, shop_uid: UUID, user_id: int
) -> tuple[Shop, ShopMembership]:
    shop = await get_shop_by_uid(db, shop_uid)
    if shop is None:
        raise AppError(_SHOP_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    membership = await get_active_membership(db, user_id=user_id, shop_id=shop.id)
    if membership is None:
        raise AppError(_SHOP_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    return shop, membership


async def _get_product_or_404(
    db: AsyncSession, *, shop_id: int, product_uid: UUID
) -> tuple[Product, ProductCategory | None]:
    row = await get_product_by_uid(db, shop_id=shop_id, uid=product_uid)
    if row is None:
        raise AppError(_PRODUCT_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)
    return row


async def _resolve_category(
    db: AsyncSession, *, shop_id: int, category_uid: UUID | None
) -> ProductCategory | None:
    if category_uid is None:
        return None
    category = await _get_category_by_uid(db, shop_id=shop_id, uid=category_uid)
    if category is None:
        raise AppError(
            _CATEGORY_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND, field="category_uid"
        )
    return category


def _product_public(product: Product, category: ProductCategory | None) -> ProductPublic:
    return ProductPublic(
        uid=product.uid,
        name=product.name,
        sku=product.sku,
        unit=product.unit,
        description=product.description,
        image=product.image,
        category=ProductCategoryPublic.model_validate(category) if category else None,
        stock_quantity=product.stock_quantity,
        min_price=product.min_price,
        is_active=product.is_active,
        created_at=product.created_at,
    )


async def list_categories(
    db: AsyncSession, *, shop_uid: UUID, user_id: int
) -> CategoriesListResponse:
    shop, _membership = await _require_member(db, shop_uid=shop_uid, user_id=user_id)
    categories = await list_categories_repo(db, shop_id=shop.id)
    return CategoriesListResponse(
        categories=[ProductCategoryPublic.model_validate(c) for c in categories]
    )


async def create_category(
    db: AsyncSession, *, shop_uid: UUID, user_id: int, payload: CreateCategoryRequest
) -> ProductCategoryPublic:
    shop, _membership = await require_shop_manager(db, shop_uid=shop_uid, user_id=user_id)

    existing = await get_category_by_name(db, shop_id=shop.id, name=payload.name)
    if existing is not None:
        raise AppError(_CATEGORY_EXISTS, status_code=status.HTTP_409_CONFLICT, field="name")

    category = ProductCategory(shop_id=shop.id, name=payload.name)
    db.add(category)
    await db.commit()
    await db.refresh(category)

    logger.info("product_category_created", shop_uid=str(shop.uid), name=payload.name)
    return ProductCategoryPublic.model_validate(category)


async def list_products(
    db: AsyncSession,
    *,
    shop_uid: UUID,
    user_id: int,
    q: str | None,
    category_uid: UUID | None,
    is_active: bool | None,
    page: int,
    limit: int,
) -> tuple[ProductsListResponse, int]:
    shop, membership = await _require_member(db, shop_uid=shop_uid, user_id=user_id)

    category_id = None
    if category_uid is not None:
        category = await _get_category_by_uid(db, shop_id=shop.id, uid=category_uid)
        if category is None:
            raise AppError(
                _CATEGORY_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND, field="category_uid"
            )
        category_id = category.id

    rows, total = await list_products_repo(
        db,
        shop_id=shop.id,
        q=q,
        category_id=category_id,
        is_active=is_active,
        page=page,
        limit=limit,
    )
    response = ProductsListResponse(
        products=[_product_public(product, category) for product, category in rows],
        viewer_role=membership.role,
    )
    return response, total


async def get_product(
    db: AsyncSession, *, shop_uid: UUID, product_uid: UUID, user_id: int
) -> ProductPublic:
    shop, _membership = await _require_member(db, shop_uid=shop_uid, user_id=user_id)
    product, category = await _get_product_or_404(db, shop_id=shop.id, product_uid=product_uid)
    return _product_public(product, category)


async def create_product(
    db: AsyncSession, *, shop_uid: UUID, user_id: int, payload: CreateProductRequest
) -> ProductPublic:
    shop, _membership = await require_shop_manager(db, shop_uid=shop_uid, user_id=user_id)

    if payload.sku and await get_product_by_sku(db, shop_id=shop.id, sku=payload.sku):
        raise AppError(_SKU_EXISTS, status_code=status.HTTP_409_CONFLICT, field="sku")

    category = await _resolve_category(db, shop_id=shop.id, category_uid=payload.category_uid)
    product = Product(
        shop_id=shop.id,
        name=payload.name,
        sku=payload.sku,
        unit=payload.unit,
        description=payload.description,
        min_price=payload.min_price,
        category_id=category.id if category else None,
        created_by_user_id=user_id,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    logger.info("product_created", shop_uid=str(shop.uid), product_uid=str(product.uid))
    return _product_public(product, category)


async def update_product(
    db: AsyncSession,
    *,
    shop_uid: UUID,
    product_uid: UUID,
    user_id: int,
    payload: UpdateProductRequest,
) -> ProductPublic:
    shop, _membership = await require_shop_manager(db, shop_uid=shop_uid, user_id=user_id)
    product, category = await _get_product_or_404(db, shop_id=shop.id, product_uid=product_uid)

    updates = payload.model_dump(exclude_unset=True, exclude={"category_uid"})
    sku_changed = updates.get("sku") and updates["sku"] != product.sku
    if sku_changed and await get_product_by_sku(db, shop_id=shop.id, sku=updates["sku"]):
        raise AppError(_SKU_EXISTS, status_code=status.HTTP_409_CONFLICT, field="sku")

    for field, value in updates.items():
        setattr(product, field, value)

    if "category_uid" in payload.model_fields_set:
        category = await _resolve_category(db, shop_id=shop.id, category_uid=payload.category_uid)
        product.category_id = category.id if category else None

    await db.commit()
    await db.refresh(product)

    logger.info(
        "product_updated",
        shop_uid=str(shop.uid),
        product_uid=str(product.uid),
        fields=list(updates),
    )
    return _product_public(product, category)


async def set_product_active(
    db: AsyncSession, *, shop_uid: UUID, product_uid: UUID, user_id: int, active: bool
) -> ProductPublic:
    shop, _membership = await require_shop_manager(db, shop_uid=shop_uid, user_id=user_id)
    product, category = await _get_product_or_404(db, shop_id=shop.id, product_uid=product_uid)

    product.is_active = active
    await db.commit()
    await db.refresh(product)

    logger.info(
        "product_active_flag_changed",
        shop_uid=str(shop.uid),
        product_uid=str(product.uid),
        active=active,
    )
    return _product_public(product, category)


async def upload_product_image(
    db: AsyncSession, *, shop_uid: UUID, product_uid: UUID, user_id: int, file: UploadFile
) -> ProductPublic:
    shop, _membership = await require_shop_manager(db, shop_uid=shop_uid, user_id=user_id)
    product, category = await _get_product_or_404(db, shop_id=shop.id, product_uid=product_uid)

    product.image = await save_upload(file, subdir=f"shops/{shop.uid}/products/{product.uid}")
    await db.commit()
    await db.refresh(product)

    return _product_public(product, category)

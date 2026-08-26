"""Business logic for shop registration and document submission."""

from __future__ import annotations

import re
from uuid import UUID

from fastapi import UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.security import hash_password, verify_password
from app.core.storage import save_upload
from app.db.enums import MembershipRole, ShopDocumentType
from app.modules.memberships.models import ShopMembership
from app.modules.shops.models import Shop, ShopDocument
from app.modules.shops.repository import get_shop_by_uid, slug_exists
from app.modules.shops.schemas import (
    ShopDocumentPublic,
    ShopPublic,
    ShopRegisterRequest,
    ShopRegisterResponse,
)
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_phone
from app.modules.users.schemas import UserPublic
from app.modules.users.service import issue_tokens

logger = get_logger(__name__)

_WRONG_PASSWORD = "Invalid password for this phone number"
_SHOP_NOT_FOUND = "Shop not found"
_OWNER_NID_REQUIRED = "Owner NID is required"
_SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")


async def _unique_slug(db: AsyncSession, name: str) -> str:
    """Slugify ``name`` and disambiguate with a numeric suffix if taken."""
    base = _SLUG_INVALID_CHARS.sub("-", name.lower()).strip("-") or "shop"
    slug = base
    suffix = 1
    while await slug_exists(db, slug):
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


async def _save_document(
    db: AsyncSession,
    *,
    shop: Shop,
    document_type: ShopDocumentType,
    file: UploadFile,
    uploaded_by_user_id: int,
) -> ShopDocument:
    file_url = await save_upload(file, subdir=f"shops/{shop.uid}/documents")
    document = ShopDocument(
        shop_id=shop.id,
        type=document_type,
        file_url=file_url,
        uploaded_by_user_id=uploaded_by_user_id,
    )
    db.add(document)
    return document


async def register_shop(
    db: AsyncSession,
    payload: ShopRegisterRequest,
    *,
    owner_nid: UploadFile,
    trade_license: UploadFile | None,
    tin_certificate: UploadFile | None,
    other_document: UploadFile | None,
) -> ShopRegisterResponse:
    """Create a shop together with its owner and its supporting documents, in
    one transaction, from one `multipart/form-data` request.

    ``owner_nid`` is required — the caller (the router) enforces this by
    declaring the parameter without a default, so a request missing it never
    reaches this function; validated again here in case a caller passes an
    empty/zero-byte file through. The other three document types are
    optional and simply skipped when absent.

    An existing user (matched by phone) can own more than one shop: the
    password is verified and a new ShopMembership is attached to that
    account instead of creating a second User row. Every shop starts
    PENDING and stays that way until a superuser approves it. Tokens are
    issued immediately; the owner can log in right away, they just can't
    select this shop as active (see
    `users/service.py:switch_active_shop`) until it's approved.
    """
    if not owner_nid.filename or not owner_nid.size:
        raise AppError(_OWNER_NID_REQUIRED)

    user = await get_user_by_phone(db, payload.phone)

    if user is not None:
        if not verify_password(payload.password, user.password_hash):
            logger.info("shop_register_rejected_wrong_password", phone=payload.phone)
            raise AppError(_WRONG_PASSWORD, status_code=status.HTTP_401_UNAUTHORIZED)
    else:
        user = User(
            name=payload.owner_name,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        await db.flush()  # assign user.id for the FKs below

    slug = await _unique_slug(db, payload.shop_name)
    shop = Shop(
        name=payload.shop_name,
        slug=slug,
        email=payload.shop_email,
        phone=payload.shop_phone,
        address=payload.shop_address,
        logo=payload.shop_logo,
        created_by_user_id=user.id,
    )
    db.add(shop)
    await db.flush()  # assign shop.id for the membership + document FKs

    membership = ShopMembership(
        user_id=user.id,
        shop_id=shop.id,
        role=MembershipRole.OWNER,
        invited_by_user_id=user.id,
    )
    db.add(membership)

    documents: list[ShopDocument] = [
        await _save_document(
            db,
            shop=shop,
            document_type=ShopDocumentType.OWNER_NID,
            file=owner_nid,
            uploaded_by_user_id=user.id,
        )
    ]
    for document_type, file in (
        (ShopDocumentType.TRADE_LICENSE, trade_license),
        (ShopDocumentType.TIN_CERTIFICATE, tin_certificate),
        (ShopDocumentType.OTHER, other_document),
    ):
        if file is not None and file.filename and file.size:
            documents.append(
                await _save_document(
                    db,
                    shop=shop,
                    document_type=document_type,
                    file=file,
                    uploaded_by_user_id=user.id,
                )
            )

    user.active_shop = shop

    await db.commit()
    await db.refresh(user)
    await db.refresh(shop)
    for document in documents:
        await db.refresh(document)

    tokens = await issue_tokens(user)
    logger.info(
        "shop_registered",
        shop_uid=str(shop.uid),
        user_uid=str(user.uid),
        document_count=len(documents),
    )

    return ShopRegisterResponse(
        user=UserPublic.model_validate(user),
        shop=ShopPublic.model_validate(shop),
        tokens=tokens,
        documents=[ShopDocumentPublic.model_validate(document) for document in documents],
    )


async def upload_document(
    db: AsyncSession,
    *,
    shop_uid: UUID,
    document_type: ShopDocumentType,
    file: UploadFile,
    uploaded_by_user_id: int,
) -> ShopDocumentPublic:
    """Attach one more document to a shop's approval file after registration.

    Documents stay addable at any time — a superuser reviews and approves
    the shop once it has what it needs, regardless of when each document
    arrived.
    """
    shop = await get_shop_by_uid(db, shop_uid)
    if shop is None:
        raise AppError(_SHOP_NOT_FOUND, status_code=status.HTTP_404_NOT_FOUND)

    document = await _save_document(
        db,
        shop=shop,
        document_type=document_type,
        file=file,
        uploaded_by_user_id=uploaded_by_user_id,
    )
    await db.commit()
    await db.refresh(document)

    logger.info(
        "shop_document_uploaded",
        shop_uid=str(shop.uid),
        document_type=document_type.value,
    )
    return ShopDocumentPublic.model_validate(document)

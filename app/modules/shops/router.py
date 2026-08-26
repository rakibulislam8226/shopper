"""Shop-facing routes."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.core.response import success_response
from app.db.enums import ShopDocumentType
from app.db.session import get_db
from app.modules.shops import service
from app.modules.shops.schemas import ShopRegisterRequest
from app.modules.users.models import User

router = APIRouter(tags=["shops"])


@router.post("/register", summary="Register a shop with its owner and supporting documents")
@rate_limit(times=5, seconds=60)  # signup abuse guard, matches login's rate limit
async def register_shop(
    # Declared as individual Form(...) fields rather than a single
    # Annotated[ShopRegisterRequest, Form()] — FastAPI does not flatten a
    # Form-model's fields into the request when other File()/Form() params
    # sit alongside it in the same signature, so that pattern 422s here with
    # "payload: field required" even though every part was sent.
    owner_name: Annotated[str, Form()],
    phone: Annotated[str, Form()],
    password: Annotated[str, Form()],
    confirm_password: Annotated[str, Form()],
    shop_name: Annotated[str, Form()],
    owner_nid: UploadFile = File(..., description="Required — the owner's national ID"),
    shop_email: Annotated[str | None, Form()] = None,
    shop_phone: Annotated[str | None, Form()] = None,
    shop_address: Annotated[str | None, Form()] = None,
    shop_logo: Annotated[str | None, Form()] = None,
    trade_license: UploadFile | None = File(None),
    tin_certificate: UploadFile | None = File(None),
    other_document: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    payload = ShopRegisterRequest(
        owner_name=owner_name,
        phone=phone,
        password=password,
        confirm_password=confirm_password,
        shop_name=shop_name,
        shop_email=shop_email,
        shop_phone=shop_phone,
        shop_address=shop_address,
        shop_logo=shop_logo,
    )
    result = await service.register_shop(
        db,
        payload,
        owner_nid=owner_nid,
        trade_license=trade_license,
        tin_certificate=tin_certificate,
        other_document=other_document,
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Shop registered. It is pending review before it can be used.",
        status_code=status.HTTP_201_CREATED,
    )


@router.post("/{shop_uid}/documents", summary="Submit an additional document for shop approval")
@rate_limit(times=20, seconds=60)  # a handful of documents per shop, not a bulk-upload path
async def upload_document(
    shop_uid: UUID,
    document_type: ShopDocumentType = Form(..., alias="type"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.upload_document(
        db,
        shop_uid=shop_uid,
        document_type=document_type,
        file=file,
        uploaded_by_user_id=current_user.id,
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Document uploaded",
        status_code=status.HTTP_201_CREATED,
    )

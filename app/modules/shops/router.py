"""Shop-facing routes."""

from __future__ import annotations

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


@router.post("/register", summary="Register a shop with its owner")
@rate_limit(times=5, seconds=60)  # signup abuse guard, matches login's rate limit
async def register_shop(
    payload: ShopRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    result = await service.register_shop(db, payload)
    return success_response(
        data=result.model_dump(mode="json"),
        message="Shop registered. It is pending review before it can be used.",
        status_code=status.HTTP_201_CREATED,
    )


@router.post("/{shop_uid}/documents", summary="Submit a document for shop approval")
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

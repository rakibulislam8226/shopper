"""Shop staff routes — adding and listing managers and salesmen."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.response import success_response
from app.db.session import get_db
from app.modules.memberships import service
from app.modules.memberships.schemas import AddMemberRequest
from app.modules.users.models import User

router = APIRouter(tags=["memberships"])


@router.post("/{shop_uid}/members", summary="Add a manager or salesman to a shop")
async def add_member(
    shop_uid: UUID,
    payload: AddMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.add_member(
        db, shop_uid=shop_uid, actor_user_id=current_user.id, payload=payload
    )
    return success_response(
        data=result.model_dump(mode="json"),
        message="Member added",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/{shop_uid}/members", summary="List a shop's active staff")
async def list_members(
    shop_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result = await service.list_members(db, shop_uid=shop_uid, user_id=current_user.id)
    return success_response(data=result.model_dump(mode="json"), status_code=status.HTTP_200_OK)

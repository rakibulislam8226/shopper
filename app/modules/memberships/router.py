"""Shop staff routes — adding and listing managers and salesmen."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.response import PaginationMeta, success_response
from app.db.enums import MembershipRole
from app.db.session import get_db
from app.modules.memberships import service
from app.modules.memberships.schemas import AddMemberRequest, UpdateMemberRoleRequest
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


@router.patch("/{shop_uid}/members/{user_uid}", summary="Change a member's role")
async def update_member_role(
    shop_uid: UUID,
    user_uid: UUID,
    payload: UpdateMemberRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    member = await service.update_member_role(
        db,
        shop_uid=shop_uid,
        actor_user_id=current_user.id,
        user_uid=user_uid,
        payload=payload,
    )
    return success_response(
        data=member.model_dump(mode="json"),
        message="Member role updated",
        status_code=status.HTTP_200_OK,
    )


@router.delete("/{shop_uid}/members/{user_uid}", summary="Remove a member from the shop")
async def remove_member(
    shop_uid: UUID,
    user_uid: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    await service.remove_member(
        db, shop_uid=shop_uid, actor_user_id=current_user.id, user_uid=user_uid
    )
    return success_response(message="Member removed", status_code=status.HTTP_200_OK)


@router.get("/{shop_uid}/members", summary="List a shop's active staff")
async def list_members(
    shop_uid: UUID,
    q: str | None = Query(default=None, max_length=255, description="Search by name or phone"),
    role: MembershipRole | None = Query(default=None, description="Filter to exactly one role"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    result, total = await service.list_members(
        db, shop_uid=shop_uid, user_id=current_user.id, q=q, role=role, page=page, limit=limit
    )
    meta = PaginationMeta.create(page=page, limit=limit, total=total)
    return success_response(
        data=result.model_dump(mode="json"), meta=meta, status_code=status.HTTP_200_OK
    )

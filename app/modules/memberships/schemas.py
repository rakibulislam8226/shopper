"""Request/response schemas for the memberships module."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.enums import MembershipRole, MembershipStatus

# Who this endpoint lets a caller add — never OWNER, an owner is only ever
# created by shop registration (see `shops/service.py:register_shop`).
_ADDABLE_ROLES = (MembershipRole.MANAGER, MembershipRole.SALESMAN)


class AddMemberRequest(BaseModel):
    """Body for `POST /api/shops/{shop_uid}/members`.

    ``name``/``password``/``confirm_password`` only take effect when
    ``phone`` belongs to no existing account — a brand-new login is created
    for them. If the phone already has an account, it is simply attached to
    this shop with the given role and the submitted password is ignored: the
    person filling this form is not that account's owner and can't set its
    credentials.
    """

    name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=3, max_length=32, examples=["+8801700000000"])
    password: str = Field(min_length=8, max_length=128, examples=["S3cret!pass"])
    confirm_password: str = Field(min_length=8, max_length=128, examples=["S3cret!pass"])
    role: MembershipRole

    @model_validator(mode="after")
    def _validate(self) -> AddMemberRequest:
        if self.password != self.confirm_password:
            raise ValueError("Password and confirm password do not match")
        if self.role not in _ADDABLE_ROLES:
            raise ValueError("role must be 'manager' or 'salesman'")
        return self


class MemberPublic(BaseModel):
    """One shop member, combining their user identity with their membership
    and the read-only stats an owner/manager cares about for the employee
    list — lifetime sales and last login are for display only, never a basis
    for further calculation, so both cross the API boundary already rounded
    to money precision / as plain timestamps.
    """

    model_config = ConfigDict(from_attributes=True)

    user_uid: UUID
    name: str
    phone: str
    role: MembershipRole
    status: MembershipStatus
    joined_at: datetime
    last_login_at: datetime | None
    total_sales: Decimal = Decimal("0.00")


class AddMemberResponse(BaseModel):
    """Payload placed in the standard envelope's `data` field on member add."""

    member: MemberPublic
    created_new_account: bool


class MembersListResponse(BaseModel):
    """Payload for `GET /api/shops/{shop_uid}/members`.

    ``viewer_role`` is the caller's own role on this shop — the frontend uses
    it to decide whether "add manager" should be offered at all (owner only)
    versus just "add staff" (owner or manager).
    """

    members: list[MemberPublic]
    viewer_role: MembershipRole

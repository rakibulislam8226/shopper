"""Request/response schemas for the platform-admin module."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.enums import MembershipRole, ShopStatus
from app.modules.memberships.schemas import MemberPublic
from app.modules.shops.schemas import ShopDocumentPublic, ShopPublic
from app.modules.users.schemas import UserPublic


class AdminShopSummary(BaseModel):
    shop: ShopPublic
    owner: UserPublic | None


class AdminShopListResponse(BaseModel):
    shops: list[AdminShopSummary]


class AdminShopDetailResponse(BaseModel):
    shop: ShopPublic
    owner: UserPublic | None
    documents: list[ShopDocumentPublic]


class RejectShopRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class AdminShopMembersResponse(BaseModel):
    members: list[MemberPublic]


class AdminUserOrganization(BaseModel):
    shop: ShopPublic
    role: MembershipRole


class AdminUserSummary(BaseModel):
    """A user plus every shop they belong to — never carries `password_hash`."""

    uid: UUID
    name: str
    phone: str
    is_superuser: bool
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    organizations: list[AdminUserOrganization]


class AdminUsersListResponse(BaseModel):
    users: list[AdminUserSummary]


class ShopStatusCounts(BaseModel):
    pending: int = 0
    active: int = 0
    suspended: int = 0
    rejected: int = 0
    removed: int = 0

    @classmethod
    def from_counts(cls, counts: dict[ShopStatus, int]) -> ShopStatusCounts:
        return cls(**{status.value: count for status, count in counts.items()})


class AdminStatsResponse(BaseModel):
    shops_by_status: ShopStatusCounts
    total_users: int
    total_superusers: int

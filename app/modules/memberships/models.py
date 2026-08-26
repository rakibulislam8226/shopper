"""ShopMembership — the join between a user and a shop, and the only place a
role or an access decision is recorded.

Exactly one row per (user, shop) pair, forever. Promoting a salesman to
manager updates ``role`` on the existing row; removal or resignation updates
``status``. New rows are never inserted for the same pair, so re-joining a
shop reactivates history rather than forking it.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.enums import (
    MEMBERSHIP_ROLE_ENUM,
    MEMBERSHIP_STATUS_ENUM,
    MembershipRole,
    MembershipStatus,
)

if TYPE_CHECKING:
    from app.modules.shops.models import Shop
    from app.modules.users.models import User


class ShopMembership(BaseModel):
    __tablename__ = "shop_memberships"
    __table_args__ = (
        # One membership row per user per shop — see the module docstring.
        UniqueConstraint("user_id", "shop_id"),
        # The hot path: "all ACTIVE owners of shop X" (the last-owner
        # resignation guard), "all ACTIVE members of shop X", role listings.
        Index("ix_shop_memberships_shop_id_role_status", "shop_id", "role", "status"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    shop_id: Mapped[int] = mapped_column(
        ForeignKey("shops.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    role: Mapped[MembershipRole] = mapped_column(
        MEMBERSHIP_ROLE_ENUM,
        nullable=False,
        index=True,
    )
    status: Mapped[MembershipStatus] = mapped_column(
        MEMBERSHIP_STATUS_ENUM,
        nullable=False,
        default=MembershipStatus.ACTIVE,
        server_default=MembershipStatus.ACTIVE.value,
        index=True,
    )

    # Provenance: who issued the invite. Always a user — a superuser
    # provisioning a shop's first owner is a user with ``is_superuser``.
    # Null for rows created before invites were tracked.
    invited_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    joined_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    left_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Several columns point at ``users``, so both sides pin their join explicitly.
    user: Mapped[User] = relationship(
        back_populates="memberships",
        foreign_keys=[user_id],
    )
    shop: Mapped[Shop] = relationship(back_populates="memberships")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<ShopMembership user_id={self.user_id} shop_id={self.shop_id} "
            f"role={self.role.value} status={self.status.value}>"
        )

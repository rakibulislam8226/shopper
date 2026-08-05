"""Membership — the join between a user and an organization, and the only
place a role or an access decision is recorded.

Exactly one row per (user, organization) pair, forever. Promoting a salesman to
manager updates ``role`` on the existing row; removal or resignation updates
``status``. New rows are never inserted for the same pair, so re-joining an org
reactivates history rather than forking it.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.enums import (
    MEMBERSHIP_ROLE_ENUM,
    MEMBERSHIP_STATUS_ENUM,
    MembershipRole,
    MembershipStatus,
)

if TYPE_CHECKING:
    from app.modules.organizations.models import Organization
    from app.modules.users.models import User


class Membership(BaseModel):
    __tablename__ = "memberships"
    __table_args__ = (
        # One membership row per user per org — see the module docstring.
        # Name comes from the metadata naming convention:
        # uq_memberships_user_id_organization_id.
        UniqueConstraint("user_id", "organization_id"),
        # The hot path: "all ACTIVE owners of org X" (the last-owner
        # resignation guard), "all ACTIVE members of org X", role listings.
        Index("ix_memberships_organization_id_role_status", "organization_id", "role", "status"),
        # An invite has exactly one inviter, and the inviter is polymorphic —
        # hence two nullable columns. At most one may be set; a row with both
        # is a bug, not a valid state.
        CheckConstraint(
            "NOT (invited_by_user_id IS NOT NULL AND invited_by_superadmin_id IS NOT NULL)",
            name="single_inviter",
        ),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
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

    # Provenance: an invite comes from either an org user or a superadmin
    # (the org's first owner), never both. Enforced application-side.
    invited_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    invited_by_superadmin_id: Mapped[int | None] = mapped_column(
        ForeignKey("superadmins.id", ondelete="RESTRICT"),
        nullable=True,
    )

    joined_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    removed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    # Null when the departure was self-initiated (status RESIGNED).
    removed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    # Three columns point at ``users``, so both sides pin their join explicitly.
    user: Mapped[User] = relationship(
        back_populates="memberships",
        foreign_keys=[user_id],
    )
    organization: Mapped[Organization] = relationship(back_populates="memberships")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<Membership user_id={self.user_id} organization_id={self.organization_id} "
            f"role={self.role.value} status={self.status.value}>"
        )

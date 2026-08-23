"""Organizations — the tenant boundary.

Every org-scoped row in the system carries this table's ``id``. Organizations
are never hard-deleted: ``status`` moves to SUSPENDED (reversible lock) or
REMOVED (soft, longer-term), so the financial history underneath stays intact
and auditable.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel
from app.db.enums import ORGANIZATION_STATUS_ENUM, OrganizationStatus

if TYPE_CHECKING:
    from app.modules.memberships.models import Membership
    from app.modules.products.models import Product
    from app.modules.sales.models import Sale


class Organization(BaseModel):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Free text by design ("retail", "restaurant", "pharmacy", ...). Not an
    # enum: the set of business types is open-ended and not behaviour-bearing.
    type: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[OrganizationStatus] = mapped_column(
        ORGANIZATION_STATUS_ENUM,
        nullable=False,
        default=OrganizationStatus.ACTIVE,
        server_default=OrganizationStatus.ACTIVE.value,
        index=True,
    )

    # Both carry a Python-side default as well as a server default, matching
    # every other defaulted column in the schema (status, stock_quantity,
    # must_change_password). The Python default puts the value in the INSERT
    # itself rather than relying on the database to fill it and hand it back,
    # so the value an org is created with does not depend on dialect RETURNING
    # support. Neither default populates the attribute before flush.
    #
    # ISO 4217 code; used to render every monetary amount belonging to this org.
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
        server_default="USD",
    )
    # IANA name, e.g. "Asia/Dhaka". Reporting day boundaries resolve against it.
    timezone: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="UTC",
        server_default="UTC",
    )

    # The superadmin (a user with ``is_superadmin``) who provisioned this org.
    # Nullable only to survive data-integrity edge cases; in practice
    # provisioning always sets it.
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    # passive_deletes="all" on every collection below: without it SQLAlchemy's
    # default delete behaviour is to NULL out the child's organization_id
    # before issuing the parent DELETE, which orphans rows and never lets the
    # database's ondelete="RESTRICT" fire. "all" tells the ORM to touch nothing
    # and let PostgreSQL refuse the delete outright.
    memberships: Mapped[list[Membership]] = relationship(
        back_populates="organization",
        passive_deletes="all",
    )
    products: Mapped[list[Product]] = relationship(
        back_populates="organization",
        passive_deletes="all",
    )
    sales: Mapped[list[Sale]] = relationship(
        back_populates="organization",
        passive_deletes="all",
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Organization id={self.id} name={self.name!r} status={self.status.value}>"

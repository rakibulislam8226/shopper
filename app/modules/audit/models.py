"""Audit log — append-only record of who changed what.

Rows are written, never updated or deleted. ``updated_at``/``deleted_at`` are
inherited from :class:`~app.db.base.BaseModel` like every other table but are
never set in practice — nothing in this codebase issues an UPDATE or a soft
delete against ``audit_logs``.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel
from app.db.enums import ACTOR_TYPE_ENUM, ActorType


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    __table_args__ = (
        # "Show me this org's history", newest first.
        Index("ix_audit_logs_organization_id_created_at", "organization_id", "created_at"),
        # "Show me this record's history", regardless of org.
        Index("ix_audit_logs_entity_type_entity_id", "entity_type", "entity_id"),
    )

    # Nullable: platform-level superadmin actions are not tied to any org.
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=True,
    )

    actor_type: Mapped[ActorType] = mapped_column(ACTOR_TYPE_ENUM, nullable=False)

    # POLYMORPHIC REFERENCE — intentionally NOT a foreign key.
    # Points at ``users.id`` when actor_type is USER and ``superadmins.id``
    # when it is SUPERADMIN. A real FK cannot span two tables, and splitting
    # this into two nullable FK columns would make every audit query branch.
    # The trade-off: the database will not validate this value, so the service
    # layer (later phases) must resolve the actor against the correct table
    # before writing, and readers must tolerate a dangling id.
    actor_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # Dotted action name, e.g. "organization.suspended", "product.price_changed".
    action: Mapped[str] = mapped_column(String(128), nullable=False)

    # Target of the action, e.g. entity_type="Product", entity_id=<product id>.
    # Also a deliberate non-FK: it points at whichever table ``entity_type``
    # names.
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # Snapshots of the changed record. Null where a side does not apply
    # (creation has no before, deletion has no after).
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<AuditLog action={self.action!r} entity={self.entity_type}:{self.entity_id} "
            f"actor={self.actor_type.value}:{self.actor_id}>"
        )

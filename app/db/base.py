from __future__ import annotations

import datetime as dt
import decimal
import uuid
from typing import Any, ClassVar

from sqlalchemy import DateTime, MetaData, Numeric, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)

    type_annotation_map: ClassVar[dict[Any, Any]] = {
        # Always timezone-aware; the database stores UTC (TIMESTAMPTZ).
        dt.datetime: DateTime(timezone=True),
        # UUID primary/foreign keys — PostgreSQL native UUID, not an integer.
        uuid.UUID: Uuid(as_uuid=True),
        # MONEY: exact decimal arithmetic. Never Float.
        decimal.Decimal: Numeric(12, 2),
        # Audit snapshots.
        dict[str, Any]: JSONB,
    }


class BaseModel(Base):
    """Shared columns for every table: id, uid, created_at, updated_at, deleted_at.

    ``__abstract__`` — this class produces no table of its own; every
    subclass gets its own copy of these columns.
    """

    __abstract__ = True

    # sort_order pulls these columns ahead of/behind the subclass's own
    # columns; without it mixin columns are appended in declaration order.
    id: Mapped[int] = mapped_column(
        primary_key=True, autoincrement=True, sort_order=-100
    )
    uid: Mapped[uuid.UUID] = mapped_column(
        unique=True, index=True, default=uuid.uuid4, sort_order=-99
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), nullable=False, sort_order=100
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False, sort_order=101
    )
    deleted_at: Mapped[dt.datetime | None] = mapped_column(
        nullable=True, sort_order=102
    )

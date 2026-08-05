"""SQLAlchemy declarative base.

All ORM models inherit from ``Base`` so Alembic's autogenerate can see them via
``Base.metadata``.

Two things are configured here on purpose:

* **A metadata naming convention.** Without it, PostgreSQL invents names for
  indexes, unique constraints, CHECK constraints and foreign keys, and Alembic
  cannot reliably drop what it cannot name — downgrades break. Every constraint
  in this schema therefore has a deterministic, reproducible name.
* **A type annotation map.** Python annotations map to the SQL types this
  project has standardised on. Most importantly ``decimal.Decimal`` maps to
  ``Numeric(12, 2)`` and *never* to a float — see the money rule below.

MONEY RULE: every monetary column in this codebase is ``Numeric(12, 2)`` and is
read/written as ``decimal.Decimal``. Floats are binary approximations and will
silently corrupt financial totals. Do not "simplify" any money column to
``Float``/``float``.
"""

from __future__ import annotations

import datetime as dt
import decimal
import uuid
from typing import Any, ClassVar

from sqlalchemy import DateTime, MetaData, Numeric, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase

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

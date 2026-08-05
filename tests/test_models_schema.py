"""Schema invariants.

Pure metadata introspection — no database required. These assertions encode the
rules Phase 1 exists to establish, so a future edit that quietly breaks one
(swapping a money column to Float, adding a CASCADE, dropping a CHECK) fails in
CI rather than in production accounting.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import (
    CheckConstraint,
    ColumnDefault,
    Float,
    Integer,
    Numeric,
    UniqueConstraint,
    Uuid,
)

from app.db.models import Base

MONEY_COLUMNS: set[tuple[str, str]] = {
    ("products", "cost_price"),
    ("products", "sale_price"),
    ("price_history", "old_cost_price"),
    ("price_history", "new_cost_price"),
    ("price_history", "old_sale_price"),
    ("price_history", "new_sale_price"),
    ("sales", "unit_price_at_sale"),
    ("sales", "total_amount"),
}

EXPECTED_TABLES = {
    "superadmins",
    "users",
    "organizations",
    "memberships",
    "products",
    "price_history",
    "sales",
    "audit_logs",
}

# audit_logs is the sole exception: organization_id is nullable there because
# platform-level superadmin actions belong to no organization.
NULLABLE_ORG_ID_TABLES = {"audit_logs"}


def test_all_expected_tables_registered() -> None:
    assert set(Base.metadata.tables) >= EXPECTED_TABLES


@pytest.mark.parametrize(("table_name", "column_name"), sorted(MONEY_COLUMNS))
def test_money_columns_are_numeric_12_2(table_name: str, column_name: str) -> None:
    """MONEY RULE. Float would silently corrupt financial totals."""
    column = Base.metadata.tables[table_name].columns[column_name]
    assert isinstance(column.type, Numeric)
    assert not isinstance(column.type, Float)
    assert (column.type.precision, column.type.scale) == (12, 2)


def test_no_float_columns_anywhere() -> None:
    offenders = [
        f"{table.name}.{column.name}"
        for table in Base.metadata.tables.values()
        for column in table.columns
        if isinstance(column.type, Float)
    ]
    assert offenders == []


def test_primary_keys_are_uuid_not_autoincrement() -> None:
    for table in Base.metadata.tables.values():
        pk_columns = list(table.primary_key.columns)
        assert len(pk_columns) == 1, table.name
        pk = pk_columns[0]
        assert isinstance(pk.type, Uuid), f"{table.name}.{pk.name} is not a UUID"
        assert not isinstance(pk.type, Integer), table.name
        default = pk.default
        assert isinstance(default, ColumnDefault), f"{table.name}.{pk.name} has no default"
        # SQLAlchemy wraps a zero-arg callable default in a context-taking
        # shim (preserving __name__), so compare by name, not identity.
        assert default.arg.__name__ == "uuid4", table.name
        assert isinstance(default.arg(None), uuid.UUID), table.name


def test_organization_id_is_indexed_and_not_null() -> None:
    for table in Base.metadata.tables.values():
        column = table.columns.get("organization_id")
        if column is None:
            continue
        if table.name in NULLABLE_ORG_ID_TABLES:
            assert column.nullable, table.name
        else:
            assert not column.nullable, f"{table.name}.organization_id must be NOT NULL"
        indexed = any("organization_id" in index.columns for index in table.indexes)
        assert indexed, f"{table.name}.organization_id is not indexed"


def test_no_cascade_deletes() -> None:
    """Hard deletes must never propagate through financial history."""
    for table in Base.metadata.tables.values():
        for fk in table.foreign_keys:
            assert fk.ondelete == "RESTRICT", (
                f"{table.name}.{fk.parent.name} has ondelete={fk.ondelete!r}, expected RESTRICT"
            )


@pytest.mark.parametrize(
    ("table_name", "constraint_name"),
    [
        ("products", "ck_products_stock_quantity_non_negative"),
        ("products", "ck_products_cost_price_non_negative"),
        ("products", "ck_products_sale_price_non_negative"),
        ("sales", "ck_sales_quantity_positive"),
        ("sales", "ck_sales_total_amount_non_negative"),
        ("sales", "ck_sales_unit_price_at_sale_non_negative"),
        ("memberships", "ck_memberships_single_inviter"),
    ],
)
def test_check_constraints_present(table_name: str, constraint_name: str) -> None:
    names = {
        constraint.name
        for constraint in Base.metadata.tables[table_name].constraints
        if isinstance(constraint, CheckConstraint)
    }
    assert constraint_name in names


def test_composite_uniques_and_indexes() -> None:
    memberships = Base.metadata.tables["memberships"]
    uniques = {
        tuple(sorted(c.name for c in constraint.columns))
        for constraint in memberships.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("organization_id", "user_id") in uniques

    index_columns = {tuple(c.name for c in index.columns) for index in memberships.indexes}
    assert ("organization_id", "role", "status") in index_columns

    products = Base.metadata.tables["products"]
    product_uniques = {
        tuple(c.name for c in constraint.columns)
        for constraint in products.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("organization_id", "sku") in product_uniques

    product_indexes = {tuple(c.name for c in index.columns) for index in products.indexes}
    assert ("organization_id", "status") in product_indexes

    sales_indexes = {
        tuple(c.name for c in index.columns) for index in Base.metadata.tables["sales"].indexes
    }
    assert ("organization_id", "sold_at") in sales_indexes

    audit = Base.metadata.tables["audit_logs"]
    audit_indexes = {tuple(c.name for c in index.columns) for index in audit.indexes}
    assert ("organization_id", "created_at") in audit_indexes
    assert ("entity_type", "entity_id") in audit_indexes


def test_audit_actor_id_is_not_a_foreign_key() -> None:
    """Polymorphic by design — it points at users OR superadmins."""
    audit = Base.metadata.tables["audit_logs"]
    assert audit.columns["actor_id"].foreign_keys == set()
    assert audit.columns["entity_id"].foreign_keys == set()


def test_every_table_has_created_at() -> None:
    for table in Base.metadata.tables.values():
        assert "created_at" in table.columns, table.name
    # Append-only tables carry no updated_at: nothing ever updates them.
    assert "updated_at" not in Base.metadata.tables["audit_logs"].columns

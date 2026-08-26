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
    ("products", "min_price"),
    ("inventory_batches", "unit_cost"),
    ("inventory_batches", "carry_cost"),
    ("inventory_batches", "total_unit_cost"),
    ("inventory_batches", "min_price"),
    ("sale_transactions", "unit_price"),
    ("sale_transactions", "total_amount"),
    ("sale_returns", "refund_amount"),
    ("purchase_returns", "refund_amount"),
    ("shop_expenses", "amount"),
}

EXPECTED_TABLES = {
    "users",
    "shops",
    "shop_memberships",
    "products",
    "product_categories",
    "inventory_batches",
    "inventory_movement_logs",
    "sale_transactions",
    "sale_returns",
    "purchase_returns",
    "expense_categories",
    "shop_expenses",
    "audit_logs",
}

# audit_logs is the sole exception: shop_id is nullable there because
# platform-level superuser actions belong to no shop.
NULLABLE_SHOP_ID_TABLES = {"audit_logs"}

# Deliberate SET NULL references: the referenced row may legitimately go away
# without the child row's history becoming invalid.
SET_NULL_FOREIGN_KEYS = {
    ("users", "last_active_shop_id"),
    ("products", "category_id"),
    ("shop_expenses", "staff_id"),
}


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


def test_primary_keys_are_integer_autoincrement() -> None:
    """id is BaseModel's internal PK/FK target — fast joins, never exposed."""
    for table in Base.metadata.tables.values():
        pk_columns = list(table.primary_key.columns)
        assert len(pk_columns) == 1, table.name
        pk = pk_columns[0]
        assert pk.name == "id", table.name
        assert isinstance(pk.type, Integer), f"{table.name}.{pk.name} is not an Integer"
        assert pk.autoincrement in (True, "auto"), table.name


def test_every_table_has_a_public_uuid() -> None:
    """uid is BaseModel's public identifier — never leaks row counts like id."""
    for table in Base.metadata.tables.values():
        uid = table.columns.get("uid")
        assert uid is not None, f"{table.name} has no uid column"
        assert isinstance(uid.type, Uuid), f"{table.name}.uid is not a UUID"
        assert uid.unique or any(
            list(c.columns) == [uid] for c in table.constraints if hasattr(c, "columns")
        ), f"{table.name}.uid is not unique"
        default = uid.default
        assert isinstance(default, ColumnDefault), f"{table.name}.uid has no default"
        # SQLAlchemy wraps a zero-arg callable default in a context-taking
        # shim (preserving __name__), so compare by name, not identity.
        assert default.arg.__name__ == "uuid4", table.name
        assert isinstance(default.arg(None), uuid.UUID), table.name


def test_every_table_has_soft_delete_and_timestamps() -> None:
    for table in Base.metadata.tables.values():
        assert "created_at" in table.columns, table.name
        assert "updated_at" in table.columns, table.name
        assert "deleted_at" in table.columns, table.name
        assert table.columns["deleted_at"].nullable, table.name


def test_shop_id_is_indexed_and_not_null() -> None:
    for table in Base.metadata.tables.values():
        column = table.columns.get("shop_id")
        if column is None:
            continue
        if table.name in NULLABLE_SHOP_ID_TABLES:
            assert column.nullable, table.name
        else:
            assert not column.nullable, f"{table.name}.shop_id must be NOT NULL"
        indexed = any("shop_id" in index.columns for index in table.indexes)
        assert indexed, f"{table.name}.shop_id is not indexed"


def test_no_unexpected_cascade_deletes() -> None:
    """Hard deletes must never propagate through financial history.

    Every foreign key is RESTRICT except the deliberate SET NULL references
    listed in SET_NULL_FOREIGN_KEYS.
    """
    for table in Base.metadata.tables.values():
        for fk in table.foreign_keys:
            key = (table.name, fk.parent.name)
            expected = "SET NULL" if key in SET_NULL_FOREIGN_KEYS else "RESTRICT"
            assert fk.ondelete == expected, (
                f"{table.name}.{fk.parent.name} has ondelete={fk.ondelete!r}, expected {expected}"
            )


@pytest.mark.parametrize(
    ("table_name", "constraint_name"),
    [
        ("products", "ck_products_stock_quantity_non_negative"),
        ("products", "ck_products_min_price_non_negative"),
        ("inventory_batches", "ck_inventory_batches_quantity_non_negative"),
        ("inventory_batches", "ck_inventory_batches_remaining_quantity_non_negative"),
        ("inventory_batches", "ck_inventory_batches_unit_cost_non_negative"),
        ("sale_transactions", "ck_sale_transactions_quantity_positive"),
        ("sale_transactions", "ck_sale_transactions_total_amount_non_negative"),
        ("sale_transactions", "ck_sale_transactions_unit_price_non_negative"),
        ("sale_returns", "ck_sale_returns_quantity_positive"),
        ("purchase_returns", "ck_purchase_returns_quantity_positive"),
        ("shop_expenses", "ck_shop_expenses_amount_non_negative"),
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
    memberships = Base.metadata.tables["shop_memberships"]
    uniques = {
        tuple(sorted(c.name for c in constraint.columns))
        for constraint in memberships.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("shop_id", "user_id") in uniques

    index_columns = {tuple(c.name for c in index.columns) for index in memberships.indexes}
    assert ("shop_id", "role", "status") in index_columns

    products = Base.metadata.tables["products"]
    product_uniques = {
        tuple(c.name for c in constraint.columns)
        for constraint in products.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("shop_id", "sku") in product_uniques

    product_indexes = {tuple(c.name for c in index.columns) for index in products.indexes}
    assert ("shop_id", "is_active") in product_indexes

    sale_indexes = {
        tuple(c.name for c in index.columns)
        for index in Base.metadata.tables["sale_transactions"].indexes
    }
    assert ("shop_id", "sold_at") in sale_indexes

    audit = Base.metadata.tables["audit_logs"]
    audit_indexes = {tuple(c.name for c in index.columns) for index in audit.indexes}
    assert ("shop_id", "created_at") in audit_indexes
    assert ("entity_type", "entity_id") in audit_indexes


def test_audit_actor_is_a_user_foreign_key() -> None:
    """One identity table, so the actor is a real, validated reference."""
    audit = Base.metadata.tables["audit_logs"]
    actor_fks = {fk.column.table.name for fk in audit.columns["actor_user_id"].foreign_keys}
    assert actor_fks == {"users"}
    # entity_id stays polymorphic — it points at whichever table entity_type names.
    assert audit.columns["entity_id"].foreign_keys == set()

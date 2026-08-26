"""Seed a demo shop with its owner.

    python -m app.cli.seed_shop                      # defaults below
    python -m app.cli.seed_shop --phone 018... --password 'S3cret!' --shop-name 'My Shop'
    python -m app.cli.seed_shop --force               # reset an existing owner/shop

Idempotent: if a user with the same phone already owns a shop with the same
name, both are left untouched unless ``--force`` is passed, in which case the
owner's password/name and the shop's status are reset. The shop is created
ACTIVE (not PENDING) and set as the owner's active shop — this is a dev
bootstrap seed, not the public registration flow, so the usual document
approval gate is skipped on purpose.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.enums import MembershipRole, MembershipStatus, ShopStatus
from app.db.session import async_session_factory, engine
from app.modules.memberships.models import ShopMembership
from app.modules.shops.models import Shop
from app.modules.shops.service import _unique_slug
from app.modules.users.models import User

DEFAULT_PHONE = "01560005711"
# Dev bootstrap default — rotate in production.
DEFAULT_PASSWORD = "Admin@123"
DEFAULT_NAME = "Rakibul Islam"
DEFAULT_SHOP_NAME = "Rakib's Shop"


async def seed_owner_shop(phone: str, password: str, name: str, shop_name: str, force: bool) -> int:
    """Create (or reset) an owner user with an active shop. Returns an exit code."""
    async with async_session_factory() as session:
        user_result = await session.execute(select(User).where(User.phone == phone))
        user = user_result.scalar_one_or_none()

        existing_membership: ShopMembership | None = None
        if user is not None:
            membership_result = await session.execute(
                select(ShopMembership)
                .join(Shop, Shop.id == ShopMembership.shop_id)
                .where(
                    ShopMembership.user_id == user.id,
                    ShopMembership.role == MembershipRole.OWNER,
                    Shop.name == shop_name,
                    Shop.deleted_at.is_(None),
                )
            )
            existing_membership = membership_result.scalar_one_or_none()

        if user is not None and existing_membership is not None and not force:
            shop = await session.get(Shop, existing_membership.shop_id)
            assert shop is not None
            print(
                f"Owner + shop already exist: phone={user.phone} uid={user.uid} "
                f"shop_uid={shop.uid} status={shop.status.value}. Pass --force to reset."
            )
            return 0

        if user is None:
            user = User(name=name, phone=phone)
            session.add(user)
            user_action = "created"
        else:
            user.name = name
            user_action = "reset"

        user.password_hash = hash_password(password)
        user.is_active = True
        user.must_change_password = False
        user.deleted_at = None
        await session.flush()  # assign user.id for the FKs below

        if existing_membership is not None:
            shop = await session.get(Shop, existing_membership.shop_id)
            assert shop is not None
            shop.status = ShopStatus.ACTIVE
            shop_action = "reset"
        else:
            slug = await _unique_slug(session, shop_name)
            shop = Shop(
                name=shop_name,
                slug=slug,
                status=ShopStatus.ACTIVE,
                created_by_user_id=user.id,
            )
            session.add(shop)
            await session.flush()  # assign shop.id for the membership FK

            membership = ShopMembership(
                user_id=user.id,
                shop_id=shop.id,
                role=MembershipRole.OWNER,
                status=MembershipStatus.ACTIVE,
                invited_by_user_id=user.id,
            )
            session.add(membership)
            shop_action = "created"

        user.last_active_shop_id = shop.id

        await session.commit()
        await session.refresh(user)
        await session.refresh(shop)

    print(
        f"User {user_action}: phone={user.phone} uid={user.uid} | "
        f"Shop {shop_action}: name={shop.name!r} uid={shop.uid} status={shop.status.value}"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli.seed_shop", description=__doc__)
    parser.add_argument("--phone", default=DEFAULT_PHONE, help=f"default: {DEFAULT_PHONE}")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="default: Admin@123")
    parser.add_argument("--name", default=DEFAULT_NAME, help=f"default: {DEFAULT_NAME}")
    parser.add_argument(
        "--shop-name", default=DEFAULT_SHOP_NAME, help=f"default: {DEFAULT_SHOP_NAME}"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="reset the owner's password/name and the shop's status if they already exist",
    )
    args = parser.parse_args()

    async def run() -> int:
        try:
            return await seed_owner_shop(
                args.phone, args.password, args.name, args.shop_name, args.force
            )
        finally:
            await engine.dispose()

    return asyncio.run(run())


if __name__ == "__main__":
    sys.exit(main())

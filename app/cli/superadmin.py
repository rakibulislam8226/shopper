"""Seed the initial platform superadmin.

    python -m app.cli.seed                      # defaults below
    python -m app.cli.seed --phone 018... --password 'S3cret!' --name 'Ops'
    python -m app.cli.seed --force              # reset an existing account

Idempotent: an existing user with the same phone is left untouched unless
``--force`` is passed, in which case the password, name, and flags are reset.
A superadmin is a plain ``users`` row with ``is_superadmin`` set — there is no
separate superadmin table and no membership involved.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import async_session_factory, engine
from app.modules.users.models import User

DEFAULT_PHONE = "01776068226"
# Dev bootstrap default — rotate in production.
DEFAULT_PASSWORD = "Admin@123"
DEFAULT_NAME = "Rakibul Islam"


async def seed_superadmin(phone: str, password: str, name: str, force: bool) -> int:
    """Create (or reset) the superadmin. Returns a process exit code."""
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.phone == phone))
        user = result.scalar_one_or_none()

        if user is not None and not force:
            print(
                f"Superadmin already exists: phone={user.phone} uid={user.uid} "
                f"is_superadmin={user.is_superadmin}. Pass --force to reset it."
            )
            return 0

        if user is None:
            user = User(name=name, phone=phone)
            session.add(user)
            action = "created"
        else:
            user.name = name
            action = "reset"

        user.password_hash = hash_password(password)
        user.is_superadmin = True
        user.is_active = True
        user.must_change_password = False
        user.deleted_at = None

        await session.commit()
        await session.refresh(user)

    print(f"Superadmin {action}: phone={user.phone} uid={user.uid}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli.seed", description=__doc__)
    parser.add_argument("--phone", default=DEFAULT_PHONE, help=f"default: {DEFAULT_PHONE}")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="default: Admin@123")
    parser.add_argument("--name", default=DEFAULT_NAME, help=f"default: {DEFAULT_NAME}")
    parser.add_argument(
        "--force",
        action="store_true",
        help="reset password/flags if the account already exists",
    )
    args = parser.parse_args()

    async def run() -> int:
        try:
            return await seed_superadmin(args.phone, args.password, args.name, args.force)
        finally:
            await engine.dispose()

    return asyncio.run(run())


if __name__ == "__main__":
    sys.exit(main())

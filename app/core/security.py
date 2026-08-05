"""Security helpers.

Phase 0 provides password hashing (Argon2 via passlib). JWT access/refresh
token helpers are added here in Phase 2 — they will read their secrets and
lifetimes from ``settings`` (``jwt_access_secret`` etc.), which are already
defined and validated.
"""

from __future__ import annotations

from passlib.context import CryptContext

# Argon2id — modern, memory-hard, and the current OWASP-recommended default.
_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return an Argon2 hash for the given plaintext password."""
    return str(_pwd_context.hash(plain_password))


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored Argon2 hash."""
    return bool(_pwd_context.verify(plain_password, password_hash))


def needs_rehash(password_hash: str) -> bool:
    """True if the hash was produced with outdated parameters and should be re-hashed."""
    return bool(_pwd_context.needs_update(password_hash))

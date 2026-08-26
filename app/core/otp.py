"""Phone OTP: generation, delivery, and Redis-backed verification.

Two delivery modes, switched by ``settings.use_fixed_otp``:

* Fixed (dev/staging) — every OTP is ``settings.fixed_otp``, nothing is sent,
  and no SMS provider credentials are needed.
* Real — a random numeric code is generated and handed to :func:`send_otp`.

No SMS provider is wired up yet, so :func:`send_otp` logs the code instead of
delivering it. Swap its body for a real provider (Twilio, etc.) before this
ever reaches production with ``use_fixed_otp=false``.

The code is never written to Postgres — only Redis holds it, keyed by purpose
and phone, with a TTL (``settings.otp_ttl_seconds``). Once that TTL elapses
Redis drops the key itself; nothing here has to sweep for expiry.
"""

from __future__ import annotations

import secrets

from app.config import settings
from app.core.logging import get_logger
from app.redis.client import redis_client

logger = get_logger(__name__)

_OTP_KEY = "otp:{purpose}:{phone}"


def _otp_key(purpose: str, phone: str) -> str:
    return _OTP_KEY.format(purpose=purpose, phone=phone)


def _generate_code() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(settings.otp_length))


async def send_otp(phone: str, purpose: str) -> None:
    """Generate (or pick the fixed) OTP, store it in Redis, and deliver it.

    ``purpose`` namespaces the code (e.g. ``"password_reset"``) so two
    concurrent flows for the same phone never collide or verify each other.
    """
    code = settings.fixed_otp if settings.use_fixed_otp else _generate_code()

    await redis_client.set(_otp_key(purpose, phone), code, ex=settings.otp_ttl_seconds)

    if settings.use_fixed_otp:
        logger.info("otp_issued_fixed", phone=phone, purpose=purpose)
    else:
        # TODO: wire a real SMS provider here. Logging the code is a stand-in
        # so the flow stays testable end-to-end until that's in place.
        logger.warning("otp_issued_no_sms_provider", phone=phone, purpose=purpose, code=code)


async def verify_otp(phone: str, purpose: str, code: str) -> bool:
    """Check ``code`` against the stored OTP. Consumes it either way.

    Single-use: a correct code cannot be replayed, and a wrong guess does not
    get unlimited retries against the same stored code.
    """
    key = _otp_key(purpose, phone)
    stored = await redis_client.get(key)
    if stored is None:
        return False

    await redis_client.delete(key)
    return secrets.compare_digest(stored, code)

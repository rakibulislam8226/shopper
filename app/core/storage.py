"""File storage for user-uploaded documents (shop documents, logos, ...).

Local disk today, driven by ``settings.media_storage_driver``. The S3 branch
is not implemented — it raises rather than silently falling back to local, so
a misconfigured production deployment fails at startup, not on a customer's
first upload.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings
from app.core.exceptions import AppError

# Matches the extension only (e.g. ".pdf"); anything else in the client's
# filename is discarded so a hostile name can't traverse or overwrite paths.
_EXTENSION_RE = re.compile(r"\.[A-Za-z0-9]{1,10}$")

_ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def _safe_extension(filename: str | None) -> str:
    match = _EXTENSION_RE.search(filename or "")
    ext = match.group(0).lower() if match else ""
    if ext not in _ALLOWED_EXTENSIONS:
        raise AppError(f"Unsupported file type: {ext or 'unknown'}")
    return ext


async def save_upload(file: UploadFile, *, subdir: str) -> str:
    """Persist ``file`` under ``<upload_dir>/<subdir>/`` and return its public URL."""
    if settings.media_storage_driver != "local":
        raise AppError("S3 storage is not configured yet", status_code=500)

    extension = _safe_extension(file.filename)

    body = await file.read()
    if len(body) > _MAX_UPLOAD_BYTES:
        raise AppError("File too large (max 10 MB)")
    if not body:
        raise AppError("Uploaded file is empty")

    directory = Path(settings.media_local_upload_dir) / subdir
    directory.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}{extension}"
    (directory / filename).write_bytes(body)

    return f"{settings.media_local_base_url.rstrip('/')}/{subdir}/{filename}"

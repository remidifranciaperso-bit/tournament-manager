"""Initialisation Live V2 via Engine V2 (pack reconstruit depuis Platform)."""

from __future__ import annotations

import io
import json
import zipfile

import httpx

from api.platform.config import ENGINE_V2_URL


def init_live_from_platform_pack(
    *,
    pdf_bytes: bytes,
    pdf_filename: str,
    live_snapshot: dict,
    logo_bytes: bytes | None = None,
    logo_content_type: str | None = None,
) -> dict:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(pdf_filename, pdf_bytes)
        archive.writestr("tournoi.live.json", json.dumps(live_snapshot, ensure_ascii=False))
        if logo_bytes:
            ext = ".png"
            if logo_content_type and "jpeg" in logo_content_type:
                ext = ".jpg"
            archive.writestr(f"logo{ext}", logo_bytes)

    buffer.seek(0)
    files = {"pack": ("manager-live.zip", buffer.getvalue(), "application/zip")}
    url = f"{ENGINE_V2_URL.rstrip('/')}/api/live/init-from-pack"
    with httpx.Client(timeout=120.0) as client:
        response = client.post(url, files=files)
        response.raise_for_status()
        return response.json()

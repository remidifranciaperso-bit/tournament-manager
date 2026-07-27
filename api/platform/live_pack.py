"""Initialisation Live V2 via Engine V2 (pack reconstruit depuis Platform, API existante)."""

from __future__ import annotations

import io
import json
import time
import zipfile

import httpx

from api.platform.config import ENGINE_V2_URL


def _wake_engine(client: httpx.Client) -> None:
    try:
        client.get(f"{ENGINE_V2_URL.rstrip('/')}/api/v2/health")
    except httpx.HTTPError:
        pass


def init_live_from_platform_pack(
    *,
    pdf_bytes: bytes,
    pdf_filename: str,
    live_snapshot: dict,
    logo_bytes: bytes | None = None,
    logo_content_type: str | None = None,
) -> dict:
    """Pack ZIP PDF + snapshot JSON — endpoint Engine V2 ``/api/live/init-from-pack`` (inchangé)."""
    slim_snapshot = {
        key: value
        for key, value in live_snapshot.items()
        if key not in {"export_captures", "crosspage_stubs"}
    }
    slim_snapshot.setdefault("version", "engine-v2-live-capture-1")
    slim_snapshot.setdefault("pdf_filename", pdf_filename)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(pdf_filename, pdf_bytes)
        archive.writestr(
            "tournoi.live.json",
            json.dumps(slim_snapshot, ensure_ascii=False),
        )
        has_logo_png = isinstance(slim_snapshot.get("logo_png"), str) and slim_snapshot["logo_png"].strip()
        if logo_bytes and not has_logo_png:
            ext = ".png"
            if logo_content_type and "jpeg" in logo_content_type:
                ext = ".jpg"
            archive.writestr(f"logo{ext}", logo_bytes)

    pack_bytes = buffer.getvalue()
    files = {"pack": ("manager-live.zip", pack_bytes, "application/zip")}
    url = f"{ENGINE_V2_URL.rstrip('/')}/api/live/init-from-pack"
    timeout = httpx.Timeout(300.0, connect=90.0)
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            with httpx.Client(timeout=timeout) as client:
                if attempt == 0:
                    _wake_engine(client)
                response = client.post(url, files=files)
                response.raise_for_status()
                body = response.json()
            if not isinstance(body, dict) or not body.get("live_token"):
                raise ValueError("Réponse Live V2 invalide (live_token absent).")
            return body
        except (httpx.RemoteProtocolError, httpx.ReadError, httpx.WriteError) as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(2.0)
                continue
            raise
    if last_error is not None:
        raise last_error
    raise RuntimeError("Live init impossible.")

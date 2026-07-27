"""Initialisation Live V2 via Engine V2 (pack reconstruit depuis Platform, API existante)."""

from __future__ import annotations

import base64
import json
import shutil
import tempfile
import time
import zipfile
from pathlib import Path

import httpx

from api.platform.config import ENGINE_V2_URL


def _wake_engine(client: httpx.Client) -> None:
    try:
        client.get(f"{ENGINE_V2_URL.rstrip('/')}/api/v2/health")
    except httpx.HTTPError:
        pass


def _logo_bytes_for_pack(live_snapshot: dict, logo_bytes: bytes | None) -> bytes | None:
    if logo_bytes:
        return logo_bytes
    encoded = live_snapshot.get("logo_png")
    if not isinstance(encoded, str) or not encoded.strip():
        return None
    try:
        payload = base64.b64decode(encoded, validate=False)
    except (ValueError, TypeError):
        return None
    return payload if len(payload) >= 64 else None


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
        if key not in {"export_captures", "crosspage_stubs", "logo_png"}
    }
    slim_snapshot.setdefault("version", "engine-v2-live-capture-1")
    slim_snapshot.setdefault("pdf_filename", pdf_filename)

    pack_logo = _logo_bytes_for_pack(live_snapshot, logo_bytes)
    json_payload = json.dumps(slim_snapshot, ensure_ascii=False).encode("utf-8")

    temp_dir = Path(tempfile.mkdtemp(prefix="platform-live-pack-"))
    zip_path = temp_dir / "manager-live.zip"
    try:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(pdf_filename, pdf_bytes)
            archive.writestr("tournoi.live.json", json_payload)
            if pack_logo:
                ext = ".jpg" if logo_content_type and "jpeg" in logo_content_type else ".png"
                archive.writestr(f"logo{ext}", pack_logo)

        url = f"{ENGINE_V2_URL.rstrip('/')}/api/live/init-from-pack"
        timeout = httpx.Timeout(300.0, connect=90.0)
        last_error: Exception | None = None

        for attempt in range(3):
            try:
                with httpx.Client(timeout=timeout) as client:
                    if attempt == 0:
                        _wake_engine(client)
                    with zip_path.open("rb") as pack_file:
                        files = {
                            "pack": ("manager-live.zip", pack_file, "application/zip"),
                        }
                        response = client.post(
                            url,
                            files=files,
                            headers={"Accept-Encoding": "identity"},
                        )
                    response.raise_for_status()
                    body = response.json()
                if not isinstance(body, dict) or not body.get("live_token"):
                    raise ValueError("Réponse Live V2 invalide (live_token absent).")
                body.pop("logo_png", None)
                return body
            except (
                httpx.RemoteProtocolError,
                httpx.ReadError,
                httpx.WriteError,
                httpx.TimeoutException,
            ) as exc:
                last_error = exc
                if attempt < 2:
                    time.sleep(2.0 * (attempt + 1))
                    continue
                raise
        if last_error is not None:
            raise last_error
        raise RuntimeError("Live init impossible.")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

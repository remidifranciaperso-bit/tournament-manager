"""Session Manager Live hébergée sur Platform (snapshot + PDF en BDD, sans Engine V2)."""

from __future__ import annotations

import base64
import shutil
import tempfile
from pathlib import Path

from engine.live_init import init_live_from_snapshot
from engine.live_pack import valider_snapshot


def _write_logo_file(
    temp_dir: Path,
    live_snapshot: dict,
    logo_bytes: bytes | None,
    logo_content_type: str | None,
) -> Path | None:
    if logo_bytes:
        ext = ".jpg" if logo_content_type and "jpeg" in logo_content_type else ".png"
        path = temp_dir / f"logo{ext}"
        path.write_bytes(logo_bytes)
        return path
    encoded = live_snapshot.get("logo_png")
    if not isinstance(encoded, str) or not encoded.strip():
        return None
    try:
        payload = base64.b64decode(encoded, validate=False)
    except (ValueError, TypeError):
        return None
    if len(payload) < 64:
        return None
    path = temp_dir / "logo.png"
    path.write_bytes(payload)
    return path


def init_platform_live_session(
    *,
    pdf_bytes: bytes,
    pdf_filename: str,
    live_snapshot: dict,
    logo_bytes: bytes | None = None,
    logo_content_type: str | None = None,
) -> dict:
    """Crée une session ``/api/live/{token}`` locale depuis le tournoi Platform."""
    slim_snapshot = {
        key: value
        for key, value in live_snapshot.items()
        if key not in {"export_captures", "crosspage_stubs"}
    }
    slim_snapshot.setdefault("version", "engine-v2-live-capture-1")
    slim_snapshot.setdefault("pdf_filename", pdf_filename)
    valider_snapshot(slim_snapshot)

    temp_dir = Path(tempfile.mkdtemp(prefix="platform-live-local-"))
    pdf_path = temp_dir / (pdf_filename or "tournoi.pdf")
    pdf_path.write_bytes(pdf_bytes)
    logo_path = _write_logo_file(temp_dir, live_snapshot, logo_bytes, logo_content_type)

    try:
        payload = init_live_from_snapshot(pdf_path, slim_snapshot, logo_path)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    if not isinstance(payload, dict) or not payload.get("live_token"):
        raise ValueError("Initialisation Live impossible (live_token absent).")
    payload.pop("logo_png", None)
    return payload

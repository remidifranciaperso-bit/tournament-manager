"""Session Manager Live Platform — même init que Engine V2 ``init-from-pack`` (sans modifier V2)."""

from __future__ import annotations

import base64
import shutil
import tempfile
from pathlib import Path

_SNAPSHOT_VERSIONS = frozenset({"engine-live-snapshot-1", "engine-v2-live-capture-1"})
_SNAPSHOT_REQUIRED = ("version", "pdf_filename", "meta", "matches", "fields", "page_map")


def _valider_snapshot(snapshot: dict) -> None:
    version = snapshot.get("version")
    if version not in _SNAPSHOT_VERSIONS:
        raise ValueError(
            f"Snapshot incompatible (version={version!r}). Regénérez le tournoi depuis Nouveau tournoi."
        )
    for cle in _SNAPSHOT_REQUIRED:
        if cle not in snapshot:
            raise ValueError(f"Snapshot incomplet : champ « {cle} » manquant.")
    page_map = snapshot.get("page_map") or {}
    if not page_map.get("main") and not page_map.get("classement"):
        raise ValueError("Snapshot invalide : aucune page tableau cartographiée.")


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
    """Crée une session ``/api/live/{token}`` — code partagé ``engine.live_init``."""
    from engine.live_init import init_live_from_snapshot

    slim_snapshot = {
        key: value
        for key, value in live_snapshot.items()
        if key not in {"export_captures", "crosspage_stubs"}
    }
    slim_snapshot.setdefault("version", "engine-v2-live-capture-1")
    slim_snapshot.setdefault("pdf_filename", pdf_filename)
    _valider_snapshot(slim_snapshot)

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

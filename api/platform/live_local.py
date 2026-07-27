"""Session Manager Live Platform — même logique que ``engine.live_init.init_live_from_snapshot``."""

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


def _init_live_from_snapshot_local(
    pdf_path: Path, snapshot: dict, logo_path: Path | None
) -> dict:
    """Copie de ``engine.live_init.init_live_from_snapshot`` — imports sans pandas."""
    from api.live_store import chemin_logo, creer_session
    from engine.live_logo_session import logo_url_pour_meta, preparer_logo_import
    from engine.live_page_map import elaguer_planning_layout, normaliser_page_map_planning

    pdf_filename = snapshot.get("pdf_filename") or pdf_path.name
    planning_layout = snapshot.get("planning_layout") or {}
    page_map = normaliser_page_map_planning(
        snapshot["page_map"],
        planning_layout=planning_layout,
    )
    planning_layout = elaguer_planning_layout(page_map, planning_layout)
    page_sizes = snapshot.get("page_sizes") or {}

    if not page_map.get("main") and not page_map.get("classement"):
        raise ValueError("Snapshot invalide : aucune page tableau pour le live.")

    resolved_logo = preparer_logo_import(pdf_path, snapshot, logo_path)

    live_token, _pages_dir, page_sizes = creer_session(
        pdf_path,
        pdf_filename,
        page_map,
        logo_path=resolved_logo,
        move_pdf=True,
        trim_logo=False,
        page_sizes=page_sizes,
        pack_version=snapshot.get("version"),
    )

    meta = dict(snapshot["meta"])
    logo_url = logo_url_pour_meta(live_token)
    if logo_url is not None:
        meta["logo_url"] = logo_url

    payload = {
        "meta": meta,
        "matches": snapshot["matches"],
        "page_map": page_map,
        "fields": snapshot["fields"],
        "planning_layout": planning_layout,
        "live_token": live_token,
        "page_sizes": page_sizes,
        "pdf_filename": pdf_filename,
        "live_version": "engine-pdf",
        "pack_version": snapshot.get("version"),
    }
    if chemin_logo(live_token) is None:
        logo_png = snapshot.get("logo_png")
        if logo_png:
            payload["logo_png"] = logo_png
    return payload


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
    _valider_snapshot(slim_snapshot)

    temp_dir = Path(tempfile.mkdtemp(prefix="platform-live-local-"))
    pdf_path = temp_dir / (pdf_filename or "tournoi.pdf")
    pdf_path.write_bytes(pdf_bytes)
    logo_path = _write_logo_file(temp_dir, live_snapshot, logo_bytes, logo_content_type)

    try:
        payload = _init_live_from_snapshot_local(pdf_path, slim_snapshot, logo_path)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    if not isinstance(payload, dict) or not payload.get("live_token"):
        raise ValueError("Initialisation Live impossible (live_token absent).")
    payload.pop("logo_png", None)
    return payload

"""Snapshot figé d'une génération Engine pour reprise Manager live."""

from __future__ import annotations

import base64
import copy
from pathlib import Path

from engine.live_export import (
    _enrichir_planning_layout,
    serialiser_match,
    serialiser_tournoi,
)
from engine.live_page_map import elaguer_planning_layout, normaliser_page_map_planning
from engine.live_valeurs import construire_champs_live

SNAPSHOT_VERSION = "engine-live-snapshot-1"
SNAPSHOT_VERSIONS_COMPATIBLES = frozenset(
    {
        SNAPSHOT_VERSION,
        "engine-v2-live-capture-1",
    }
)


def snapshot_version_acceptee(version: object) -> bool:
    return isinstance(version, str) and version in SNAPSHOT_VERSIONS_COMPATIBLES


def _encoder_logo_snapshot(logo_path: Path | str | None) -> str | None:
    if logo_path is None:
        return None
    from engine.logo_prepare import preparer_logo_png_export

    payload = preparer_logo_png_export(logo_path)
    if payload is None:
        return None
    return base64.b64encode(payload).decode("ascii")


def materialiser_logo_snapshot(snapshot: dict, dest_dir: Path) -> Path | None:
    """Décode logo_png du snapshot vers un fichier temporaire."""
    payload = snapshot.get("logo_png")
    if not payload:
        return None
    try:
        data = base64.b64decode(payload)
    except (ValueError, TypeError):
        return None
    if len(data) < 64:
        return None
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    destination = dest_dir / "logo.png"
    destination.write_bytes(data)
    return destination


def construire_snapshot_engine(
    tournoi,
    matchs,
    cache: dict,
    pdf_filename: str,
    *,
    logo_path: Path | str | None = None,
) -> dict:
    """État tournoi exact au moment de la génération PDF (tableau + planning figés)."""
    fields = construire_champs_live(tournoi, matchs)
    planning_layout = copy.deepcopy(cache.get("planning_layout") or {})
    page_map = normaliser_page_map_planning(
        copy.deepcopy(cache["page_map"]),
        planning_layout=planning_layout,
    )
    planning_layout = elaguer_planning_layout(page_map, planning_layout)
    if planning_layout:
        planning_layout = _enrichir_planning_layout(planning_layout, fields)

    snapshot = {
        "version": SNAPSHOT_VERSION,
        "pdf_filename": pdf_filename,
        "meta": serialiser_tournoi(tournoi),
        "matches": [serialiser_match(match) for match in matchs],
        "fields": fields,
        "page_map": page_map,
        "planning_layout": planning_layout,
        "page_sizes": cache.get("page_sizes") or {},
    }

    logo_png = _encoder_logo_snapshot(logo_path)
    if logo_png:
        snapshot["logo_png"] = logo_png

    return snapshot

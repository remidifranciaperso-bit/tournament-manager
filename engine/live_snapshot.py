"""Snapshot figé d'une génération Engine pour reprise Manager live."""

from __future__ import annotations

import copy

from engine.live_export import (
    _enrichir_planning_layout,
    serialiser_match,
    serialiser_tournoi,
)
from engine.live_valeurs import construire_champs_live

SNAPSHOT_VERSION = "engine-live-snapshot-1"


def construire_snapshot_engine(
    tournoi,
    matchs,
    cache: dict,
    pdf_filename: str,
) -> dict:
    """État tournoi exact au moment de la génération PDF (tableau + planning figés)."""
    fields = construire_champs_live(tournoi, matchs)
    planning_layout = copy.deepcopy(cache.get("planning_layout") or {})
    if planning_layout:
        planning_layout = _enrichir_planning_layout(planning_layout, fields)

    return {
        "version": SNAPSHOT_VERSION,
        "pdf_filename": pdf_filename,
        "meta": serialiser_tournoi(tournoi),
        "matches": [serialiser_match(match) for match in matchs],
        "fields": fields,
        "page_map": cache["page_map"],
        "planning_layout": planning_layout,
        "page_sizes": cache.get("page_sizes") or {},
    }

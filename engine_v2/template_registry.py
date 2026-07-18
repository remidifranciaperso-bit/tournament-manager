"""Résolution template / cache pour Engine V2 (géométrie depuis .live.json)."""

from __future__ import annotations

from pathlib import Path

from engine.live_template_cache import charger_cache_live
from engine.tournament_build import chemin_template, construire_nom_export


def template_id_from_path(template_path: Path) -> str:
    """Ex. ``Template_16_1J.pptx`` → ``Template_16_1J``."""
    return template_path.stem


def resolve_template_bundle(tournoi, base_dir: Path) -> tuple[Path, str, dict]:
    """Retourne (chemin_pptx, template_id, cache_live)."""
    template_path = chemin_template(tournoi, base_dir)
    cache = charger_cache_live(template_path)
    if not cache.get("page_map"):
        raise RuntimeError(f"Cache live introuvable pour {template_path.name}")
    return template_path, template_id_from_path(template_path), cache


def export_basename(tournoi) -> str:
    return construire_nom_export(
        type_tournoi=tournoi.type_tournoi,
        club=tournoi.club,
        date_tournoi=tournoi.date_tournoi,
    )

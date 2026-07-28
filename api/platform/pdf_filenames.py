"""Noms de fichiers PDF export Platform (pré-live, terminé, convocations, résultats)."""

from __future__ import annotations

import re
from typing import Any

from engine.tournament_paths import format_date_fichier, nettoyer_nom_fichier


def _meta(row: Any) -> dict[str, Any]:
    snapshot = row.live_snapshot if isinstance(row.live_snapshot, dict) else {}
    meta = snapshot.get("meta")
    return meta if isinstance(meta, dict) else {}


def _type_label(row: Any) -> str:
    meta = _meta(row)
    type_tournoi = str(meta.get("type_tournoi") or "").strip()
    if type_tournoi:
        return type_tournoi
    format_label = str(row.format_label or "").strip()
    if "·" in format_label:
        return format_label.split("·", 1)[0].strip()
    name = str(row.name or "").strip()
    if name:
        return name.split(" ", 1)[0]
    return format_label or "TOURNOI"


def _genre_label(row: Any) -> str:
    meta = _meta(row)
    genre = str(meta.get("genre_tournoi") or meta.get("genre") or "").strip()
    if genre in {"Hommes", "Femmes", "Mixte"}:
        return genre
    return "Hommes"


def _club_label(row: Any, club_name: str) -> str:
    meta = _meta(row)
    club = str(meta.get("club") or club_name or row.name or "CLUB").strip()
    return club or "CLUB"


def _date_label(row: Any) -> str:
    meta = _meta(row)
    date_iso = str(meta.get("date_tournoi") or "").strip()
    if date_iso:
        return format_date_fichier(date_iso)
    stored = str(row.date_label or "").strip()
    match = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", stored)
    if match:
        day, month, year = match.groups()
        return f"{day}-{month}-{year[2:]}"
    match = re.match(r"^(\d{2})-(\d{2})-(\d{4})$", stored)
    if match:
        day, month, year = match.groups()
        return f"{day}-{month}-{year[2:]}"
    return nettoyer_nom_fichier(stored or "DATE")


def platform_pdf_base(row: Any, club_name: str = "") -> str:
    type_part = nettoyer_nom_fichier(_type_label(row))
    genre_part = nettoyer_nom_fichier(_genre_label(row))
    club_part = nettoyer_nom_fichier(_club_label(row, club_name))
    date_part = _date_label(row)
    return f"{type_part} {genre_part}-{club_part}-{date_part}"


def platform_pre_live_pdf_filename(row: Any, club_name: str = "") -> str:
    return f"{platform_pdf_base(row, club_name)}.pdf"


def platform_finished_pdf_filename(row: Any, club_name: str = "") -> str:
    return f"{platform_pdf_base(row, club_name)}-TERMINÉ.pdf"


def platform_convocations_pdf_filename(row: Any, club_name: str = "") -> str:
    return f"CONVOCATIONS-{platform_pdf_base(row, club_name)}.pdf"


def platform_resultats_pdf_filename(row: Any, club_name: str = "") -> str:
    return f"RÉSULTATS-{platform_pdf_base(row, club_name)}.pdf"


def platform_tournament_pdf_filename(row: Any, club_name: str = "") -> str:
    if row.status == "finished":
        return platform_finished_pdf_filename(row, club_name)
    return platform_pre_live_pdf_filename(row, club_name)

"""Page de couverture Engine V2."""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import fitz

from engine_v2.pages._layout import (
    draw_cover_background,
    draw_cover_logo,
    draw_cover_texts,
)


def tournoi_from_snapshot(snapshot: dict | None):
    """Objet minimal pour ``draw_cover_texts`` à partir du snapshot Live."""
    meta = (snapshot or {}).get("meta") or {}
    return SimpleNamespace(
        club=meta.get("club") or "",
        type_tournoi=meta.get("type_tournoi") or "",
        genre_tournoi=meta.get("genre_tournoi"),
        date_tournoi=meta.get("date_tournoi"),
        heure_debut=meta.get("heure_debut") or "",
        terrains=list(meta.get("terrains") or []),
        nb_equipes=int(meta.get("nb_equipes") or 0),
    )


def render_cover_page(
    page: fitz.Page,
    tournoi,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    draw_cover_background(page, base_dir)
    draw_cover_logo(
        page,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
        club_name=getattr(tournoi, "club", None),
        base_dir=base_dir,
    )
    draw_cover_texts(page, tournoi, base_dir=base_dir)

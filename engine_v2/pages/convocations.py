"""Page convocations Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.ppt_engine import construire_convocations
from engine_v2.pages._layout import content_area, draw_page_footer_logo, draw_page_header
from engine_v2.pages._theme import draw_table


def _equipe_par_nom(tournoi) -> dict[str, object]:
    return {equipe.nom(): equipe for equipe in tournoi.equipes}


def render_convocations_page(
    page: fitz.Page,
    tournoi,
    matchs: list,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    page.draw_rect(page.rect, color=None, fill=(1, 1, 1), overlay=False)
    draw_page_header(page, tournoi, "CONVOCATIONS", base_dir=base_dir)

    convocations = construire_convocations(
        matchs,
        tournoi.date_tournoi,
        heure_debut_tournoi=tournoi.heure_debut,
        heures_debut_jours=tournoi.heures_debut_jours,
    )
    equipes = _equipe_par_nom(tournoi)
    rows: list[list[str]] = []
    for nom, heure in convocations:
        equipe = equipes.get(nom)
        label = equipe.nom_complet_court() if equipe else nom
        rows.append([label, heure])

    draw_table(
        page,
        content_area(page.rect),
        headers=["Équipe", "Heure"],
        rows=rows,
        col_widths=[0.68, 0.32],
        base_dir=base_dir,
    )

    draw_page_footer_logo(page, logo_bytes=logo_bytes, logo_wh=logo_wh)

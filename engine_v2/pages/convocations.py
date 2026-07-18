"""Page convocations Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.ppt_engine import construire_convocations
from engine_v2.pages._theme import content_rect, draw_brush_title, draw_footer_bar, draw_table, font_paths


def render_convocations_page(
    page: fitz.Page,
    tournoi,
    matchs: list,
    *,
    base_dir: Path,
) -> None:
    page.draw_rect(page.rect, color=None, fill=(1, 1, 1), overlay=False)
    fonts = font_paths(base_dir)
    draw_brush_title(page, "CONVOCATIONS", brush_font=fonts.get("brush"))

    convocations = construire_convocations(
        matchs,
        tournoi.date_tournoi,
        heure_debut_tournoi=tournoi.heure_debut,
        heures_debut_jours=tournoi.heures_debut_jours,
    )
    rows = [[nom, heure] for nom, heure in convocations]

    draw_table(
        page,
        content_rect(page.rect),
        headers=["Équipe", "Heure de convocation"],
        rows=rows,
        col_widths=[0.68, 0.32],
    )

    draw_footer_bar(page, tournoi.club, tournoi.type_tournoi)

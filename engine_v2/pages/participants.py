"""Page participants Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.ppt_engine import format_nombre
from engine_v2.pages._theme import content_rect, draw_footer_bar, draw_table, font_paths
from engine_v2.pages._theme import draw_brush_title


def _participants_title(tournoi) -> str:
    genre = getattr(tournoi, "genre_tournoi", "") or ""
    if "F" in genre.upper() and "M" not in genre.upper().replace("F", "", 1):
        return "PARTICIPANTES"
    return "PARTICIPANTS"


def render_participants_page(
    page: fitz.Page,
    tournoi,
    *,
    base_dir: Path,
) -> None:
    page.draw_rect(page.rect, color=None, fill=(1, 1, 1), overlay=False)
    fonts = font_paths(base_dir)
    draw_brush_title(page, _participants_title(tournoi), brush_font=fonts.get("brush"))

    equipes = sorted(tournoi.equipes, key=lambda t: (t.ts, t.numero))
    rows: list[list[str]] = []
    for team in equipes:
        rows.append(
            [
                team.joueur1,
                format_nombre(team.classement_j1),
                team.joueur2,
                format_nombre(team.classement_j2),
                format_nombre(team.poids),
                team.ts_label(),
            ]
        )

    draw_table(
        page,
        content_rect(page.rect),
        headers=["Joueur 1", "Cl. J1", "Joueur 2", "Cl. J2", "Poids", "TS"],
        rows=rows,
        col_widths=[0.26, 0.1, 0.26, 0.1, 0.12, 0.08],
    )

    draw_footer_bar(
        page,
        tournoi.club,
        tournoi.type_tournoi,
    )

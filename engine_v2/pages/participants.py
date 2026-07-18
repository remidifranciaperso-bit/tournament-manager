"""Page participants Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.ppt_engine import format_nombre
from engine_v2.pages._layout import (
    content_area,
    draw_page_footer_logo,
    draw_page_header,
    participants_headers,
    participants_tagline,
    participants_title,
)
from engine_v2.pages._theme import draw_table


def render_participants_page(
    page: fitz.Page,
    tournoi,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    page.draw_rect(page.rect, color=None, fill=(1, 1, 1), overlay=False)

    tagline = participants_tagline(tournoi)
    draw_page_header(
        page,
        tournoi,
        participants_title(tournoi),
        base_dir=base_dir,
        tagline=tagline,
    )

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
        content_area(page.rect, tagline=True),
        headers=participants_headers(tournoi),
        rows=rows,
        col_widths=[0.24, 0.12, 0.24, 0.12, 0.14, 0.08],
        base_dir=base_dir,
    )

    draw_page_footer_logo(page, logo_bytes=logo_bytes, logo_wh=logo_wh)

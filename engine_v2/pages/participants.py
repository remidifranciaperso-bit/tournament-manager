"""Page participants Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.ppt_engine import format_nombre
from engine_v2.pages._engine_table import PARTICIPANTS_TABLE, draw_engine_table
from engine_v2.pages._layout import (
    draw_page_footer_logo,
    draw_page_header,
    participants_headers,
    participants_title,
    prepare_content_page,
)


def render_participants_page(
    page: fitz.Page,
    tournoi,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    prepare_content_page(page)
    draw_page_header(page, tournoi, participants_title(tournoi), base_dir=base_dir)

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

    draw_engine_table(
        page,
        PARTICIPANTS_TABLE,
        participants_headers(tournoi),
        rows,
        base_dir=base_dir,
    )

    draw_page_footer_logo(
        page,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
        club_name=tournoi.club,
        base_dir=base_dir,
        nb_equipes=tournoi.nb_equipes,
    )

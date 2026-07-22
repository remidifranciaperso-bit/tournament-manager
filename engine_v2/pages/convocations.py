"""Page convocations Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.ppt_engine import construire_convocations
from engine.live_export_render_support import FINAL_TABLE_BODY_PT
from engine_v2.pages._engine_table import CONVOCATIONS_TABLE, draw_engine_table
from engine_v2.pages._layout import (
    draw_page_footer_logo,
    draw_page_header,
    prepare_content_page,
)


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
    prepare_content_page(page)
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

    draw_engine_table(
        page,
        CONVOCATIONS_TABLE,
        ["ÉQUIPE", "HEURE"],
        rows,
        base_dir=base_dir,
        col_widths=[0.72, 0.28],
        narrow=True,
        nb_equipes=tournoi.nb_equipes,
        narrow_width_scale=0.7,
        body_col_pt=[None, FINAL_TABLE_BODY_PT],
    )

    draw_page_footer_logo(
        page,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
        club_name=tournoi.club,
        base_dir=base_dir,
        nb_equipes=tournoi.nb_equipes,
    )

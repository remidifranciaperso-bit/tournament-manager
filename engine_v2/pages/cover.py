"""Page de couverture Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.ppt_engine import construire_valeurs_globales
from engine_v2.pages._layout import (
    COVER_CREDIT_PT,
    COVER_DATE_HEURE_PT,
    COVER_NB_PT,
    COVER_TYPE_PT,
    draw_brush_line,
    draw_cover_background,
    draw_cover_logo,
)
from engine_v2.pages._theme import LIME, WHITE, YELLOW, font_paths


def render_cover_page(
    page: fitz.Page,
    tournoi,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    draw_cover_background(page, base_dir)
    draw_cover_logo(page, logo_bytes=logo_bytes, logo_wh=logo_wh)

    fonts = font_paths(base_dir)
    brush = fonts.get("brush")
    rect = page.rect
    globales = construire_valeurs_globales(tournoi)

    type_line = globales["{{TYPE}}"]
    y_type = rect.y0 + rect.height * 0.38
    draw_brush_line(
        page,
        type_line,
        y=y_type,
        fontsize=COVER_TYPE_PT,
        color=YELLOW,
        brush_font=brush,
    )

    meta_lines = [
        (globales["{{DATE}}"], COVER_DATE_HEURE_PT),
        (globales["{{HEURE}}"], COVER_DATE_HEURE_PT),
        (globales["{{NB_EQUIPES}}"], COVER_NB_PT),
        (globales["{{NB_TERRAINS}}"], COVER_NB_PT),
    ]
    y_meta = rect.y0 + rect.height * 0.52
    line_gap = 34.0
    for index, (line, size) in enumerate(meta_lines):
        draw_brush_line(
            page,
            line,
            y=y_meta + index * line_gap,
            fontsize=size,
            color=WHITE,
            brush_font=brush,
        )

    draw_brush_line(
        page,
        "Padel Tournament Engine",
        y=rect.y1 - 28,
        fontsize=COVER_CREDIT_PT,
        color=LIME,
        brush_font=brush,
    )

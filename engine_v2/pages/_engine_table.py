"""Tableaux participants / convocations — style capture Live (planning / classement final)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_export_render_support import (
    TABLE_BODY_PT,
    TABLE_HEAD_DISPLAY_PT,
    TABLE_SIDE_MARGIN_PT,
    narrow_table_width_pt,
    _draw_live_table_card,
    _fit_live_table_area,
)
from engine_v2.pages._layout import (
    ENGINE_FOOTER_RATIO,
    FOOTER_BOTTOM_MARGIN_PT,
    content_area,
)
from engine_v2.pages._theme import ARENA_800, TEMPLATE_BLUE

PARTICIPANTS_TABLE = {"left": 0.0178, "top": 0.121, "width": 0.9644}
CONVOCATIONS_TABLE = {"left": 0.1215, "top": 0.1306, "width": 0.7569}
# J1/J2 noms (égaux), clas J1/J2 (égaux), poids réduit, TS ×½ (somme = 1).
PARTICIPANTS_COL_WIDTHS = [0.226, 0.166, 0.226, 0.166, 0.133, 0.083]

# Hauteur ligne nominale (``_fit_live_table_area``) — réduction uniforme si dépassement.
_LIVE_TABLE_ROW_H_PT = 26.0


def _engine_table_fit_area(page: fitz.Page, *, nb_equipes: int | None) -> fitz.Rect:
    """Zone utile sous bandeau, au-dessus du pied Live (hors gabarit 32 équipes)."""
    area = content_area(page.rect)
    if nb_equipes == 32:
        return area
    page_rect = page.rect
    bottom_limit = page_rect.y1 - FOOTER_BOTTOM_MARGIN_PT
    footer_h = page_rect.height * ENGINE_FOOTER_RATIO
    safe_bottom = bottom_limit - footer_h
    if safe_bottom < area.y1 - 0.5:
        area = fitz.Rect(area.x0, area.y0, area.x1, safe_bottom)
    return area


def _engine_table_row_scale(area: fitz.Rect, body_row_count: int) -> float:
    nominal_h = _LIVE_TABLE_ROW_H_PT * max(body_row_count + 1, 2)
    if area.height <= 0 or nominal_h <= 0:
        return 1.0
    return min(1.0, area.height / nominal_h)


def draw_engine_table(
    page: fitz.Page,
    table_box: dict[str, float],
    headers: list[str],
    rows: list[list[str]],
    *,
    base_dir: Path,
    col_widths: list[float] | None = None,
    narrow: bool = False,
    nb_equipes: int | None = None,
) -> None:
    del table_box
    if not headers:
        return

    n_cols = len(headers)
    if col_widths is None:
        col_widths = (
            PARTICIPANTS_COL_WIDTHS if n_cols == len(PARTICIPANTS_COL_WIDTHS) else [1 / n_cols] * n_cols
        )

    area = _engine_table_fit_area(page, nb_equipes=nb_equipes)
    row_scale = _engine_table_row_scale(area, len(rows))
    font_kw: dict[str, float] = {}
    if row_scale < 1.0:
        font_kw["body_pt"] = TABLE_BODY_PT * row_scale
        font_kw["header_pt"] = TABLE_HEAD_DISPLAY_PT * row_scale

    if narrow:
        table_area = _fit_live_table_area(
            area,
            width_mode="narrow",
            row_count=len(rows),
            row_h_pt=_LIVE_TABLE_ROW_H_PT * row_scale,
        )
        ref_width_pt = narrow_table_width_pt(area.width)
    else:
        table_area = _fit_live_table_area(
            area,
            width_mode="full",
            row_count=len(rows),
            row_h_pt=_LIVE_TABLE_ROW_H_PT * row_scale,
        )
        ref_width_pt = max(table_area.width, area.width - 2 * TABLE_SIDE_MARGIN_PT)

    if n_cols == 2:
        body_colors: list[tuple[float, float, float]] = []
        for row in rows:
            body_colors.extend([ARENA_800, TEMPLATE_BLUE])
        _draw_live_table_card(
            page,
            table_area,
            headers,
            rows,
            col_widths=col_widths,
            base_dir=base_dir,
            alignments=[fitz.TEXT_ALIGN_LEFT, fitz.TEXT_ALIGN_LEFT],
            body_fonts=["noto", "tsl"],
            body_bold=[False, True],
            body_colors=body_colors,
            ref_width_pt=ref_width_pt,
            **font_kw,
        )
        return

    body_colors = []
    for row in rows:
        body_colors.extend(
            [
                ARENA_800,
                ARENA_800,
                ARENA_800,
                ARENA_800,
                ARENA_800,
                TEMPLATE_BLUE,
            ]
        )
    _draw_live_table_card(
        page,
        table_area,
        headers,
        rows,
        col_widths=col_widths,
        base_dir=base_dir,
        alignments=[fitz.TEXT_ALIGN_LEFT] * n_cols,
        body_fonts=["noto", "tsl", "noto", "tsl", "tsl", "tsl"],
        body_bold=[False, False, False, False, False, True],
        body_colors=body_colors,
        ref_width_pt=ref_width_pt,
        **font_kw,
    )

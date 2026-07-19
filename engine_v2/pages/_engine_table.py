"""Tableaux participants / convocations — style capture Live (planning / classement final)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_export_render_support import (
    FINAL_TABLE_WIDTH_PT,
    NARROW_TABLE_RATIO,
    TABLE_SIDE_MARGIN_PT,
    narrow_table_width_pt,
    _draw_live_table_card,
    _fit_live_table_area,
)
from engine_v2.pages._layout import content_area
from engine_v2.pages._theme import ARENA_800, TEMPLATE_BLUE

PARTICIPANTS_TABLE = {"left": 0.0178, "top": 0.121, "width": 0.9644}
CONVOCATIONS_TABLE = {"left": 0.1215, "top": 0.1306, "width": 0.7569}


def draw_engine_table(
    page: fitz.Page,
    table_box: dict[str, float],
    headers: list[str],
    rows: list[list[str]],
    *,
    base_dir: Path,
    col_widths: list[float] | None = None,
    narrow: bool = False,
) -> None:
    del table_box
    if not headers:
        return

    n_cols = len(headers)
    if col_widths is None:
        col_widths = [1 / n_cols] * n_cols

    area = content_area(page.rect)
    if narrow:
        table_area = _fit_live_table_area(
            area,
            width_mode="narrow",
            row_count=len(rows),
        )
        ref_width_pt = narrow_table_width_pt(area.width)
    else:
        table_area = _fit_live_table_area(
            area,
            width_mode="full",
            row_count=len(rows),
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
            body_bold=[False, False],
            body_colors=body_colors,
            ref_width_pt=ref_width_pt,
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
        body_bold=[False, False, False, False, False, False],
        body_colors=body_colors,
        ref_width_pt=ref_width_pt,
    )

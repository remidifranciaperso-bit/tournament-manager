"""Tableaux participants / convocations — style identique planning / classement final Live."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_export_render_support import (
    FINAL_BASE_PT,
    PLANNING_BASE_PT,
    TABLE_BODY_PT,
    TABLE_HEAD_PT,
    _fit_live_table_area,
)
from engine_v2.pages._layout import content_area, draw_font_text
from engine_v2.pages._theme import ARENA_800, TEMPLATE_BLUE, WHITE, font_paths

# Conservés pour compatibilité appelants (positionnement = zone contenu Live).
PARTICIPANTS_TABLE = {"left": 0.0178, "top": 0.121, "width": 0.9644}
CONVOCATIONS_TABLE = {"left": 0.1215, "top": 0.1306, "width": 0.7569}

CELL_PAD_PT = 6.0


def _resolve_font(fonts: dict[str, Path | None], key: str | None) -> Path | None:
    if not key:
        return None
    return fonts.get(key)


def _draw_live_table_card(
    page: fitz.Page,
    table_area: fitz.Rect,
    headers: list[str],
    body_rows: list[list[str]],
    *,
    base_dir: Path,
    col_widths: list[float],
    alignments: list[int] | None = None,
    body_fonts: list[str | None] | None = None,
    body_bold: list[bool] | None = None,
) -> None:
    """Calqué sur ``live_export_render_support._draw_live_table_card`` + TextWriter."""
    fonts = font_paths(base_dir)
    row_count = len(body_rows) + 1
    row_h = table_area.height / max(row_count, 2)

    page.draw_rect(
        table_area,
        color=TEMPLATE_BLUE,
        fill=WHITE,
        width=0.8,
        overlay=True,
    )

    aligns = alignments or [fitz.TEXT_ALIGN_LEFT] * len(headers)
    x = table_area.x0
    y = table_area.y0
    for index, header in enumerate(headers):
        width = table_area.width * col_widths[index]
        cell = fitz.Rect(x, y, x + width, y + row_h)
        page.draw_rect(cell, color=TEMPLATE_BLUE, fill=TEMPLATE_BLUE, width=0, overlay=True)
        draw_font_text(
            page,
            cell,
            header,
            fontsize=TABLE_HEAD_PT,
            color=WHITE,
            fontfile=fonts.get("tsl"),
            align=aligns[index],
            pad=CELL_PAD_PT,
        )
        x += width

    y += row_h
    font_keys = body_fonts or ["tsl"] * len(headers)
    for row_index, values in enumerate(body_rows):
        x = table_area.x0
        fill = WHITE if row_index % 2 == 0 else (0.97, 0.99, 1.0)
        for col_index, value in enumerate(values):
            width = table_area.width * col_widths[col_index]
            cell = fitz.Rect(x, y, x + width, y + row_h)
            page.draw_rect(cell, color=TEMPLATE_BLUE, fill=fill, width=0.35, overlay=True)
            key = font_keys[col_index] if col_index < len(font_keys) else "tsl"
            draw_font_text(
                page,
                cell,
                value or "—",
                fontsize=TABLE_BODY_PT,
                color=ARENA_800,
                fontfile=_resolve_font(fonts, key),
                align=aligns[col_index] if col_index < len(aligns) else fitz.TEXT_ALIGN_LEFT,
                pad=CELL_PAD_PT,
            )
            x += width
        y += row_h


def draw_engine_table(
    page: fitz.Page,
    table_box: dict[str, float],
    headers: list[str],
    rows: list[list[str]],
    *,
    base_dir: Path,
    col_widths: list[float] | None = None,
    body_tsl_all: bool = True,
) -> None:
    """Tableau carte Live (planning / classement final) dans la zone contenu."""
    del table_box, body_tsl_all  # position = content_area + fit live
    if not headers:
        return

    n_cols = len(headers)
    if col_widths is None:
        col_widths = [1 / n_cols] * n_cols

    area = content_area(page.rect)
    base_width = FINAL_BASE_PT if n_cols <= 2 else PLANNING_BASE_PT
    table_area = _fit_live_table_area(
        area,
        base_width_pt=base_width,
        row_count=len(rows),
    )

    if n_cols == 2:
        _draw_live_table_card(
            page,
            table_area,
            headers,
            rows,
            base_dir=base_dir,
            col_widths=col_widths,
            alignments=[fitz.TEXT_ALIGN_LEFT, fitz.TEXT_ALIGN_LEFT],
            body_fonts=["noto", "tsl"],
            body_bold=[False, False],
        )
        return

    _draw_live_table_card(
        page,
        table_area,
        headers,
        rows,
        base_dir=base_dir,
        col_widths=col_widths,
        alignments=[fitz.TEXT_ALIGN_LEFT] * n_cols,
        body_fonts=["noto", "tsl", "noto", "tsl", "tsl", "tsl"],
        body_bold=[False, False, False, False, False, True],
    )

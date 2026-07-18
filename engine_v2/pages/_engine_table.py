"""Tableaux participants / convocations — style capture Live (planning / classement final)."""

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

PARTICIPANTS_TABLE = {"left": 0.0178, "top": 0.121, "width": 0.9644}
CONVOCATIONS_TABLE = {"left": 0.1215, "top": 0.1306, "width": 0.7569}

CELL_PAD_PT = 6.0
ROW_LINE = (0.82, 0.92, 0.98)
ROW_ALT_FILL = (0.97, 0.99, 1.0)


def _resolve_font(fonts: dict[str, Path | None], key: str | None) -> Path | None:
    if key:
        path = fonts.get(key)
        if path and path.is_file():
            return path
    return fonts.get("tsl")


def _draw_row_cells(
    page: fitz.Page,
    row_rect: fitz.Rect,
    values: list[str],
    *,
    col_widths: list[float],
    table_x0: float,
    table_width: float,
    fonts: dict[str, Path | None],
    font_keys: list[str | None],
    aligns: list[int],
    fontsize: float,
    color: tuple[float, float, float],
) -> None:
    x = table_x0
    for col_index, value in enumerate(values):
        width = table_width * col_widths[col_index]
        cell = fitz.Rect(x, row_rect.y0, x + width, row_rect.y1)
        key = font_keys[col_index] if col_index < len(font_keys) else "tsl"
        draw_font_text(
            page,
            cell,
            value or "—",
            fontsize=fontsize,
            color=color,
            fontfile=_resolve_font(fonts, key),
            align=aligns[col_index] if col_index < len(aligns) else fitz.TEXT_ALIGN_LEFT,
            pad=CELL_PAD_PT,
        )
        x += width


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
) -> None:
    """Comme LivePlanningTab capture : carte, en-tête bleu, lignes horizontales seules."""
    fonts = font_paths(base_dir)
    row_count = len(body_rows) + 1
    row_h = table_area.height / max(row_count, 2)
    aligns = alignments or [fitz.TEXT_ALIGN_LEFT] * len(headers)
    font_keys = body_fonts or ["tsl"] * len(headers)

    page.draw_rect(
        table_area,
        color=TEMPLATE_BLUE,
        fill=WHITE,
        width=0.8,
        overlay=True,
    )

    header_bottom = table_area.y0 + row_h
    page.draw_rect(
        fitz.Rect(table_area.x0, table_area.y0, table_area.x1, header_bottom),
        color=TEMPLATE_BLUE,
        fill=TEMPLATE_BLUE,
        width=0,
        overlay=True,
    )
    _draw_row_cells(
        page,
        fitz.Rect(table_area.x0, table_area.y0, table_area.x1, header_bottom),
        headers,
        col_widths=col_widths,
        table_x0=table_area.x0,
        table_width=table_area.width,
        fonts=fonts,
        font_keys=["tsl"] * len(headers),
        aligns=aligns,
        fontsize=TABLE_HEAD_PT,
        color=WHITE,
    )

    for row_index, values in enumerate(body_rows):
        y0 = table_area.y0 + row_h * (row_index + 1)
        row_rect = fitz.Rect(table_area.x0, y0, table_area.x1, y0 + row_h)
        fill = WHITE if row_index % 2 == 0 else ROW_ALT_FILL
        page.draw_line(
            fitz.Point(table_area.x0, y0),
            fitz.Point(table_area.x1, y0),
            color=ROW_LINE,
            width=0.5,
            overlay=True,
        )
        page.draw_rect(row_rect, color=fill, fill=fill, width=0, overlay=True)
        _draw_row_cells(
            page,
            row_rect,
            values,
            col_widths=col_widths,
            table_x0=table_area.x0,
            table_width=table_area.width,
            fonts=fonts,
            font_keys=font_keys,
            aligns=aligns,
            fontsize=TABLE_BODY_PT,
            color=ARENA_800,
        )


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
    del table_box, body_tsl_all
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
    )

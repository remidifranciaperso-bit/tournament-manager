"""Tableaux participants / convocations — style capture Live (planning / classement final)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_export_render_support import (
    FINAL_TABLE_WIDTH_PT,
    PLANNING_BASE_PT,
    TABLE_BODY_PT,
    TABLE_HEAD_TSL_PT,
    _corner_radius_pt,
    _fill_header_rounded_top,
    _fit_live_table_area,
)
from engine_v2.pages._layout import content_area, draw_font_text
from engine_v2.pages._theme import ARENA_800, TEMPLATE_BLUE, WHITE, font_paths

PARTICIPANTS_TABLE = {"left": 0.0178, "top": 0.121, "width": 0.9644}
CONVOCATIONS_TABLE = {"left": 0.1215, "top": 0.1306, "width": 0.7569}

CELL_PAD_PT = 6.0
ROW_LINE = (0.82, 0.92, 0.98)
ROW_ALT_FILL = (0.97, 0.99, 1.0)
LIVE_CARD_RADIUS_PX = 12.0


def _card_radius_frac(table_area: fitz.Rect, ref_width_pt: float) -> float:
    radius_pt = LIVE_CARD_RADIUS_PX * (table_area.width / ref_width_pt)
    short = min(table_area.width, table_area.height)
    if short <= 0:
        return 0.05
    return min(0.5, max(0.01, radius_pt / short))


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
    colors: list[tuple[float, float, float]] | None = None,
    font_bolds: list[bool] | None = None,
) -> None:
    x = table_x0
    for col_index, value in enumerate(values):
        width = table_width * col_widths[col_index]
        cell = fitz.Rect(x, row_rect.y0, x + width, row_rect.y1)
        key = font_keys[col_index] if col_index < len(font_keys) else "tsl"
        bold = (font_bolds or [key == "tsl"] * len(values))[col_index]
        color = (colors or [ARENA_800] * len(values))[col_index]
        draw_font_text(
            page,
            cell,
            value or "—",
            fontsize=fontsize,
            color=color,
            fontfile=_resolve_font(fonts, key),
            align=aligns[col_index] if col_index < len(aligns) else fitz.TEXT_ALIGN_LEFT,
            pad=CELL_PAD_PT,
            bold=bold,
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
    ref_width_pt: float,
    alignments: list[int] | None = None,
    body_fonts: list[str | None] | None = None,
    body_colors: list[tuple[float, float, float]] | None = None,
    body_bolds: list[bool] | None = None,
) -> None:
    fonts = font_paths(base_dir)
    row_count = len(body_rows) + 1
    radius_pt = _corner_radius_pt(table_area, ref_width_pt)
    radius_frac = _card_radius_frac(table_area, ref_width_pt)
    aligns = alignments or [fitz.TEXT_ALIGN_LEFT] * len(headers)
    font_keys = body_fonts or ["tsl"] * len(headers)

    base_row_h = table_area.height / max(row_count, 2)
    header_bottom = table_area.y0 + base_row_h
    body_bottom = table_area.y1 - radius_pt
    body_row_h = (body_bottom - header_bottom) / max(len(body_rows), 1)

    page.draw_rect(
        table_area,
        color=TEMPLATE_BLUE,
        fill=WHITE,
        width=0.8,
        radius=radius_frac,
        stroke_opacity=0.35,
        overlay=True,
    )
    _fill_header_rounded_top(page, table_area, header_bottom, radius_pt)
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
        fontsize=TABLE_HEAD_TSL_PT,
        colors=[WHITE] * len(headers),
        font_bolds=[False] * len(headers),
    )

    color_list = body_colors or []
    color_index = 0
    for row_index, values in enumerate(body_rows):
        y0 = header_bottom + body_row_h * row_index
        row_rect = fitz.Rect(table_area.x0, y0, table_area.x1, y0 + body_row_h)
        fill = WHITE if row_index % 2 == 0 else ROW_ALT_FILL
        page.draw_line(
            fitz.Point(table_area.x0, y0),
            fitz.Point(table_area.x1, y0),
            color=ROW_LINE,
            width=0.5,
            overlay=True,
        )
        page.draw_rect(row_rect, color=fill, fill=fill, width=0, overlay=True)
        row_colors: list[tuple[float, float, float]] = []
        row_bolds: list[bool] = []
        for index in range(len(values)):
            if color_list and color_index < len(color_list):
                row_colors.append(color_list[color_index])
            else:
                row_colors.append(ARENA_800)
            color_index += 1
            key = font_keys[index] if index < len(font_keys) else "tsl"
            row_bolds.append(
                (body_bolds or [key == "tsl"] * len(values))[index]
            )
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
            colors=row_colors,
            font_bolds=row_bolds,
        )

    page.draw_rect(
        table_area,
        color=TEMPLATE_BLUE,
        fill=None,
        width=0.8,
        radius=radius_frac,
        stroke_opacity=0.35,
        overlay=True,
    )


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
            base_width_pt=FINAL_TABLE_WIDTH_PT,
            row_count=len(rows),
        )
        ref_width_pt = FINAL_TABLE_WIDTH_PT
    else:
        table_area = _fit_live_table_area(
            area,
            width_mode="full",
            row_count=len(rows),
        )
        ref_width_pt = PLANNING_BASE_PT

    if n_cols == 2:
        body_colors: list[tuple[float, float, float]] = []
        for row in rows:
            body_colors.extend([ARENA_800, TEMPLATE_BLUE])
        _draw_live_table_card(
            page,
            table_area,
            headers,
            rows,
            base_dir=base_dir,
            col_widths=col_widths,
            ref_width_pt=ref_width_pt,
            alignments=[fitz.TEXT_ALIGN_LEFT, fitz.TEXT_ALIGN_LEFT],
            body_fonts=["noto", "tsl"],
            body_colors=body_colors,
            body_bolds=[False, True],
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
        base_dir=base_dir,
        col_widths=col_widths,
        ref_width_pt=ref_width_pt,
        alignments=[fitz.TEXT_ALIGN_LEFT] * n_cols,
        body_fonts=["noto", "tsl", "noto", "tsl", "tsl", "tsl"],
        body_colors=body_colors,
        body_bolds=[False, True, False, True, True, True],
    )

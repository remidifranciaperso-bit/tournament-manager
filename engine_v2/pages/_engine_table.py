"""Tableaux participants / convocations — style capture Live (planning / classement final)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_export_render_support import (
    PLANNING_BASE_PT,
    TABLE_BODY_PT,
    _fit_live_table_area,
)
from engine_v2.pages._layout import content_area, draw_font_text
from engine_v2.pages._theme import ARENA_800, TEMPLATE_BLUE, WHITE, font_paths

PARTICIPANTS_TABLE = {"left": 0.0178, "top": 0.121, "width": 0.9644}
CONVOCATIONS_TABLE = {"left": 0.1215, "top": 0.1306, "width": 0.7569}

CELL_PAD_PT = 6.0
ROW_LINE = (0.82, 0.92, 0.98)
ROW_ALT_FILL = (0.97, 0.99, 1.0)
LIVE_CARD_RADIUS_PX = 12.0  # Tailwind rounded-xl
TABLE_HEAD_TSL_PT = 11.0  # légèrement plus grand que le corps (10 pt)
_BEZIER_K = 0.5522847498


def _resolve_font(fonts: dict[str, Path | None], key: str | None) -> Path | None:
    if key:
        path = fonts.get(key)
        if path and path.is_file():
            return path
    return fonts.get("tsl")


def _card_radius_frac(table_area: fitz.Rect) -> float:
    """Rayon rounded-xl Live, proportion PyMuPDF (fraction du côté court)."""
    radius_pt = LIVE_CARD_RADIUS_PX * (table_area.width / PLANNING_BASE_PT)
    short = min(table_area.width, table_area.height)
    if short <= 0:
        return 0.05
    return min(0.5, max(0.01, radius_pt / short))


def _corner_radius_pt(table_area: fitz.Rect) -> float:
    return min(table_area.width, table_area.height) * _card_radius_frac(table_area)


def _fill_header_rounded_top(
    page: fitz.Page,
    table_area: fitz.Rect,
    header_bottom: float,
    radius_pt: float,
) -> None:
    x0 = table_area.x0
    y0 = table_area.y0
    x1 = table_area.x1
    r = min(radius_pt, table_area.width / 2, header_bottom - y0)
    if r <= 0.5:
        page.draw_rect(
            fitz.Rect(x0, y0, x1, header_bottom),
            color=TEMPLATE_BLUE,
            fill=TEMPLATE_BLUE,
            width=0,
            overlay=True,
        )
        return

    shape = page.new_shape()
    shape.draw_line(fitz.Point(x0 + r, y0), fitz.Point(x1 - r, y0))
    shape.draw_curve(
        fitz.Point(x1 - r + r * _BEZIER_K, y0),
        fitz.Point(x1, y0 + r - r * _BEZIER_K),
        fitz.Point(x1, y0 + r),
    )
    shape.draw_line(fitz.Point(x1, header_bottom), fitz.Point(x0, header_bottom))
    shape.draw_line(fitz.Point(x0, header_bottom), fitz.Point(x0, y0 + r))
    shape.draw_curve(
        fitz.Point(x0, y0 + r - r * _BEZIER_K),
        fitz.Point(x0 + r - r * _BEZIER_K, y0),
        fitz.Point(x0 + r, y0),
    )
    shape.finish(fill=TEMPLATE_BLUE, color=TEMPLATE_BLUE, width=0, closePath=True)
    shape.commit(overlay=True)


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
    font_bolds: list[bool] | None = None,
) -> None:
    x = table_x0
    for col_index, value in enumerate(values):
        width = table_width * col_widths[col_index]
        cell = fitz.Rect(x, row_rect.y0, x + width, row_rect.y1)
        key = font_keys[col_index] if col_index < len(font_keys) else "tsl"
        bold = (font_bolds or [key == "tsl"] * len(values))[col_index]
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
    alignments: list[int] | None = None,
    body_fonts: list[str | None] | None = None,
) -> None:
    """Comme LivePlanningTab capture : carte arrondie, en-tête bleu, lignes horizontales seules."""
    fonts = font_paths(base_dir)
    row_count = len(body_rows) + 1
    radius_pt = _corner_radius_pt(table_area)
    radius_frac = _card_radius_frac(table_area)
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
        color=WHITE,
        font_bolds=[True] * len(headers),
    )

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
            font_bolds=[key == "tsl" for key in font_keys],
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
    body_tsl_all: bool = True,
) -> None:
    del table_box, body_tsl_all
    if not headers:
        return

    n_cols = len(headers)
    if col_widths is None:
        col_widths = [1 / n_cols] * n_cols

    area = content_area(page.rect)
    table_area = _fit_live_table_area(
        area,
        base_width_pt=PLANNING_BASE_PT,
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

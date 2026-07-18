"""Tableaux participants / convocations — calqués sur le template Engine (export Live)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine_v2.pages._layout import draw_font_text
from engine_v2.pages._theme import ARENA_800, TEMPLATE_BLUE, WHITE, font_paths

# Géométrie relevée sur ``templates bleus/Template_24_1J.pptx``.
PARTICIPANTS_TABLE = {"left": 0.0178, "top": 0.121, "width": 0.9644}
CONVOCATIONS_TABLE = {"left": 0.1215, "top": 0.1306, "width": 0.7569}
TABLE_BOTTOM_FRAC = 0.946

HEAD_PT = 10.0
BODY_PT = 8.0


def _pct_rect(page_rect: fitz.Rect, box: dict[str, float]) -> fitz.Rect:
    return fitz.Rect(
        page_rect.x0 + page_rect.width * box["left"],
        page_rect.y0 + page_rect.height * box["top"],
        page_rect.x0 + page_rect.width * (box["left"] + box["width"]),
        page_rect.y0 + page_rect.height * TABLE_BOTTOM_FRAC,
    )


def _insert_cell_text(
    page: fitz.Page,
    cell: fitz.Rect,
    text: str,
    *,
    fontsize: float,
    color: tuple[float, float, float],
    fontfile: Path | None,
    bold: bool = False,
) -> None:
    draw_font_text(
        page,
        cell,
        text or "—",
        fontsize=fontsize,
        color=color,
        fontfile=fontfile,
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
    """Tableau Engine : en-tête Noto 10 pt bleu, corps TSL 8 pt centré."""
    if not headers:
        return

    fonts = font_paths(base_dir)
    noto = fonts.get("noto")
    tsl = fonts.get("tsl")
    head_font = noto or tsl
    area = _pct_rect(page.rect, table_box)
    n_cols = len(headers)
    if col_widths is None:
        col_widths = [1 / n_cols] * n_cols

    row_count = len(rows) + 1
    row_h = max(14.0, area.height / max(row_count, 2))
    y = area.y0

    x0 = area.x0
    for index, header in enumerate(headers):
        width = area.width * col_widths[index]
        cell = fitz.Rect(x0, y, x0 + width, y + row_h)
        page.draw_rect(cell, color=TEMPLATE_BLUE, fill=TEMPLATE_BLUE, width=0, overlay=True)
        _insert_cell_text(
            page,
            cell,
            header,
            fontsize=HEAD_PT,
            color=WHITE,
            fontfile=head_font,
            bold=True,
        )
        x0 += width
    y += row_h

    for row_index, row in enumerate(rows):
        x0 = area.x0
        fill = WHITE if row_index % 2 == 0 else (0.97, 0.99, 1.0)
        for col_index, value in enumerate(row):
            width = area.width * col_widths[col_index]
            cell = fitz.Rect(x0, y, x0 + width, y + row_h)
            page.draw_rect(cell, color=TEMPLATE_BLUE, fill=fill, width=0.4, overlay=True)
            use_tsl = body_tsl_all or col_index in (1, 3, 4, 5)
            body_font = tsl if use_tsl else (noto or tsl)
            _insert_cell_text(
                page,
                cell,
                value,
                fontsize=BODY_PT,
                color=ARENA_800,
                fontfile=body_font,
            )
            x0 += width
        y += row_h

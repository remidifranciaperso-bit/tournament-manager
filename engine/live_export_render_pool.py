"""Rendu PDF natif des pages poules (composition + Poule A…)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_export_render_support import (
    ARENA_800,
    FINAL_TABLE_VERTICAL_MARGIN_PT,
    TABLE_HEAD_DISPLAY_PT,
    TEMPLATE_BLUE,
    _draw_live_table_card,
    _draw_match_box,
    _fit_live_table_area,
    _font_paths,
    narrow_table_width_pt,
)
from engine.live_pool_layout import (
    exempt_teams,
    pool_letters,
    pool_matches,
    pool_roster,
)
from engine.live_team_resolve import format_team_with_initials

POOL_REF_WIDTH_PT = 920.0
_SLIDE_ASPECT = 9906000 / 6858000
_MATCH_W_FRAC = 0.2762
_MATCH_H_FRAC = 0.215
_GRID_COLS = 3
_GRID_GAP_X_PT = 18.0
_GRID_GAP_Y_PT = 22.0
# Composition — cartes plus étroites (−30 % vs grille Live), ref. bordures comme planning.
_COMPOSITION_CARD_WIDTH_SCALE = 0.70
_COMPOSITION_BLOCK_WIDTH_SCALE = 0.72
_COMPOSITION_NOMINAL_ROW_H_PT = 26.0
_COMPOSITION_REF_WIDTH_PT = narrow_table_width_pt(POOL_REF_WIDTH_PT)


def _composition_card_height(team_count: int, row_h: float) -> float:
    rows = max(team_count, 1)
    return row_h * (rows + 1)


def _composition_vertical_scale(
    fit: fitz.Rect,
    *,
    exempt_count: int,
    pool_letters: list[str],
    matches: list[dict],
    gap_y: float,
) -> float:
    """Réduit légèrement la hauteur de ligne pour tenir dans les marges haut/bas."""
    grid_rows = (len(pool_letters) + 1) // 2
    scale = 1.0
    for _ in range(24):
        row_h = _COMPOSITION_NOMINAL_ROW_H_PT * scale
        total = 0.0
        if exempt_count > 0:
            total += _composition_card_height(exempt_count, row_h) + gap_y
        for grid_row in range(grid_rows):
            row_max = 0.0
            for col in range(2):
                index = grid_row * 2 + col
                if index >= len(pool_letters):
                    continue
                letter = pool_letters[index]
                n = len(pool_roster(matches, letter))
                row_max = max(row_max, _composition_card_height(n, row_h))
            if row_max <= 0:
                continue
            total += row_max + gap_y
        if grid_rows:
            total -= gap_y
        if total <= fit.height or scale <= 0.78:
            return scale
        scale -= 0.025
    return scale


def _draw_roster_card(
    page: fitz.Page,
    rect: fitz.Rect,
    title: str,
    teams: list[str],
    *,
    base_dir: Path | None,
    ref_width_pt: float,
) -> None:
    rows = [[format_team_with_initials(team)] for team in teams] or [["—"]]
    _draw_live_table_card(
        page,
        rect,
        [title],
        rows,
        col_widths=[1.0],
        base_dir=base_dir,
        alignments=[fitz.TEXT_ALIGN_CENTER],
        body_fonts=["noto"],
        body_bold=[False],
        header_bold=[False],
        header_pt=TABLE_HEAD_DISPLAY_PT,
        body_colors=[ARENA_800] * len(rows),
        ref_width_pt=ref_width_pt,
    )


def draw_pool_composition(
    page: fitz.Page,
    area: fitz.Rect,
    matches: list[dict],
    fields: dict[str, str],
    *,
    base_dir: Path | None,
) -> None:
    letters = pool_letters(matches)
    exempts = exempt_teams(fields)
    fit = fitz.Rect(
        area.x0,
        area.y0 + FINAL_TABLE_VERTICAL_MARGIN_PT,
        area.x1,
        area.y1 - FINAL_TABLE_VERTICAL_MARGIN_PT,
    )
    block_w = min(fit.width, POOL_REF_WIDTH_PT * _COMPOSITION_BLOCK_WIDTH_SCALE)
    block = fitz.Rect(
        fit.x0 + (fit.width - block_w) / 2,
        fit.y0,
        fit.x0 + (fit.width + block_w) / 2,
        fit.y1,
    )
    gap_y = _GRID_GAP_Y_PT
    vscale = _composition_vertical_scale(
        block,
        exempt_count=len(exempts),
        pool_letters=letters,
        matches=matches,
        gap_y=gap_y,
    )
    row_h = _COMPOSITION_NOMINAL_ROW_H_PT * vscale
    col_w = (block.width - _GRID_GAP_X_PT) / 2
    card_w = col_w * _COMPOSITION_CARD_WIDTH_SCALE
    y = block.y0

    if exempts:
        card_h = _composition_card_height(len(exempts), row_h)
        x0 = block.x0 + (block.width - card_w) / 2
        exempt_rect = fitz.Rect(x0, y, x0 + card_w, y + card_h)
        _draw_roster_card(
            page,
            exempt_rect,
            "Têtes de série (exemptées)",
            exempts,
            base_dir=base_dir,
            ref_width_pt=_COMPOSITION_REF_WIDTH_PT,
        )
        y = exempt_rect.y1 + gap_y

    grid_rows = (len(letters) + 1) // 2
    for grid_row in range(grid_rows):
        row_bottom = y
        for col in range(2):
            index = grid_row * 2 + col
            if index >= len(letters):
                continue
            letter = letters[index]
            teams = pool_roster(matches, letter)
            card_h = _composition_card_height(len(teams), row_h)
            col_x0 = block.x0 + col * (col_w + _GRID_GAP_X_PT)
            x0 = col_x0 + (col_w - card_w) / 2
            roster_rect = fitz.Rect(x0, y, x0 + card_w, y + card_h)
            _draw_roster_card(
                page,
                roster_rect,
                f"Poule {letter}",
                teams,
                base_dir=base_dir,
                ref_width_pt=_COMPOSITION_REF_WIDTH_PT,
            )
            row_bottom = max(row_bottom, roster_rect.y1)
        y = row_bottom + gap_y


def _scaled_pool_block(content: fitz.Rect) -> tuple[fitz.Rect, float]:
    """Bloc centré, largeur max POOL_REF_WIDTH_PT."""
    width = min(content.width, POOL_REF_WIDTH_PT)
    scale = width / POOL_REF_WIDTH_PT
    height = width / _SLIDE_ASPECT
    x0 = content.x0 + (content.width - width) / 2
    y0 = content.y0
    return fitz.Rect(x0, y0, x0 + width, y0 + height), scale


def draw_pool_standings_table(
    page: fitz.Page,
    area: fitz.Rect,
    teams: list[str],
    *,
    base_dir: Path | None,
) -> None:
    """Tableau feuille poule : équipes (TS croissant), colonnes stats vides pour saisie."""
    headers = ["Équipe", "Victoires", "Défaites", "Jeux", "Classement"]
    col_widths = [0.38, 0.14, 0.14, 0.14, 0.20]
    rows: list[list[str]] = []
    body_colors: list[tuple[float, float, float]] = []
    for team in teams:
        label = format_team_with_initials(team)
        rows.append([label, "", "", "", ""])
        body_colors.extend([ARENA_800, TEMPLATE_BLUE, TEMPLATE_BLUE, TEMPLATE_BLUE, TEMPLATE_BLUE])

    table_area = _fit_live_table_area(
        area,
        width_mode="full",
        row_count=len(rows),
        vertical_inset_pt=0.0,
    )
    _draw_live_table_card(
        page,
        table_area,
        headers,
        rows,
        col_widths=col_widths,
        base_dir=base_dir,
        alignments=[
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_CENTER,
            fitz.TEXT_ALIGN_CENTER,
            fitz.TEXT_ALIGN_CENTER,
            fitz.TEXT_ALIGN_CENTER,
        ],
        body_fonts=["noto", "tsl", "tsl", "tsl", "tsl"],
        body_bold=[False, True, True, True, True],
        body_colors=body_colors,
        ref_width_pt=table_area.width,
    )


def draw_pool_page(
    page: fitz.Page,
    area: fitz.Rect,
    letter: str,
    matches: list[dict],
    match_results: dict[str, dict],
    *,
    base_dir: Path | None,
    export_mode: bool = True,
) -> None:
    pool = pool_matches(matches, letter)
    teams = pool_roster(matches, letter)
    fit = fitz.Rect(
        area.x0,
        area.y0 + FINAL_TABLE_VERTICAL_MARGIN_PT,
        area.x1,
        area.y1 - FINAL_TABLE_VERTICAL_MARGIN_PT,
    )

    block, scale = _scaled_pool_block(fit)
    ref_h = block.width / _SLIDE_ASPECT
    box_w = block.width * _MATCH_W_FRAC
    box_h = ref_h * _MATCH_H_FRAC
    fonts = _font_paths(base_dir)
    matches_by_code = {m["code"]: m for m in matches}

    grid_w = _GRID_COLS * box_w + (_GRID_COLS - 1) * _GRID_GAP_X_PT * scale
    start_x = block.x0 + (block.width - grid_w) / 2
    y = block.y0

    # Référence typo identique aux slides bracket (``area.height`` ≈ slide template).
    font_area = block
    for index, match in enumerate(pool):
        col = index % _GRID_COLS
        row = index // _GRID_COLS
        x0 = start_x + col * (box_w + _GRID_GAP_X_PT * scale)
        y0 = y + row * (box_h + _GRID_GAP_Y_PT * scale)
        rect = fitz.Rect(x0, y0, x0 + box_w, y0 + box_h)
        _draw_match_box(
            page,
            rect,
            match,
            match_results.get(match["code"]),
            None,
            matches_by_code,
            match_results,
            area=font_area,
            fonts=fonts,
            split_main_bracket=False,
            base_dir=base_dir,
            export_mode=export_mode,
        )

    rows_count = max(1, (len(pool) + _GRID_COLS - 1) // _GRID_COLS)
    grid_bottom = y + rows_count * box_h + max(0, rows_count - 1) * _GRID_GAP_Y_PT * scale
    standings_area = fitz.Rect(
        fit.x0,
        grid_bottom + _GRID_GAP_Y_PT * 2,
        fit.x1,
        fit.y1,
    )
    draw_pool_standings_table(
        page,
        standings_area,
        teams,
        base_dir=base_dir,
    )

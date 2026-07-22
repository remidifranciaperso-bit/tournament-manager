"""Rendu PDF natif des pages poules (composition + Poule A…)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_export_render_support import (
    ARENA_800,
    FINAL_TABLE_VERTICAL_MARGIN_PT,
    TEMPLATE_BLUE,
    _draw_live_table_card,
    _draw_match_box,
    _fit_live_table_area,
    _font_paths,
)
from engine.live_pool_layout import (
    exempt_teams,
    pool_letters,
    pool_matches,
    pool_roster,
)
from engine.live_pool_standings import PoolStandingRow, build_pool_standings
from engine.live_team_resolve import format_team_with_initials

POOL_REF_WIDTH_PT = 920.0
_SLIDE_ASPECT = 9906000 / 6858000
_MATCH_W_FRAC = 0.2762
_MATCH_H_FRAC = 0.215
_GRID_COLS = 3
_GRID_GAP_X_PT = 18.0
_GRID_GAP_Y_PT = 22.0


def _scaled_pool_block(content: fitz.Rect) -> tuple[fitz.Rect, float]:
    """Bloc centré, largeur max POOL_REF_WIDTH_PT."""
    width = min(content.width, POOL_REF_WIDTH_PT)
    scale = width / POOL_REF_WIDTH_PT
    height = width / _SLIDE_ASPECT
    x0 = content.x0 + (content.width - width) / 2
    y0 = content.y0
    return fitz.Rect(x0, y0, x0 + width, y0 + height), scale


def _draw_roster_card(
    page: fitz.Page,
    rect: fitz.Rect,
    title: str,
    teams: list[str],
    *,
    base_dir: Path | None,
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
        body_colors=[ARENA_800] * len(rows),
        ref_width_pt=rect.width,
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
    block, scale = _scaled_pool_block(fit)
    card_w = (block.width - _GRID_GAP_X_PT) / 2
    card_h = max(60.0, 28.0 * max(len(exempts), 3) + 36.0)
    y = block.y0

    if exempts:
        exempt_rect = fitz.Rect(
            block.x0 + (block.width - card_w) / 2,
            y,
            block.x0 + (block.width + card_w) / 2,
            y + card_h,
        )
        _draw_roster_card(
            page,
            exempt_rect,
            "Têtes de série (exemptées)",
            exempts,
            base_dir=base_dir,
        )
        y = exempt_rect.y1 + _GRID_GAP_Y_PT * scale

    row_h = max(52.0, 24.0 * 5 + 32.0)
    for index, letter in enumerate(letters):
        col = index % 2
        row = index // 2
        x0 = block.x0 + col * (card_w + _GRID_GAP_X_PT)
        y0 = y + row * (row_h + _GRID_GAP_Y_PT * scale)
        roster_rect = fitz.Rect(x0, y0, x0 + card_w, y0 + row_h)
        _draw_roster_card(
            page,
            roster_rect,
            f"Poule {letter}",
            pool_roster(matches, letter),
            base_dir=base_dir,
        )


def draw_pool_standings_table(
    page: fitz.Page,
    area: fitz.Rect,
    standings: list[PoolStandingRow],
    *,
    base_dir: Path | None,
) -> None:
    headers = ["Équipe", "Victoires", "Défaites", "Jeux", "Classement"]
    col_widths = [0.38, 0.14, 0.14, 0.14, 0.20]
    rows: list[list[str]] = []
    body_colors: list[tuple[float, float, float]] = []
    for row in standings:
        label = format_team_with_initials(row.team)
        diff = f"+{row.game_diff}" if row.game_diff > 0 else str(row.game_diff)
        jeux = diff if row.played > 0 else "—"
        rows.append([label, str(row.wins), str(row.losses), jeux, str(row.rank)])
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
    standings = build_pool_standings(matches, match_results, letter=letter)
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

    match_area = fitz.Rect(start_x, y, start_x + grid_w, y + 1000)
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
            area=match_area,
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
        standings,
        base_dir=base_dir,
    )

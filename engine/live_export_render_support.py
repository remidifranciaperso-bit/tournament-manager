"""Dessin des encarts Manager pour l'export PDF."""

from __future__ import annotations

import fitz

from engine.live_ranking import build_final_ranking, format_place_label
from engine.live_team_resolve import (
    format_feed_key,
    format_team_display,
    is_placeholder,
    resolve_team_label_deep,
)
from engine.match_placement_label import match_placement_label

BRUSH_BLUE = (0, 176 / 255, 240 / 255)
TEMPLATE_BLUE = (0, 176 / 255, 240 / 255)
WHITE = (1, 1, 1)
ARENA_800 = (0.12, 0.16, 0.25)

MATCH_CODE_PT = 9
TEAM_PT = 10
TEAM_PLACEHOLDER_PT = 7.5
SCORE_PT = 9
FEED_PT = 8
TABLE_HEAD_PT = 9
TABLE_BODY_PT = 10


def _pct_rect(box: dict, area: fitz.Rect) -> fitz.Rect:
    return fitz.Rect(
        area.x0 + area.width * box["left"] / 100,
        area.y0 + area.height * box["top"] / 100,
        area.x0 + area.width * (box["left"] + box["width"]) / 100,
        area.y0 + area.height * (box["top"] + box["height"]) / 100,
    )


def _insert_centered_text(
    page: fitz.Page,
    rect: fitz.Rect,
    text: str,
    fontsize: float,
    color: tuple[float, float, float],
    bold: bool = False,
) -> None:
    page.insert_textbox(
        rect,
        text,
        fontsize=fontsize,
        color=color,
        align=fitz.TEXT_ALIGN_CENTER,
        fontname="hebo" if bold else "helv",
    )


def _draw_match_box(
    page: fitz.Page,
    rect: fitz.Rect,
    match: dict,
    result: dict | None,
    placement_label: str | None,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
) -> None:
    page.draw_rect(rect, color=TEMPLATE_BLUE, width=0.8)
    header_h = rect.height * 0.2
    header = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + header_h)
    page.draw_rect(header, color=TEMPLATE_BLUE, fill=TEMPLATE_BLUE, width=0)

    code = match.get("code", "")
    terrain = match.get("terrain") or ""
    heure = match.get("heure") or ""
    header_text = f"{code}    {terrain}    {heure}".strip()
    _insert_centered_text(page, header, header_text, MATCH_CODE_PT, WHITE, bold=True)

    if placement_label:
        label_rect = fitz.Rect(rect.x0, rect.y0 - 14, rect.x1, rect.y0)
        _insert_centered_text(page, label_rect, placement_label, 11, BRUSH_BLUE, bold=True)

    body_top = header.y1
    score_h = rect.height * 0.16 if result and result.get("display") else rect.height * 0.1
    body = fitz.Rect(rect.x0, body_top, rect.x1, rect.y1 - score_h)
    mid_y = body.y0 + body.height / 2
    page.draw_line(
        fitz.Point(body.x0, mid_y),
        fitz.Point(body.x1, mid_y),
        color=TEMPLATE_BLUE,
        width=0.5,
    )

    equipe1 = format_team_display(
        match.get("equipe1", ""),
        matches_by_code,
        match_results,
    )
    equipe2 = format_team_display(
        match.get("equipe2", ""),
        matches_by_code,
        match_results,
    )

    winner = result.get("winner") if result else None
    team1_rect = fitz.Rect(body.x0 + 2, body.y0 + 2, body.x1 - 2, mid_y - 2)
    team2_rect = fitz.Rect(body.x0 + 2, mid_y + 2, body.x1 - 2, body.y1 - 2)

    _insert_centered_text(
        page,
        team1_rect,
        equipe1,
        TEAM_PLACEHOLDER_PT if is_placeholder(equipe1) else TEAM_PT,
        ARENA_800,
        bold=winner in (None, 1),
    )
    _insert_centered_text(
        page,
        team2_rect,
        equipe2,
        TEAM_PLACEHOLDER_PT if is_placeholder(equipe2) else TEAM_PT,
        ARENA_800,
        bold=winner in (None, 2),
    )

    vs_rect = fitz.Rect(body.x0, mid_y - 8, body.x1, mid_y + 8)
    _insert_centered_text(page, vs_rect, "vs", 8, TEMPLATE_BLUE, bold=True)

    if result and result.get("display"):
        score_rect = fitz.Rect(rect.x0, rect.y1 - score_h, rect.x1, rect.y1)
        page.draw_rect(
            score_rect,
            color=TEMPLATE_BLUE,
            fill=(0.97, 0.99, 1.0),
            width=0,
        )
        _insert_centered_text(
            page,
            score_rect,
            str(result["display"]),
            SCORE_PT,
            TEMPLATE_BLUE,
            bold=True,
        )


def _resolve_feed_text(
    key: str,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
) -> str:
    import re

    win = re.match(r"^WIN_(.+)$", key)
    lose = re.match(r"^LOSE_(.+)$", key)
    parent_code = (win or lose).group(1) if (win or lose) else None
    if not parent_code:
        return format_feed_key(key)

    parent = matches_by_code.get(parent_code)
    result = match_results.get(parent_code)
    if not parent or not result:
        return format_feed_key(key)

    side = result.get("winner") if win else result.get("loser")
    raw = parent.get("equipe1") if side == 1 else parent.get("equipe2")
    resolved = resolve_team_label_deep(raw or "", matches_by_code, match_results)
    return resolved if resolved != (raw or "").strip() else format_feed_key(key)


def draw_bracket_slide(
    page: fitz.Page,
    area: fitz.Rect,
    slots: list[dict],
    feeds: list[dict],
    box_layouts: dict[str, dict],
    matches: list[dict],
    match_results: dict[str, dict],
    *,
    show_placement_labels: bool,
) -> None:
    from engine.live_team_resolve import feed_key_from_team_label

    matches_by_code = {match["code"]: match for match in matches}
    consumed_feeds: set[str] = set()

    for slot in slots:
        match = matches_by_code.get(slot["code"])
        if not match:
            continue
        for label in (match.get("equipe1", ""), match.get("equipe2", "")):
            feed = feed_key_from_team_label(label)
            if feed:
                consumed_feeds.add(feed)

    for slot in slots:
        match = matches_by_code.get(slot["code"])
        box = box_layouts.get(slot["code"])
        if not match or not box:
            continue
        placement = (
            match_placement_label(match.get("tour", ""))
            if show_placement_labels
            else None
        )
        _draw_match_box(
            page,
            _pct_rect(box, area),
            match,
            match_results.get(slot["code"]),
            placement,
            matches_by_code,
            match_results,
        )

    for feed in feeds:
        if feed["key"] in consumed_feeds:
            continue
        text = _resolve_feed_text(feed["key"], matches_by_code, match_results)
        rect = _pct_rect(feed, area)
        page.draw_rect(
            rect,
            color=TEMPLATE_BLUE,
            fill=(0.94, 0.98, 1.0),
            width=0.5,
        )
        _insert_centered_text(page, rect, text, FEED_PT, ARENA_800)


def draw_final_ranking(
    page: fitz.Page,
    area: fitz.Rect,
    matches: list[dict],
    match_results: dict[str, dict],
    fields: dict[str, str],
    nb_equipes: int,
) -> None:
    rows = build_final_ranking(matches, match_results, fields, nb_equipes)
    headers = ["Place", "Équipe", "Points"]
    col_widths = [0.18, 0.58, 0.24]
    row_h = max(20.0, min(28.0, area.height / max(len(rows) + 2, 10)))

    x = area.x0
    y = area.y0 + 8
    for index, header in enumerate(headers):
        width = area.width * col_widths[index]
        cell = fitz.Rect(x, y, x + width, y + row_h)
        page.draw_rect(cell, color=TEMPLATE_BLUE, fill=TEMPLATE_BLUE, width=0)
        _insert_centered_text(page, cell, header, TABLE_HEAD_PT, WHITE, bold=True)
        x += width

    y += row_h
    for row_index, row in enumerate(rows):
        x = area.x0
        values = [
            format_place_label(row["place"]),
            row["team"] or "—",
            row["points"] or "—",
        ]
        fill = WHITE if row_index % 2 == 0 else (0.97, 0.99, 1.0)
        for index, value in enumerate(values):
            width = area.width * col_widths[index]
            cell = fitz.Rect(x, y, x + width, y + row_h)
            page.draw_rect(cell, color=TEMPLATE_BLUE, fill=fill, width=0.4)
            color = BRUSH_BLUE if index == 2 and value != "—" else ARENA_800
            _insert_centered_text(
                page,
                cell,
                value,
                TABLE_BODY_PT,
                color,
                bold=index in (0, 2),
            )
            x += width
        y += row_h

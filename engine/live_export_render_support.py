"""Dessin des encarts Manager pour l'export PDF (aligné sur LiveBracketSlide)."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_ranking import build_final_ranking, format_place_label
from engine.live_team_resolve import (
    format_feed_key,
    format_team_display,
    format_team_with_initials,
    is_placeholder,
    resolve_team_label_deep,
)
from engine.match_placement_label import match_placement_label

BRUSH_BLUE = (0, 176 / 255, 240 / 255)
TEMPLATE_BLUE = (0, 176 / 255, 240 / 255)
WHITE = (1, 1, 1)
ARENA_800 = (0.12, 0.16, 0.25)
ARENA_600 = (0.35, 0.4, 0.48)

SLIDE_H_PT = 540.0
MATCH_CODE_PT = 11.0
TEAM_PT = 12.0
TEAM_PLACEHOLDER_PT = 8.5
VS_PT = 9.0
SCORE_PT = 9.0
FEED_PT = 8.0
PLACEMENT_PT = 11.0
TABLE_HEAD_PT = 9.0
TABLE_BODY_PT = 10.0


def _font_paths(base_dir: Path | None) -> dict[str, Path | None]:
    if base_dir is None:
        return {"brush": None, "tsl": None, "noto": None}
    candidates = {
        "brush": [
            base_dir / "fonts" / "Grindy Brush.otf",
            base_dir / "fonts" / "GrindyBrush.otf",
            base_dir / "frontend" / "public" / "fonts" / "GrindyBrush.otf",
            base_dir / "frontend" / "dist" / "fonts" / "GrindyBrush.otf",
        ],
        "tsl": [
            base_dir / "fonts" / "TSLSans.ttf",
            base_dir / "frontend" / "public" / "fonts" / "TSLSans.ttf",
            base_dir / "frontend" / "dist" / "fonts" / "TSLSans.ttf",
        ],
        "noto": [
            base_dir / "fonts" / "NotoSans-Regular.ttf",
            base_dir / "frontend" / "public" / "fonts" / "NotoSans-Regular.ttf",
            base_dir / "frontend" / "dist" / "fonts" / "NotoSans-Regular.ttf",
        ],
    }
    return {
        key: next((path for path in paths if path.is_file()), None)
        for key, paths in candidates.items()
    }


def _pt_on_area(pt: float, area: fitz.Rect) -> float:
    return max(6.0, pt * (area.height / SLIDE_H_PT))


def _pct_rect(box: dict, area: fitz.Rect) -> fitz.Rect:
    return fitz.Rect(
        area.x0 + area.width * box["left"] / 100,
        area.y0 + area.height * box["top"] / 100,
        area.x0 + area.width * (box["left"] + box["width"]) / 100,
        area.y0 + area.height * (box["top"] + box["height"]) / 100,
    )


def _insert_textbox(
    page: fitz.Page,
    rect: fitz.Rect,
    text: str,
    *,
    fontsize: float,
    color: tuple[float, float, float],
    align: int = fitz.TEXT_ALIGN_CENTER,
    fontfile: Path | None = None,
    bold: bool = False,
) -> None:
    kwargs: dict = {
        "fontsize": fontsize,
        "color": color,
        "align": align,
    }
    if fontfile and fontfile.is_file():
        kwargs["fontfile"] = str(fontfile)
    else:
        kwargs["fontname"] = "hebo" if bold else "helv"
    page.insert_textbox(rect, text, **kwargs)


def _draw_brush_label(
    page: fitz.Page,
    text: str,
    *,
    center_x: float,
    baseline_y: float,
    fontsize: float,
    brush_font: Path | None,
    color: tuple[float, float, float] = BRUSH_BLUE,
) -> None:
    if not text:
        return
    if brush_font and brush_font.is_file():
        font = fitz.Font(fontfile=str(brush_font))
        text_width = font.text_length(text, fontsize=fontsize)
        x = center_x - text_width / 2
        writer = fitz.TextWriter(page.rect)
        writer.append((x, baseline_y), text, font=font, fontsize=fontsize)
        writer.write_text(page, color=color)
        return
    _insert_textbox(
        page,
        fitz.Rect(center_x - 40, baseline_y - fontsize, center_x + 40, baseline_y + 2),
        text,
        fontsize=fontsize,
        color=color,
        bold=True,
    )


def _draw_match_box(
    page: fitz.Page,
    rect: fitz.Rect,
    match: dict,
    result: dict | None,
    placement_label: str | None,
    matches_by_code: dict[str, dict],
    match_results: dict[str, dict],
    *,
    area: fitz.Rect,
    fonts: dict[str, Path | None],
    split_main_bracket: bool,
) -> None:
    has_score = bool(result and result.get("display"))
    header_frac = 0.20 if has_score else 0.22
    score_frac = 0.18 if has_score else 0.14

    page.draw_rect(rect, color=TEMPLATE_BLUE, width=0.8, overlay=True)
    header = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + rect.height * header_frac)
    page.draw_rect(header, color=TEMPLATE_BLUE, fill=TEMPLATE_BLUE, width=0, overlay=True)

    code_px = _pt_on_area(MATCH_CODE_PT, area)
    code = match.get("code", "")
    terrain = match.get("terrain") or ""
    heure = match.get("heure") or ""

    code_rect = fitz.Rect(header.x0 + 2, header.y0, header.x0 + header.width * 0.42, header.y1)
    terrain_rect = fitz.Rect(header.x0, header.y0, header.x1, header.y1)
    heure_rect = fitz.Rect(header.x1 - header.width * 0.42, header.y0, header.x1 - 2, header.y1)

    _insert_textbox(
        page,
        code_rect,
        code,
        fontsize=code_px,
        color=WHITE,
        align=fitz.TEXT_ALIGN_LEFT,
        fontfile=fonts.get("tsl"),
        bold=True,
    )
    _insert_textbox(
        page,
        terrain_rect,
        terrain,
        fontsize=code_px,
        color=WHITE,
        fontfile=fonts.get("noto"),
        bold=True,
    )
    _insert_textbox(
        page,
        heure_rect,
        heure,
        fontsize=code_px,
        color=WHITE,
        align=fitz.TEXT_ALIGN_RIGHT,
        fontfile=fonts.get("tsl"),
        bold=True,
    )

    if placement_label:
        label_size = _pt_on_area(PLACEMENT_PT, area)
        if placement_label == "1-2" and split_main_bracket:
            center_x = rect.x0 + rect.width * 0.72
        else:
            center_x = rect.x0 + rect.width / 2
        _draw_brush_label(
            page,
            placement_label,
            center_x=center_x,
            baseline_y=rect.y0 - 2,
            fontsize=label_size,
            brush_font=fonts.get("brush"),
        )

    body_top = header.y1
    score_h = rect.height * score_frac
    body = fitz.Rect(rect.x0, body_top, rect.x1, rect.y1 - score_h)
    mid_y = body.y0 + body.height / 2
    page.draw_line(
        fitz.Point(body.x0, mid_y),
        fitz.Point(body.x1, mid_y),
        color=TEMPLATE_BLUE,
        width=0.5,
        overlay=True,
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
    team1_px = _pt_on_area(
        TEAM_PLACEHOLDER_PT if is_placeholder(equipe1) else TEAM_PT,
        area,
    )
    team2_px = _pt_on_area(
        TEAM_PLACEHOLDER_PT if is_placeholder(equipe2) else TEAM_PT,
        area,
    )

    _insert_textbox(
        page,
        team1_rect,
        equipe1,
        fontsize=team1_px,
        color=ARENA_800,
        fontfile=fonts.get("noto"),
        bold=winner in (None, 1),
    )
    _insert_textbox(
        page,
        team2_rect,
        equipe2,
        fontsize=team2_px,
        color=ARENA_800,
        fontfile=fonts.get("noto"),
        bold=winner in (None, 2),
    )

    vs_rect = fitz.Rect(body.x0, mid_y - body.height * 0.11, body.x1, mid_y + body.height * 0.11)
    _insert_textbox(
        page,
        vs_rect,
        "vs",
        fontsize=_pt_on_area(VS_PT, area),
        color=ARENA_600,
        fontfile=fonts.get("noto"),
        bold=True,
    )

    score_rect = fitz.Rect(rect.x0, rect.y1 - score_h, rect.x1, rect.y1)
    if has_score:
        page.draw_rect(
            score_rect,
            color=TEMPLATE_BLUE,
            fill=(0.97, 0.99, 1.0),
            width=0,
            overlay=True,
        )
        _insert_textbox(
            page,
            score_rect,
            str(result["display"]),
            fontsize=_pt_on_area(SCORE_PT, area),
            color=TEMPLATE_BLUE,
            fontfile=fonts.get("tsl"),
            bold=True,
        )
    else:
        page.draw_line(
            fitz.Point(score_rect.x0, score_rect.y0),
            fitz.Point(score_rect.x1, score_rect.y0),
            color=TEMPLATE_BLUE,
            width=0.4,
            dashes="[2 2]",
            overlay=True,
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
    text = resolved if resolved != (raw or "").strip() else format_feed_key(key)
    return format_team_with_initials(text)


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
    base_dir: Path | None = None,
    split_main_bracket: bool = False,
) -> None:
    from engine.live_team_resolve import feed_key_from_team_label

    fonts = _font_paths(base_dir)
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
            area=area,
            fonts=fonts,
            split_main_bracket=split_main_bracket,
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
            overlay=True,
        )
        _insert_textbox(
            page,
            rect,
            text,
            fontsize=_pt_on_area(FEED_PT, area),
            color=ARENA_800,
            fontfile=fonts.get("tsl"),
        )


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
        page.draw_rect(cell, color=TEMPLATE_BLUE, fill=TEMPLATE_BLUE, width=0, overlay=True)
        _insert_textbox(page, cell, header, fontsize=TABLE_HEAD_PT, color=WHITE, bold=True)
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
            page.draw_rect(cell, color=TEMPLATE_BLUE, fill=fill, width=0.4, overlay=True)
            color = BRUSH_BLUE if index == 2 and value != "—" else ARENA_800
            _insert_textbox(
                page,
                cell,
                value,
                fontsize=TABLE_BODY_PT,
                color=color,
                bold=index in (0, 2),
            )
            x += width
        y += row_h

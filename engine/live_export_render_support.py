"""Dessin des encarts Manager pour l'export PDF (aligné sur LiveBracketSlide)."""

from __future__ import annotations

import re
from collections import defaultdict
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
SCORE_LABEL_PT = 10.0
FEED_PT = 8.0
PLACEMENT_PT = 11.0
TABLE_HEAD_PT = 9.0
TABLE_HEAD_TSL_PT = 11.0
TABLE_HEAD_DISPLAY_PT = 12.0
TABLE_BODY_PT = 10.0
PLANNING_BASE_PT = 1024.0
FINAL_BASE_PT = 820.0
MM_TO_PT = 72.0 / 25.4
TABLE_SIDE_MARGIN_MM = 5.0
TABLE_SIDE_MARGIN_PT = TABLE_SIDE_MARGIN_MM * MM_TO_PT
# Ratio classement final / planning live (820 px sur slide 1024 px).
NARROW_TABLE_RATIO = FINAL_BASE_PT / PLANNING_BASE_PT


def narrow_table_width_pt(content_width_pt: float) -> float:
    """Largeur convocations = même ratio que le classement final capturé."""
    return max(120.0, content_width_pt * NARROW_TABLE_RATIO)


# Alias rétrocompat (valeur de référence slide 1024 pt, pas la page PDF).
FINAL_TABLE_WIDTH_PT = FINAL_BASE_PT
LIVE_CARD_RADIUS_PX = 12.0
# 1 px CSS à la largeur ref (820 px capture) ≈ 0,75 pt, proportionnel à la largeur.
PX_TO_PT = 72.0 / 96.0
# Équivalent Tailwind ``border-template-blue/35`` sur fond blanc.
CARD_BORDER_COLOR = (
    0.65 + 0.35 * TEMPLATE_BLUE[0],
    0.65 + 0.35 * TEMPLATE_BLUE[1],
    0.65 + 0.35 * TEMPLATE_BLUE[2],
)
PLANNING_COL_WIDTHS = [0.07, 0.07, 0.10, 0.35, 0.35, 0.06]
# Inset calibré sur la 1re colonne convocations (72 % × 2 %).
TABLE_CELL_INSET_FRAC = 0.02
CONVOCATIONS_FIRST_COL_FRAC = 0.72
_BEZIER_K = 0.5522847498

_PLANNING_SLOT_RE = re.compile(r"^(?:J(?P<day>\d+)_)?PL(?P<index>\d+)_CODE$")


def _font_paths(base_dir: Path | None) -> dict[str, Path | None]:
    if base_dir is None:
        return {"brush": None, "tsl": None, "noto": None, "emoji": None}
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
        "emoji": [
            base_dir / "fonts" / "NotoColorEmoji.ttf",
            Path("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"),
            Path("/usr/share/fonts/google-noto-emoji/NotoColorEmoji.ttf"),
            Path("/usr/share/fonts/truetype/noto/NotoColorEmoji-Regular.ttf"),
            Path("/System/Library/Fonts/Apple Color Emoji.ttc"),
        ],
    }
    return {
        key: next((path for path in paths if path.is_file()), None)
        for key, paths in candidates.items()
    }


def _text_has_emoji(text: str) -> bool:
    for char in text:
        code = ord(char)
        if code >= 0x1F300 or char in "🏆❌🥇🥈🥉":
            return True
    return False


def _pt_on_area(pt: float, area: fitz.Rect) -> float:
    return max(6.0, pt * (area.height / SLIDE_H_PT))


def _pct_rect(box: dict, area: fitz.Rect) -> fitz.Rect:
    return fitz.Rect(
        area.x0 + area.width * box["left"] / 100,
        area.y0 + area.height * box["top"] / 100,
        area.x0 + area.width * (box["left"] + box["width"]) / 100,
        area.y0 + area.height * (box["top"] + box["height"]) / 100,
    )


def _table_cell_pad_pt(content_width: float) -> float:
    """Padding horizontal cellule — même décalage que convocations (ÉQUIPE / noms)."""
    return max(
        4.0,
        content_width * CONVOCATIONS_FIRST_COL_FRAC * TABLE_CELL_INSET_FRAC,
    )


def _rasterize_placeholder_line(
    text: str,
    fontsize: float,
    fonts: dict[str, Path | None],
) -> tuple[bytes, float, float] | None:
    """Libellé placeholder complet en PNG couleur (comme boîtes match Live)."""
    emoji_path = fonts.get("emoji")
    if not emoji_path or not emoji_path.is_file():
        return None
    try:
        from io import BytesIO

        from PIL import Image, ImageDraw, ImageFont

        px = max(28, int(fontsize * 3.2))
        for size in (px, 32, 40, 48):
            try:
                font = ImageFont.truetype(str(emoji_path), size)
            except OSError:
                continue
            bbox = font.getbbox(text)
            iw = max(bbox[2] - bbox[0], 1)
            ih = max(bbox[3] - bbox[1], 1)
            img = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            draw.text((-bbox[0], -bbox[1]), text, font=font, embedded_color=True)
            buf = BytesIO()
            img.save(buf, format="PNG")
            pt_scale = fontsize / size
            return buf.getvalue(), iw * pt_scale, ih * pt_scale
    except Exception:
        return None
    return None


def _insert_html_emoji_cell(
    page: fitz.Page,
    rect: fitz.Rect,
    text: str,
    *,
    fontsize: float,
    color: tuple[float, float, float],
    pad_pt: float | None = None,
    fonts: dict[str, Path | None] | None = None,
    base_dir: Path | None = None,
) -> bool:
    """Placeholder planning — même rendu emoji que les boîtes match (PNG système)."""
    del color, base_dir
    value = (text or "").strip()
    if not value:
        return False
    pad = pad_pt if pad_pt is not None else 2.0
    font_paths = fonts or {}
    raster = _rasterize_placeholder_line(value, fontsize, font_paths)
    if raster is None:
        return False
    png_bytes, img_w_pt, img_h_pt = raster
    if img_w_pt <= 0 or img_h_pt <= 0:
        return False
    draw_h = min(rect.height * 0.82, img_h_pt)
    draw_w = img_w_pt * (draw_h / img_h_pt)
    if draw_w > rect.width - 2 * pad:
        draw_w = rect.width - 2 * pad
        draw_h = img_h_pt * (draw_w / img_w_pt)
    dest = fitz.Rect(
        rect.x0 + pad,
        rect.y0 + (rect.height - draw_h) / 2,
        rect.x0 + pad + draw_w,
        rect.y0 + (rect.height + draw_h) / 2,
    )
    page.insert_image(dest, stream=png_bytes, keep_proportion=True)
    return True


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
    pad_pt: float | None = None,
    fonts: dict[str, Path | None] | None = None,
) -> None:
    value = (text or "").strip()
    if not value:
        return

    if fontfile is None and fonts and _text_has_emoji(value):
        fontfile = fonts.get("emoji") or fonts.get("noto")

    if fontfile and fontfile.is_file():
        try:
            font = fitz.Font(fontfile=str(fontfile))
        except Exception:
            font = None
        if font is not None:
            text_width = font.text_length(value, fontsize=fontsize)
            inset = pad_pt if pad_pt is not None else max(2.0, rect.width * 0.02)
            if align == fitz.TEXT_ALIGN_LEFT:
                x = rect.x0 + inset
            elif align == fitz.TEXT_ALIGN_RIGHT:
                x = rect.x1 - text_width - inset
            else:
                x = rect.x0 + (rect.width - text_width) / 2
            text_h = (font.ascender - font.descender) * fontsize
            y = rect.y0 + (rect.height - text_h) / 2 + font.ascender * fontsize
            writer = fitz.TextWriter(page.rect)
            if bold:
                writer.append((x + 0.35, y), value, font=font, fontsize=fontsize)
            writer.append((x, y), value, font=font, fontsize=fontsize)
            writer.write_text(page, color=color)
            return

    kwargs: dict = {
        "fontsize": fontsize,
        "color": color,
        "align": align,
    }
    kwargs["fontname"] = "hebo" if bold else "helv"
    page.insert_textbox(rect, value, **kwargs)


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
        fontfile=fonts.get("tsl") if is_placeholder(equipe1) else fonts.get("noto"),
        bold=False,
        align=fitz.TEXT_ALIGN_LEFT if is_placeholder(equipe1) else fitz.TEXT_ALIGN_CENTER,
    )
    _insert_textbox(
        page,
        team2_rect,
        equipe2,
        fontsize=team2_px,
        color=ARENA_800,
        fontfile=fonts.get("tsl") if is_placeholder(equipe2) else fonts.get("noto"),
        bold=False,
        align=fitz.TEXT_ALIGN_LEFT if is_placeholder(equipe2) else fitz.TEXT_ALIGN_CENTER,
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
        label_rect = fitz.Rect(
            score_rect.x0,
            score_rect.y0 + score_rect.height * 0.15,
            score_rect.x1,
            score_rect.y1,
        )
        _insert_textbox(
            page,
            label_rect,
            "score:",
            fontsize=_pt_on_area(SCORE_LABEL_PT, area),
            color=TEMPLATE_BLUE,
            fontfile=fonts.get("noto"),
            bold=False,
            align=fitz.TEXT_ALIGN_CENTER,
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


def _planning_slots(layout_fields: list[dict]) -> list[tuple[int | None, int]]:
    slots: list[tuple[int | None, int]] = []
    seen: set[str] = set()
    for field in layout_fields:
        match = _PLANNING_SLOT_RE.match(field["key"])
        if not match or field["key"] in seen:
            continue
        seen.add(field["key"])
        day = int(match.group("day")) if match.group("day") else None
        slots.append((day, int(match.group("index"))))
    slots.sort(key=lambda item: ((item[0] or 0), item[1]))
    return slots


def _build_planning_rows(
    layout_fields: list[dict],
    matches: list[dict],
    match_results: dict[str, dict],
) -> list[dict]:
    matches_by_code = {match["code"]: match for match in matches}
    ordered = sorted(
        matches,
        key=lambda item: (
            item.get("ordre_planning", item.get("ordre", 0)),
            item.get("ordre", 0),
        ),
    )
    by_day: dict[int, list[dict]] = defaultdict(list)
    for match in ordered:
        by_day[int(match.get("jour", 1))].append(match)

    rows: list[dict] = []
    for day, index in _planning_slots(layout_fields):
        source = by_day.get(day, []) if day is not None else ordered
        if index - 1 >= len(source):
            continue
        match = source[index - 1]
        rows.append(
            {
                "code": match["code"],
                "heure": match.get("heure") or "",
                "terrain": match.get("terrain") or "",
                "equipe1": format_team_display(
                    match.get("equipe1", ""),
                    matches_by_code,
                    match_results,
                ),
                "equipe2": format_team_display(
                    match.get("equipe2", ""),
                    matches_by_code,
                    match_results,
                ),
                "duration": "—",
            }
        )
    return rows


def _fit_live_table_area(
    area: fitz.Rect,
    *,
    width_mode: str = "full",
    base_width_pt: float | None = None,
    row_count: int,
    row_h_pt: float = 26.0,
) -> fitz.Rect:
    """Zone tableau — pleine largeur (−5 mm) ou étroite (ratio final/planning)."""
    if width_mode == "narrow":
        table_w = min(
            base_width_pt or narrow_table_width_pt(area.width),
            area.width,
        )
    else:
        table_w = max(40.0, area.width - 2 * TABLE_SIDE_MARGIN_PT)
    table_h = row_h_pt * max(row_count + 1, 2)
    scale_h = min(1.0, area.height / table_h)
    draw_w = table_w
    draw_h = table_h * scale_h
    x0 = area.x0 + (area.width - draw_w) / 2
    y0 = area.y0 + (area.height - draw_h) / 2
    return fitz.Rect(x0, y0, x0 + draw_w, y0 + draw_h)


def _card_border_width(table_area: fitz.Rect, ref_width_pt: float) -> float:
    """Épaisseur bordure = 1 px CSS à la largeur ref (comme classement final)."""
    if ref_width_pt <= 0:
        return PX_TO_PT
    return max(0.45, PX_TO_PT * table_area.width / ref_width_pt)


def _radius_frac_for_rect(rect: fitz.Rect, radius_pt: float) -> float:
    """Fraction PyMuPDF pour obtenir ``radius_pt`` sur ce rectangle."""
    short = min(rect.width, rect.height)
    if short <= 0:
        return 0.05
    return min(0.5, max(0.018, radius_pt / short))


def _corner_radius_pt(table_area: fitz.Rect, ref_width_pt: float) -> float:
    if ref_width_pt <= 0:
        ref_width_pt = table_area.width
    return LIVE_CARD_RADIUS_PX * (table_area.width / ref_width_pt)


def _draw_white_body_shell(
    page: fitz.Page,
    content: fitz.Rect,
    header_bottom: float,
    radius_pt: float,
) -> float:
    """Corps blanc sous l'en-tête, coins bas arrondis."""
    body_bottom = content.y1 - radius_pt
    if header_bottom >= content.y1 - 0.5:
        return body_bottom

    page.draw_rect(
        fitz.Rect(content.x0, header_bottom, content.x1, body_bottom),
        color=WHITE,
        fill=WHITE,
        width=0,
        overlay=True,
    )
    if radius_pt <= 0.5:
        return body_bottom

    cap_h = min(content.height, 2 * radius_pt)
    cap_rect = fitz.Rect(content.x0, content.y1 - cap_h, content.x1, content.y1)
    page.draw_rect(
        cap_rect,
        color=WHITE,
        fill=WHITE,
        width=0,
        radius=_radius_frac_for_rect(cap_rect, radius_pt),
        overlay=True,
    )
    bridge_top = max(header_bottom, content.y1 - cap_h)
    if body_bottom < bridge_top - 0.1:
        page.draw_rect(
            fitz.Rect(content.x0, body_bottom, content.x1, bridge_top),
            color=WHITE,
            fill=WHITE,
            width=0,
            overlay=True,
        )
    return body_bottom


def _draw_hand_checkbox(page: fitz.Page, cell: fitz.Rect, *, pad_pt: float = 0.0) -> None:
    """Carré à cocher — centré, marge droite = inset colonne CODE."""
    inner = fitz.Rect(cell.x0, cell.y0, cell.x1 - pad_pt, cell.y1)
    size = min(inner.width * 0.38, inner.height * 0.52, 11.0)
    box = fitz.Rect(
        inner.x0 + (inner.width - size) / 2,
        inner.y0 + (inner.height - size) / 2,
        inner.x0 + (inner.width + size) / 2,
        inner.y0 + (inner.height + size) / 2,
    )
    page.draw_rect(box, color=TEMPLATE_BLUE, width=0.8, overlay=True)


def _draw_live_table_card(
    page: fitz.Page,
    table_area: fitz.Rect,
    headers: list[str],
    body_rows: list[list[str]],
    *,
    col_widths: list[float],
    base_dir: Path | None,
    alignments: list[int] | None = None,
    body_fonts: list[str | None] | None = None,
    body_bold: list[bool] | None = None,
    header_bold: list[bool] | None = None,
    body_colors: list[tuple[float, float, float] | None] | None = None,
    ref_width_pt: float = PLANNING_BASE_PT,
    checkbox_cols: list[int] | None = None,
    emoji_html_cols: list[int] | None = None,
    body_content: bool = True,
) -> None:
    fonts = _font_paths(base_dir)
    row_count = len(body_rows) + 1
    border_w = _card_border_width(table_area, ref_width_pt)
    outer_r_pt = _corner_radius_pt(table_area, ref_width_pt)
    outer_frac = _radius_frac_for_rect(table_area, outer_r_pt)
    content = fitz.Rect(
        table_area.x0 + border_w,
        table_area.y0 + border_w,
        table_area.x1 - border_w,
        table_area.y1 - border_w,
    )
    content_r_pt = max(0.0, outer_r_pt - border_w)
    cell_pad = _table_cell_pad_pt(content.width)
    aligns = alignments or [fitz.TEXT_ALIGN_LEFT] * len(headers)
    font_keys = body_fonts or ["tsl"] * len(headers)
    header_bolds = header_bold or [False] * len(headers)

    base_row_h = content.height / max(row_count, 2)
    header_bottom = content.y0 + base_row_h
    row_line = (0.82, 0.92, 0.98)
    row_alt = (0.97, 0.99, 1.0)

    page.draw_rect(
        table_area,
        color=TEMPLATE_BLUE,
        fill=TEMPLATE_BLUE,
        width=0,
        radius=outer_frac,
        overlay=True,
    )
    body_bottom = _draw_white_body_shell(
        page, content, header_bottom, content_r_pt
    )
    body_row_h = max(
        0.0,
        (body_bottom - header_bottom) / max(len(body_rows), 1),
    )

    x = content.x0
    for index, header in enumerate(headers):
        width = content.width * col_widths[index]
        cell = fitz.Rect(x, content.y0, x + width, header_bottom)
        align = aligns[index]
        _insert_textbox(
            page,
            cell,
            header,
            fontsize=TABLE_HEAD_DISPLAY_PT,
            color=WHITE,
            align=align,
            fontfile=fonts.get("tsl"),
            bold=header_bolds[index] if index < len(header_bolds) else False,
            pad_pt=cell_pad,
            fonts=fonts,
        )
        x += width

    color_list = body_colors or []
    color_index = 0
    for row_index, values in enumerate(body_rows):
        y0 = header_bottom + body_row_h * row_index
        row_rect = fitz.Rect(content.x0, y0, content.x1, y0 + body_row_h)
        fill = WHITE if row_index % 2 == 0 else row_alt
        page.draw_line(
            fitz.Point(content.x0, y0),
            fitz.Point(content.x1, y0),
            color=row_line,
            width=0.5,
            overlay=True,
        )
        page.draw_rect(row_rect, color=fill, fill=fill, width=0, overlay=True)
        x = content.x0
        for index, value in enumerate(values):
            width = content.width * col_widths[index]
            cell = fitz.Rect(x, y0, x + width, y0 + body_row_h)
            font_key = font_keys[index] if index < len(font_keys) else "tsl"
            fontfile = fonts.get(font_key) if font_key else None
            bold = (body_bold or [False] * len(values))[index]
            if color_list and color_index < len(color_list):
                color = color_list[color_index]
            else:
                color = ARENA_800
            color_index += 1
            align = aligns[index]
            if not body_content:
                x += width
                continue
            if checkbox_cols and index in checkbox_cols:
                _draw_hand_checkbox(page, cell, pad_pt=cell_pad)
                x += width
                continue
            body_pt = TEAM_PLACEHOLDER_PT if is_placeholder(value) else TABLE_BODY_PT
            cell_font = fonts.get("tsl") if is_placeholder(value) else fontfile
            if (
                emoji_html_cols
                and index in emoji_html_cols
                and is_placeholder(value)
                and _insert_html_emoji_cell(
                    page,
                    cell,
                    value or "—",
                    fontsize=body_pt,
                    color=color,
                    pad_pt=cell_pad,
                    fonts=fonts,
                    base_dir=base_dir,
                )
            ):
                x += width
                continue
            _insert_textbox(
                page,
                cell,
                value or "—",
                fontsize=body_pt,
                color=color,
                align=align,
                fontfile=cell_font,
                bold=bold,
                pad_pt=cell_pad,
                fonts=fonts,
            )
            x += width

    page.draw_rect(
        table_area,
        color=CARD_BORDER_COLOR,
        fill=None,
        width=border_w,
        radius=outer_frac,
        overlay=True,
    )


def planning_body_rect(table_area: fitz.Rect, body_row_count: int) -> fitz.Rect:
    """Zone corps du tableau planning (sous la bande d'en-tête native 12 pt)."""
    border_w = _card_border_width(table_area, PLANNING_BASE_PT)
    content = fitz.Rect(
        table_area.x0 + border_w,
        table_area.y0 + border_w,
        table_area.x1 - border_w,
        table_area.y1 - border_w,
    )
    row_count = body_row_count + 1
    header_bottom = content.y0 + content.height / max(row_count, 2)
    content_r_pt = max(
        0.0,
        _corner_radius_pt(table_area, PLANNING_BASE_PT) - border_w,
    )
    body_bottom = content.y1 - content_r_pt
    return fitz.Rect(content.x0, header_bottom, content.x1, body_bottom)


def draw_planning_table_frame(
    page: fitz.Page,
    table_area: fitz.Rect,
    body_row_count: int,
    *,
    base_dir: Path | None = None,
) -> None:
    """Coquille + en-têtes natifs 12 pt (corps = capture HTML par-dessus)."""
    headers = [
        "CODE",
        "HEURE",
        "TERRAIN",
        "ÉQUIPE 1",
        "ÉQUIPE 2",
        "TERMINÉ",
    ]
    dummy_rows = [[""] * len(headers) for _ in range(body_row_count)]
    _draw_live_table_card(
        page,
        table_area,
        headers,
        dummy_rows,
        col_widths=PLANNING_COL_WIDTHS,
        base_dir=base_dir,
        alignments=[
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_RIGHT,
        ],
        body_fonts=["tsl", "tsl", "noto", "noto", "noto", "tsl"],
        body_bold=[True, False, True, False, False, False],
        body_content=False,
    )


def draw_planning_table(
    page: fitz.Page,
    area: fitz.Rect,
    layout_fields: list[dict],
    matches: list[dict],
    match_results: dict[str, dict],
    *,
    base_dir: Path | None = None,
    export_mode: bool = True,
) -> None:
    """Tableau planning calqué sur LivePlanningTab (capture export)."""
    rows = _build_planning_rows(layout_fields, matches, match_results)
    headers = [
        "CODE",
        "HEURE",
        "TERRAIN",
        "ÉQUIPE 1",
        "ÉQUIPE 2",
        "TERMINÉ" if export_mode else "FAIT",
    ]
    col_widths = PLANNING_COL_WIDTHS
    table_area = _fit_live_table_area(
        area,
        width_mode="full",
        row_count=len(rows),
    )
    body_rows = [
        [
            row["code"],
            row["heure"] or "—",
            row["terrain"] or "—",
            row["equipe1"],
            row["equipe2"],
            "" if export_mode else "☐",
        ]
        for row in rows
    ]
    _draw_live_table_card(
        page,
        table_area,
        headers,
        body_rows,
        col_widths=col_widths,
        base_dir=base_dir,
        alignments=[
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_LEFT,
            fitz.TEXT_ALIGN_RIGHT,
        ],
        body_fonts=["tsl", "tsl", "noto", "noto", "noto", "tsl"],
        body_bold=[True, False, True, False, False, False],
        checkbox_cols=[5] if export_mode else None,
        emoji_html_cols=[3, 4],
    )


def draw_final_ranking(
    page: fitz.Page,
    area: fitz.Rect,
    matches: list[dict],
    match_results: dict[str, dict],
    fields: dict[str, str],
    nb_equipes: int,
    *,
    base_dir: Path | None = None,
    place_range: tuple[int, int] | None = None,
) -> None:
    rows = build_final_ranking(matches, match_results, fields, nb_equipes)
    if place_range:
        start, end = place_range
        rows = [row for row in rows if start <= row["place"] <= end]

    headers = ["Place", "Équipe", "Points"]
    col_widths = [0.18, 0.58, 0.24]
    table_area = _fit_live_table_area(
        area,
        width_mode="narrow",
        row_count=len(rows),
    )
    body_rows = [
        [
            format_place_label(row["place"]),
            row["team"] or "—",
            row["points"] or "—",
        ]
        for row in rows
    ]
    body_colors: list[tuple[float, float, float]] = []
    for row in body_rows:
        body_colors.extend(
            [
                ARENA_800,
                ARENA_800,
                BRUSH_BLUE if row[2] != "—" else ARENA_800,
            ]
        )

    _draw_live_table_card(
        page,
        table_area,
        headers,
        body_rows,
        col_widths=col_widths,
        base_dir=base_dir,
        alignments=[fitz.TEXT_ALIGN_LEFT, fitz.TEXT_ALIGN_LEFT, fitz.TEXT_ALIGN_RIGHT],
        body_fonts=["tsl", "noto", "tsl"],
        body_bold=[False, False, False],
        body_colors=body_colors,
        ref_width_pt=narrow_table_width_pt(table_area.width),
    )

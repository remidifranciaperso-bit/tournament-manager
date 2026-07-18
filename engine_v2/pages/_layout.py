"""Mise en page commune Engine V2 (bandeau Live, pied de page, couverture)."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

from engine.pdf_footer import (
    ENGINE_FOOTER_LOGO_WIDTH_RATIO,
    ENGINE_FOOTER_RATIO,
    GARDE_LOGO_BOX_DEFAUT,
    contain_rect,
)
from engine.ppt_engine import construire_valeurs_globales, detecter_genre, format_date
from engine_v2.pages._theme import BRUSH_BLUE, LIME, WHITE, YELLOW, font_paths

ENGINE_HEADER_RATIO = 0.083

# Typo couverture / bandeau (spec templates bleus)
COVER_TYPE_PT = 96.0
COVER_DATE_HEURE_PT = 30.0
COVER_NB_PT = 28.0
COVER_CREDIT_PT = 16.0
HEADER_TITLE_PT = 32.0
HEADER_META_PT = 18.0
TAGLINE_PT = 20.0

_MOTIF_JOUEUR = re.compile(r"joueur", re.IGNORECASE)


def cover_background_path(base_dir: Path) -> Path | None:
    candidates = [
        base_dir / "engine_v2" / "assets" / "cover-background.png",
        base_dir / "frontend" / "public" / "images" / "padel-court-night-v6.png",
    ]
    return next((p for p in candidates if p.is_file()), None)


def is_femmes(tournoi) -> bool:
    return detecter_genre(tournoi) == "Femmes"


def feminiser_joueur(texte: str) -> str:
    def _remplacer(match: re.Match[str]) -> str:
        mot = match.group(0)
        if mot.isupper():
            return "JOUEUSE"
        if mot[:1].isupper():
            return "Joueuse"
        return "joueuse"

    return _MOTIF_JOUEUR.sub(_remplacer, texte)


def participants_tagline(tournoi) -> str:
    if is_femmes(tournoi):
        return "QUE LES MEILLEURES GAGNENT"
    return "QUE LES MEILLEURS GAGNENT"


def participants_title(tournoi) -> str:
    if is_femmes(tournoi):
        return "PARTICIPANTES"
    return "PARTICIPANTS"


def participants_headers(tournoi) -> list[str]:
    j1 = feminiser_joueur("Joueur 1")
    j2 = feminiser_joueur("Joueur 2")
    return [j1, "Classement J1", j2, "Classement J2", "Poids paire", "TS"]


def header_meta(tournoi) -> tuple[str, str]:
    globales = construire_valeurs_globales(tournoi)
    return globales["{{TYPE}}"], format_date(tournoi.date_tournoi)


def header_band_height(page_rect: fitz.Rect) -> float:
    return page_rect.height * ENGINE_HEADER_RATIO


def footer_band_height(page_rect: fitz.Rect) -> float:
    return page_rect.height * ENGINE_FOOTER_RATIO


def footer_logo_zone(page_rect: fitz.Rect) -> fitz.Rect:
    footer_top = page_rect.y1 - footer_band_height(page_rect)
    side = page_rect.width * (1 - ENGINE_FOOTER_LOGO_WIDTH_RATIO) / 2
    return fitz.Rect(
        page_rect.x0 + side,
        footer_top,
        page_rect.x1 - side,
        page_rect.y1,
    )


def content_area(
    page_rect: fitz.Rect,
    *,
    tagline: bool = False,
) -> fitz.Rect:
    top = page_rect.y0 + header_band_height(page_rect)
    if tagline:
        top += TAGLINE_PT + 10
    return fitz.Rect(
        page_rect.x0 + 20,
        top + 6,
        page_rect.x1 - 20,
        page_rect.y1 - footer_band_height(page_rect) - 4,
    )


def _load_brush(brush_font: Path | None) -> fitz.Font | None:
    if brush_font and brush_font.is_file():
        return fitz.Font(fontfile=str(brush_font))
    return None


def _load_tsl(tsl_font: Path | None) -> fitz.Font | None:
    if tsl_font and tsl_font.is_file():
        return fitz.Font(fontfile=str(tsl_font))
    return None


def draw_brush_line(
    page: fitz.Page,
    text: str,
    *,
    y: float,
    fontsize: float,
    color: tuple[float, float, float],
    brush_font: Path | None,
    align: int = fitz.TEXT_ALIGN_CENTER,
    margin_x: float = 24.0,
) -> None:
    rect = page.rect
    font = _load_brush(brush_font)
    if font is None:
        x = rect.x0 + margin_x
        if align == fitz.TEXT_ALIGN_CENTER:
            x = rect.x0 + (rect.width - len(text) * fontsize * 0.45) / 2
        page.insert_text((x, y), text, fontsize=fontsize, color=color, fontname="helv")
        return

    text_width = font.text_length(text, fontsize=fontsize)
    if align == fitz.TEXT_ALIGN_LEFT:
        x = rect.x0 + margin_x
    elif align == fitz.TEXT_ALIGN_RIGHT:
        x = rect.x1 - margin_x - text_width
    else:
        x = rect.x0 + (rect.width - text_width) / 2

    writer = fitz.TextWriter(rect)
    writer.append((x, y), text, font=font, fontsize=fontsize)
    writer.write_text(page, color=color)


def draw_tsl_textbox(
    page: fitz.Page,
    text: str,
    box: fitz.Rect,
    *,
    fontsize: float,
    color: tuple[float, float, float] = WHITE,
    align: int = fitz.TEXT_ALIGN_LEFT,
    tsl_font: Path | None = None,
) -> None:
    font = _load_tsl(tsl_font)
    if font is None:
        page.insert_textbox(
            box,
            text,
            fontsize=fontsize,
            color=color,
            align=align,
            fontname="helv",
        )
        return

    tw = fitz.TextWriter(box)
    if align == fitz.TEXT_ALIGN_CENTER:
        text_width = font.text_length(text, fontsize=fontsize)
        x = box.x0 + (box.width - text_width) / 2
    elif align == fitz.TEXT_ALIGN_RIGHT:
        text_width = font.text_length(text, fontsize=fontsize)
        x = box.x1 - text_width
    else:
        x = box.x0
    y = box.y0 + fontsize * 0.85
    tw.append((x, y), text, font=font, fontsize=fontsize)
    tw.write_text(page, color=color)


def draw_page_header(
    page: fitz.Page,
    tournoi,
    title: str,
    *,
    base_dir: Path,
    tagline: str | None = None,
) -> None:
    rect = page.rect
    band_h = header_band_height(rect)
    band = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + band_h)
    page.draw_rect(band, color=None, fill=BRUSH_BLUE, overlay=False)

    fonts = font_paths(base_dir)
    type_line, date_line = header_meta(tournoi)
    meta_box = fitz.Rect(rect.x0 + 16, rect.y0 + 4, rect.x1 - 16, rect.y0 + band_h - 4)

    draw_tsl_textbox(
        page,
        type_line,
        fitz.Rect(meta_box.x0, meta_box.y0, meta_box.x0 + meta_box.width * 0.38, meta_box.y1),
        fontsize=HEADER_META_PT,
        tsl_font=fonts.get("tsl"),
    )
    draw_tsl_textbox(
        page,
        date_line,
        fitz.Rect(meta_box.x1 - meta_box.width * 0.28, meta_box.y0, meta_box.x1, meta_box.y1),
        fontsize=HEADER_META_PT,
        align=fitz.TEXT_ALIGN_RIGHT,
        tsl_font=fonts.get("tsl"),
    )
    draw_brush_line(
        page,
        title,
        y=rect.y0 + band_h * 0.72,
        fontsize=HEADER_TITLE_PT,
        color=WHITE,
        brush_font=fonts.get("brush"),
    )

    if tagline:
        draw_brush_line(
            page,
            tagline,
            y=rect.y0 + band_h + TAGLINE_PT * 0.95,
            fontsize=TAGLINE_PT,
            color=LIME,
            brush_font=fonts.get("brush"),
        )


def draw_page_footer_logo(
    page: fitz.Page,
    *,
    logo_bytes: bytes | None,
    logo_wh: tuple[int, int] | None,
) -> None:
    zone = footer_logo_zone(page.rect)
    page.draw_rect(zone, color=None, fill=WHITE, overlay=False)
    if not logo_bytes or not logo_wh:
        return
    dest = contain_rect(zone, float(logo_wh[0]), float(logo_wh[1]))
    page.insert_image(dest, stream=logo_bytes, keep_proportion=True)


def draw_cover_background(page: fitz.Page, base_dir: Path) -> None:
    path = cover_background_path(base_dir)
    if not path:
        page.draw_rect(page.rect, color=None, fill=(0.04, 0.04, 0.06), overlay=False)
        return

    rect = page.rect
    img_bytes = path.read_bytes()
    pix = fitz.Pixmap(str(path))
    try:
        iw, ih = float(pix.width), float(pix.height)
    finally:
        pix = None

    scale = max(rect.width / iw, rect.height / ih)
    draw_w = iw * scale
    draw_h = ih * scale
    dest = fitz.Rect(
        rect.x0 + (rect.width - draw_w) / 2,
        rect.y0 + (rect.height - draw_h) / 2,
        rect.x0 + (rect.width - draw_w) / 2 + draw_w,
        rect.y0 + (rect.height - draw_h) / 2 + draw_h,
    )
    page.insert_image(dest, stream=img_bytes, keep_proportion=True)


def draw_cover_logo(
    page: fitz.Page,
    *,
    logo_bytes: bytes | None,
    logo_wh: tuple[int, int] | None,
) -> None:
    if not logo_bytes or not logo_wh:
        return
    rect = page.rect
    fx0, fy0, fx1, fy1 = GARDE_LOGO_BOX_DEFAUT
    zone = fitz.Rect(
        rect.x0 + fx0 * rect.width,
        rect.y0 + fy0 * rect.height,
        rect.x0 + fx1 * rect.width,
        rect.y0 + fy1 * rect.height,
    )
    dest = contain_rect(zone, float(logo_wh[0]), float(logo_wh[1]))
    page.insert_image(dest, stream=logo_bytes, keep_proportion=True)

"""Mise en page commune Engine V2 (bandeau Engine, pied de page, couverture)."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

from engine.pdf_footer import contain_rect
from engine.ppt_engine import construire_valeurs_globales, detecter_genre, format_date
from engine_v2.pages._theme import ARENA_800, BRUSH_BLUE, LIME, WHITE, YELLOW, font_paths

# Géométrie template bleu (``Template_24_1J.pptx``), fractions 0–1.
HEADER_BAND = {"left": -0.0031, "top": -0.0015, "width": 1.0067, "height": 0.0858}
TITLE_BOX = {"left": 0.002, "top": 0.0056, "width": 0.996, "height": 0.0853}
TYPE_BOX = {"left": 0.0, "top": 0.0147, "width": 0.327, "height": 0.054}
DATE_BOX = {"left": 0.673, "top": 0.0144, "width": 0.327, "height": 0.054}
FOOTER_LOGO_BOX = {"left": 0.373, "top": 0.966, "width": 0.24, "height": 0.029}

COVER_LOGO_BOX = {"left": 0.274, "top": 0.056, "width": 0.443, "height": 0.108}
COVER_TYPE_BOX = {"left": -0.043, "top": 0.228, "width": 1.063, "height": 0.229}
COVER_CREDIT_BOX = {"left": 0.19, "top": 0.948, "width": 0.597, "height": 0.038}

COVER_TYPE_PT = 96.0
COVER_DATE_HEURE_PT = 30.0
COVER_NB_PT = 28.0
COVER_CREDIT_PT = 10.0
HEADER_TITLE_PT = 32.0
HEADER_META_PT = 18.0
HEADER_SIDE_MARGIN_MM = 5.0
MM_TO_PT = 72.0 / 25.4
HEADER_SIDE_MARGIN_PT = HEADER_SIDE_MARGIN_MM * MM_TO_PT
FOOTER_BOTTOM_MARGIN_MM = 3.0
FOOTER_BOTTOM_MARGIN_PT = FOOTER_BOTTOM_MARGIN_MM * MM_TO_PT

# Bloc date / heure / effectifs — remonté (~18 pt sur slide 540 pt), décalé à droite (fond visuel).
COVER_META_SHIFT = 0.033
COVER_META_LEFT = 0.38
COVER_META_WIDTH = 0.597
COVER_DATE_BOX = {"left": COVER_META_LEFT, "top": 0.622 - COVER_META_SHIFT, "width": COVER_META_WIDTH, "height": 0.081}
COVER_HEURE_BOX = {"left": COVER_META_LEFT, "top": 0.703 - COVER_META_SHIFT, "width": COVER_META_WIDTH, "height": 0.081}
COVER_EQUIPES_BOX = {"left": COVER_META_LEFT, "top": 0.785 - COVER_META_SHIFT, "width": COVER_META_WIDTH, "height": 0.076}
COVER_TERRAINS_BOX = {"left": COVER_META_LEFT, "top": 0.866 - COVER_META_SHIFT, "width": COVER_META_WIDTH, "height": 0.076}

_MOTIF_JOUEUR = re.compile(r"joueur", re.IGNORECASE)

def cover_background_path(base_dir: Path) -> Path | None:
    candidates = [
        base_dir / "engine_v2" / "assets" / "cover-background.jpg",
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


def participants_title(tournoi) -> str:
    if is_femmes(tournoi):
        return "PARTICIPANTES"
    return "PARTICIPANTS"


def participants_headers(tournoi) -> list[str]:
    if is_femmes(tournoi):
        return [
            "JOUEUSE 1",
            "CLASSEMENT J1",
            "JOUEUSE 2",
            "CLASSEMENT J2",
            "POIDS PAIRE",
            "TS",
        ]
    return [
        "JOUEUR 1",
        "CLASSEMENT J1",
        "JOUEUR 2",
        "CLASSEMENT J2",
        "POIDS PAIRE",
        "TS",
    ]


def header_meta(tournoi) -> tuple[str, str]:
    globales = construire_valeurs_globales(tournoi)
    return globales["{{TYPE}}"], format_date(tournoi.date_tournoi)


def pct_rect(page_rect: fitz.Rect, box: dict[str, float]) -> fitz.Rect:
    return fitz.Rect(
        page_rect.x0 + page_rect.width * box["left"],
        page_rect.y0 + page_rect.height * box["top"],
        page_rect.x0 + page_rect.width * (box["left"] + box["width"]),
        page_rect.y0 + page_rect.height * (box["top"] + box["height"]),
    )


def header_bottom(page_rect: fitz.Rect) -> float:
    return pct_rect(page_rect, HEADER_BAND).y1


def footer_logo_zone(page_rect: fitz.Rect) -> fitz.Rect:
    """Zone logo pied de page — ``FOOTER_BOTTOM_MARGIN_MM`` sous le logo."""
    template = pct_rect(page_rect, FOOTER_LOGO_BOX)
    y1 = page_rect.y1 - FOOTER_BOTTOM_MARGIN_PT
    return fitz.Rect(template.x0, y1 - template.height, template.x1, y1)


def footer_top(page_rect: fitz.Rect) -> float:
    return footer_logo_zone(page_rect).y0


def content_area(page_rect: fitz.Rect) -> fitz.Rect:
    return fitz.Rect(
        page_rect.x0,
        header_bottom(page_rect),
        page_rect.x1,
        footer_top(page_rect),
    )


def fill_rect(
    page: fitz.Page,
    rect: fitz.Rect,
    color: tuple[float, float, float],
    *,
    overlay: bool = True,
) -> None:
    page.draw_rect(rect, color=color, fill=color, width=0, overlay=overlay)


def _load_font(fontfile: Path | None) -> fitz.Font | None:
    if fontfile and fontfile.is_file():
        try:
            return fitz.Font(fontfile=str(fontfile))
        except Exception:
            return None
    return None


def _fit_fontsize(font: fitz.Font, box: fitz.Rect, max_pt: float) -> float:
    for fs in range(int(max_pt), 8, -1):
        text_h = (font.ascender - font.descender) * fs
        if text_h <= box.height * 0.96:
            return float(fs)
    return 8.0


def _baseline_y(box: fitz.Rect, font: fitz.Font, fontsize: float) -> float:
    text_h = (font.ascender - font.descender) * fontsize
    return box.y0 + (box.height - text_h) / 2 + font.ascender * fontsize


def draw_font_text(
    page: fitz.Page,
    box: fitz.Rect,
    text: str,
    *,
    fontsize: float,
    color: tuple[float, float, float],
    fontfile: Path | None,
    align: int = fitz.TEXT_ALIGN_CENTER,
    pad: float | None = None,
    bold: bool = False,
) -> None:
    """Texte custom (brush / TSL) — insert_textbox échoue souvent avec ces OTF/TTF."""
    value = (text or "").strip()
    if not value:
        return

    font = _load_font(fontfile)
    if font is None:
        page.insert_textbox(
            box,
            value,
            fontsize=fontsize,
            color=color,
            align=align,
            fontname="hebo" if bold or align == fitz.TEXT_ALIGN_CENTER else "helv",
        )
        return

    text_width = font.text_length(value, fontsize=fontsize)
    inset = pad if pad is not None else max(2.0, box.width * 0.02)
    if align == fitz.TEXT_ALIGN_LEFT:
        x = box.x0 + inset
    elif align == fitz.TEXT_ALIGN_RIGHT:
        x = box.x1 - text_width - inset
    else:
        x = box.x0 + (box.width - text_width) / 2

    y = _baseline_y(box, font, fontsize)

    writer = fitz.TextWriter(page.rect)
    use_faux_bold = bold and sum(color) < 2.4
    if use_faux_bold:
        writer.append((x + 0.35, y), value, font=font, fontsize=fontsize)
    writer.append((x, y), value, font=font, fontsize=fontsize)
    writer.write_text(page, color=color)


def _insert_textbox(
    page: fitz.Page,
    box: fitz.Rect,
    text: str,
    *,
    fontsize: float,
    color: tuple[float, float, float],
    fontfile: Path | None,
    align: int = fitz.TEXT_ALIGN_CENTER,
    bold: bool = False,
) -> None:
    draw_font_text(
        page,
        box,
        text,
        fontsize=fontsize,
        color=color,
        fontfile=fontfile,
        align=align,
        bold=bold,
    )


def draw_page_header(
    page: fitz.Page,
    tournoi,
    title: str,
    *,
    base_dir: Path,
) -> None:
    rect = page.rect
    fonts = font_paths(base_dir)
    band = pct_rect(rect, HEADER_BAND)
    fill_rect(page, band, BRUSH_BLUE)

    side = HEADER_SIDE_MARGIN_PT
    meta_w = band.width * 0.30
    type_box = fitz.Rect(band.x0 + side, band.y0, band.x0 + side + meta_w, band.y1)
    date_box = fitz.Rect(band.x1 - side - meta_w, band.y0, band.x1 - side, band.y1)

    type_line, date_line = header_meta(tournoi)
    _insert_textbox(
        page,
        type_box,
        type_line,
        fontsize=HEADER_META_PT,
        color=WHITE,
        fontfile=fonts.get("tsl"),
        align=fitz.TEXT_ALIGN_LEFT,
        bold=True,
    )
    _insert_textbox(
        page,
        date_box,
        date_line,
        fontsize=HEADER_META_PT,
        color=WHITE,
        fontfile=fonts.get("tsl"),
        align=fitz.TEXT_ALIGN_RIGHT,
        bold=True,
    )
    if not (title or "").strip():
        return
    brush = fonts.get("brush")
    brush_font = _load_font(brush)
    title_fs = (
        _fit_fontsize(brush_font, band, HEADER_TITLE_PT)
        if brush_font
        else HEADER_TITLE_PT
    )
    _insert_textbox(
        page,
        band,
        title,
        fontsize=title_fs,
        color=WHITE,
        fontfile=brush,
    )


FOOTER_CLUB_PT = 12.0


def draw_footer_club_in_zone(
    page: fitz.Page,
    zone: fitz.Rect,
    club_name: str,
    *,
    base_dir: Path | None,
) -> None:
    label = (club_name or "").strip().upper()
    if not label:
        return
    fonts = font_paths(base_dir) if base_dir else {}
    noto = fonts.get("noto")
    font = _load_font(noto)
    max_pt = min(FOOTER_CLUB_PT, zone.height * 0.88)
    fontsize = _fit_fontsize(font, zone, max_pt) if font else max_pt
    draw_font_text(
        page,
        zone,
        label,
        fontsize=fontsize,
        color=ARENA_800,
        fontfile=noto,
        align=fitz.TEXT_ALIGN_CENTER,
    )


def draw_page_footer_logo(
    page: fitz.Page,
    *,
    logo_bytes: bytes | None,
    logo_wh: tuple[int, int] | None,
    club_name: str | None = None,
    base_dir: Path | None = None,
) -> None:
    page_rect = page.rect
    bottom_limit = page_rect.y1 - FOOTER_BOTTOM_MARGIN_PT
    template = pct_rect(page_rect, FOOTER_LOGO_BOX)
    zone = fitz.Rect(
        template.x0,
        bottom_limit - template.height,
        template.x1,
        bottom_limit,
    )
    fill_rect(
        page,
        fitz.Rect(0, zone.y0, page_rect.width, page_rect.y1),
        WHITE,
        overlay=True,
    )
    if logo_bytes and logo_wh:
        dest = contain_rect(zone, float(logo_wh[0]), float(logo_wh[1]))
        dest = fitz.Rect(
            dest.x0,
            bottom_limit - dest.height,
            dest.x1,
            bottom_limit,
        )
        if dest.width < zone.width:
            shift = (zone.width - dest.width) / 2
            dest = fitz.Rect(
                zone.x0 + shift,
                dest.y0,
                zone.x0 + shift + dest.width,
                dest.y1,
            )
        page.insert_image(dest, stream=logo_bytes, keep_proportion=True)
        return

    draw_footer_club_in_zone(
        page,
        zone,
        club_name or "",
        base_dir=base_dir,
    )


def draw_cover_background(page: fitz.Page, base_dir: Path) -> None:
    path = cover_background_path(base_dir)
    rect = page.rect
    if not path:
        fill_rect(page, rect, (0.04, 0.04, 0.06), overlay=False)
        return

    with fitz.open(path) as imgdoc:
        img_rect = imgdoc[0].rect
        iw, ih = float(img_rect.width), float(img_rect.height)

    scale = max(rect.width / iw, rect.height / ih)
    draw_w = iw * scale
    draw_h = ih * scale
    dest = fitz.Rect(
        rect.x0 + (rect.width - draw_w) / 2,
        rect.y0 + (rect.height - draw_h) / 2,
        rect.x0 + (rect.width - draw_w) / 2 + draw_w,
        rect.y0 + (rect.height - draw_h) / 2 + draw_h,
    )
    page.insert_image(dest, filename=str(path), keep_proportion=True)


def draw_cover_logo(
    page: fitz.Page,
    *,
    logo_bytes: bytes | None,
    logo_wh: tuple[int, int] | None,
    club_name: str | None = None,
    base_dir: Path | None = None,
) -> None:
    zone = pct_rect(page.rect, COVER_LOGO_BOX)
    if logo_bytes and logo_wh:
        dest = contain_rect(zone, float(logo_wh[0]), float(logo_wh[1]))
        page.insert_image(dest, stream=logo_bytes, keep_proportion=True)
        return
    label = (club_name or "").strip().upper()
    if not label:
        return
    fonts = font_paths(base_dir) if base_dir else {}
    noto_bold = fonts.get("noto_bold") or fonts.get("noto")
    font = _load_font(noto_bold)
    max_pt = zone.height * 0.92
    fontsize = _fit_fontsize(font, zone, max_pt) if font else max_pt
    draw_font_text(
        page,
        zone,
        label,
        fontsize=fontsize,
        color=WHITE,
        fontfile=noto_bold,
        align=fitz.TEXT_ALIGN_CENTER,
    )


def draw_cover_texts(page: fitz.Page, tournoi, *, base_dir: Path) -> None:
    fonts = font_paths(base_dir)
    brush = fonts.get("brush")
    globales = construire_valeurs_globales(tournoi)

    _insert_textbox(
        page,
        pct_rect(page.rect, COVER_TYPE_BOX),
        globales["{{TYPE}}"],
        fontsize=COVER_TYPE_PT,
        color=YELLOW,
        fontfile=brush,
    )
    for box, key, size in (
        (COVER_DATE_BOX, "{{DATE}}", COVER_DATE_HEURE_PT),
        (COVER_HEURE_BOX, "{{HEURE}}", COVER_DATE_HEURE_PT),
        (COVER_EQUIPES_BOX, "{{NB_EQUIPES}}", COVER_NB_PT),
        (COVER_TERRAINS_BOX, "{{NB_TERRAINS}}", COVER_NB_PT),
    ):
        _insert_textbox(
            page,
            pct_rect(page.rect, box),
            globales[key],
            fontsize=size,
            color=WHITE,
            fontfile=brush,
            align=fitz.TEXT_ALIGN_RIGHT,
        )

    _insert_textbox(
        page,
        pct_rect(page.rect, COVER_CREDIT_BOX),
        "Padel Tournament Engine",
        fontsize=COVER_CREDIT_PT,
        color=LIME,
        fontfile=brush,
    )


def prepare_content_page(page: fitz.Page) -> None:
    fill_rect(page, page.rect, WHITE, overlay=False)


def draw_blank_header_band(page: fitz.Page) -> None:
    """Bande haute blanche (partie basse d'un tableau sur deux pages)."""
    fill_rect(page, pct_rect(page.rect, HEADER_BAND), WHITE)


def overlay_page_chrome(
    page: fitz.Page,
    tournoi,
    title: str,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    """Bandeau + pied de page par-dessus une page déjà rendue (tableaux bracket…)."""
    draw_page_header(page, tournoi, title, base_dir=base_dir)
    draw_page_footer_logo(
        page,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
        club_name=getattr(tournoi, "club", None),
        base_dir=base_dir,
    )

"""Page de couverture Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine_v2.pages._theme import (
    ARENA_950,
    BRUSH_BLUE,
    LIME,
    WHITE,
    font_paths,
)


def _format_date_fr(date_tournoi: str) -> str:
    try:
        from datetime import datetime

        return datetime.strptime(str(date_tournoi), "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        return str(date_tournoi)


def render_cover_page(
    page: fitz.Page,
    tournoi,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    rect = page.rect
    page.draw_rect(rect, color=None, fill=ARENA_950, overlay=False)

    fonts = font_paths(base_dir)
    brush = fonts.get("brush")

    # Bande décorative haute
    page.draw_rect(
        fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + 8),
        color=None,
        fill=BRUSH_BLUE,
        overlay=False,
    )

    if logo_bytes and logo_wh:
        zone = fitz.Rect(rect.x0 + rect.width * 0.32, rect.y0 + 36, rect.x1 - rect.width * 0.32, rect.y0 + 120)
        iw, ih = logo_wh
        scale = min(zone.width / iw, zone.height / ih)
        draw_w = iw * scale
        draw_h = ih * scale
        dest = fitz.Rect(
            zone.x0 + (zone.width - draw_w) / 2,
            zone.y0 + (zone.height - draw_h) / 2,
            zone.x0 + (zone.width - draw_w) / 2 + draw_w,
            zone.y0 + (zone.height - draw_h) / 2 + draw_h,
        )
        page.insert_image(dest, stream=logo_bytes, keep_proportion=True)
    else:
        if brush and brush.is_file():
            font = fitz.Font(fontfile=str(brush))
            club = tournoi.club.upper()
            fontsize = max(28.0, min(42.0, rect.width * 0.045))
            tw = font.text_length(club, fontsize=fontsize)
            x = rect.x0 + (rect.width - tw) / 2
            y = rect.y0 + 90
            writer = fitz.TextWriter(rect)
            writer.append((x, y), club, font=font, fontsize=fontsize)
            writer.write_text(page, color=WHITE)
        else:
            page.insert_text(
                (rect.x0 + 40, rect.y0 + 90),
                tournoi.club.upper(),
                fontsize=32,
                color=WHITE,
            )

    type_line = tournoi.type_tournoi
    genre = getattr(tournoi, "genre_tournoi", None)
    if genre:
        type_line = f"{type_line} — {genre}"

    if brush and brush.is_file():
        font = fitz.Font(fontfile=str(brush))
        fontsize = max(36.0, min(56.0, rect.width * 0.06))
        tw = font.text_length(type_line, fontsize=fontsize)
        x = rect.x0 + (rect.width - tw) / 2
        y = rect.y0 + rect.height * 0.42
        writer = fitz.TextWriter(rect)
        writer.append((x, y), type_line, font=font, fontsize=fontsize)
        writer.write_text(page, color=LIME)
    else:
        page.insert_text(
            (rect.x0 + 40, rect.y0 + rect.height * 0.42),
            type_line,
            fontsize=40,
            color=LIME,
        )

    meta_y = rect.y0 + rect.height * 0.58
    meta_lines = [
        _format_date_fr(tournoi.date_tournoi),
        f"Début : {tournoi.heure_debut}",
        f"{tournoi.nb_equipes} équipes · {tournoi.nb_terrains} terrains",
        tournoi.mode_tournoi,
    ]
    for index, line in enumerate(meta_lines):
        page.insert_textbox(
            fitz.Rect(rect.x0 + 80, meta_y + index * 28, rect.x1 - 80, meta_y + index * 28 + 24),
            line,
            fontsize=16,
            color=WHITE,
            align=fitz.TEXT_ALIGN_CENTER,
            fontname="helv",
        )

    page.insert_text(
        (rect.x0 + 24, rect.y1 - 20),
        "Engine V2 · Render PDF",
        fontsize=8,
        color=(0.35, 0.4, 0.48),
        fontname="helv",
    )

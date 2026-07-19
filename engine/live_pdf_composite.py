"""Composition PDF export : entête Engine + capture écran sur fond blanc."""

from __future__ import annotations

import base64

import fitz

from engine.live_export_render_support import (
    NARROW_TABLE_RATIO,
    TABLE_SIDE_MARGIN_PT,
    narrow_table_width_pt,
)

ENGINE_HEADER_RATIO = 0.083
ENGINE_FOOTER_RATIO = 0.042
ENGINE_FOOTER_LOGO_WIDTH_RATIO = 1 / 3
FOOTER_BOTTOM_MARGIN_PT = 3.0 * 72.0 / 25.4

def _decode_capture(data: str) -> bytes:
    if data.startswith("data:"):
        _, payload = data.split(",", 1)
        return base64.b64decode(payload)
    return base64.b64decode(data)


def _fit_pdf_clip(
    page: fitz.Page,
    source: fitz.Document,
    slide_index: int,
    clip: fitz.Rect,
    dest: fitz.Rect,
) -> None:
    """Colle une bande Engine dans dest sans rognage (contain + centré)."""
    clip_w = float(clip.width)
    clip_h = float(clip.height)
    if clip_w <= 0 or clip_h <= 0:
        return

    page.draw_rect(dest, color=None, fill=(1, 1, 1), overlay=False)

    scale = min(dest.width / clip_w, dest.height / clip_h)
    draw_w = clip_w * scale
    draw_h = clip_h * scale
    x0 = dest.x0 + (dest.width - draw_w) / 2
    y0 = dest.y0 + (dest.height - draw_h) / 2
    fit_dest = fitz.Rect(x0, y0, x0 + draw_w, y0 + draw_h)
    page.show_pdf_page(
        fit_dest,
        source,
        slide_index,
        clip=clip,
        keep_proportion=True,
    )


def _footer_logo_clip(engine_rect: fitz.Rect) -> fitz.Rect:
    """Bande basse Engine rognée aux 1/3 latéraux (logo centré uniquement)."""
    footer_top = engine_rect.height * (1 - ENGINE_FOOTER_RATIO)
    width = engine_rect.width
    side = width * (1 - ENGINE_FOOTER_LOGO_WIDTH_RATIO) / 2
    return fitz.Rect(side, footer_top, width - side, engine_rect.height)


def _contain_rect(zone: fitz.Rect, img_w: float, img_h: float) -> fitz.Rect:
    """Sous-rectangle de ``zone`` respectant le ratio du logo (contain, centré)."""
    if img_w <= 0 or img_h <= 0 or zone.width <= 0 or zone.height <= 0:
        return zone
    scale = min(zone.width / img_w, zone.height / img_h)
    draw_w = img_w * scale
    draw_h = img_h * scale
    x0 = zone.x0 + (zone.width - draw_w) / 2
    y0 = zone.y0 + (zone.height - draw_h) / 2
    return fitz.Rect(x0, y0, x0 + draw_w, y0 + draw_h)


def _parse_crosspage_stub(
    crosspage_stub: dict | None,
) -> tuple[str | None, float | None]:
    """(direction, midX%) du prolongement inter-pages D2↔F, ou (None, None)."""
    if not crosspage_stub:
        return None, None
    direction = crosspage_stub.get("dir")
    if direction not in ("up", "down"):
        return None, None
    try:
        midx = float(crosspage_stub.get("midx"))
    except (TypeError, ValueError):
        return None, None
    if not 0.0 <= midx <= 100.0:
        return None, None
    return direction, midx


def composer_page_export(
    page: fitz.Page,
    source: fitz.Document,
    slide_index: int,
    capture_data: str,
    *,
    section: str = "main",
    footer_slide_index: int | None = None,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
    crosspage_stub: dict | None = None,
) -> None:
    """Fond blanc + bandeaux Engine (slide courante) + capture Manager."""
    rect = page.rect
    header_h = rect.height * ENGINE_HEADER_RATIO
    footer_h = rect.height * ENGINE_FOOTER_RATIO
    margin = FOOTER_BOTTOM_MARGIN_PT
    footer_dest = fitz.Rect(
        rect.x0,
        rect.y1 - margin - footer_h,
        rect.x1,
        rect.y1 - margin,
    )
    content_rect = fitz.Rect(
        rect.x0,
        rect.y0 + header_h,
        rect.x1,
        footer_dest.y0,
    )

    stub_dir, stub_midx = _parse_crosspage_stub(crosspage_stub)

    page.draw_rect(rect, color=None, fill=(1, 1, 1), overlay=False)
    page.draw_rect(
        fitz.Rect(rect.x0, rect.y1 - margin, rect.x1, rect.y1),
        color=None,
        fill=(1, 1, 1),
        overlay=False,
    )

    if slide_index < 0 or slide_index >= source.page_count:
        raise RuntimeError(f"Page Engine introuvable pour l'index {slide_index}.")

    footer_index = footer_slide_index if footer_slide_index is not None else slide_index
    if footer_index < 0 or footer_index >= source.page_count:
        footer_index = slide_index

    engine_page = source[slide_index]
    engine_rect = engine_page.rect
    header_clip = fitz.Rect(
        0, 0, engine_rect.width, engine_rect.height * ENGINE_HEADER_RATIO
    )
    header_dest = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + header_h)
    if stub_dir == "up":
        # Partie basse d'un tableau sur deux feuilles : la bande haute Engine ne
        # contient pas de titre mais le calque du tableau (boîte H5). On la
        # laisse blanche ; le connecteur D2→F sera prolongé jusqu'au bord haut.
        page.draw_rect(header_dest, color=None, fill=(1, 1, 1), overlay=False)
    else:
        _fit_pdf_clip(page, source, slide_index, header_clip, header_dest)

    footer_dest = fitz.Rect(rect.x0, rect.y1 - margin - footer_h, rect.x1, rect.y1 - margin)
    if logo_bytes and logo_wh:
        # Logo de session (bon ratio, identique au live) : couvre le pied Engine
        # (ex. calque « score: » des tours préliminaires) et reste homogène.
        page.draw_rect(footer_dest, color=None, fill=(1, 1, 1), overlay=False)
        dest = _contain_rect(footer_dest, logo_wh[0], logo_wh[1])
        dest = fitz.Rect(
            dest.x0,
            footer_dest.y1 - dest.height,
            dest.x1,
            footer_dest.y1,
        )
        if dest.width < footer_dest.width:
            shift = (footer_dest.width - dest.width) / 2
            dest = fitz.Rect(
                footer_dest.x0 + shift,
                dest.y0,
                footer_dest.x0 + shift + dest.width,
                dest.y1,
            )
        page.insert_image(dest, stream=logo_bytes, keep_proportion=True)
    else:
        footer_engine_page = source[footer_index]
        footer_engine_rect = footer_engine_page.rect
        footer_clip = _footer_logo_clip(footer_engine_rect)
        _fit_pdf_clip(page, source, footer_index, footer_clip, footer_dest)

    page.draw_rect(content_rect, color=None, fill=(1, 1, 1), overlay=False)

    image_bytes = _decode_capture(capture_data)
    if len(image_bytes) < 4096:
        raise RuntimeError("Capture Manager trop petite ou vide.")

    filetype = "jpeg" if image_bytes[:2] == b"\xff\xd8" else "png"
    image = fitz.open(stream=image_bytes, filetype=filetype)
    try:
        image_rect = image[0].rect
        image_w = float(image_rect.width)
        image_h = float(image_rect.height)
        if image_w <= 0 or image_h <= 0:
            raise RuntimeError("Capture Manager invalide.")

        side_margin = (
            TABLE_SIDE_MARGIN_PT
            if section in ("planning", "main", "classement", "pools")
            else 0.0
        )
        avail_w = max(40.0, content_rect.width - 2 * side_margin)
        scale = avail_w / image_w
        if section == "final":
            max_draw_w = narrow_table_width_pt(avail_w)
            scale = min(scale, max_draw_w / image_w)

        draw_h = image_h * scale
        if draw_h > content_rect.height:
            scale = content_rect.height / image_h
            draw_h = content_rect.height
        draw_w = image_w * scale
        x0 = content_rect.x0 + side_margin + (avail_w - draw_w) / 2
        y0 = content_rect.y0 + (content_rect.height - draw_h) / 2
        page.insert_image(
            fitz.Rect(x0, y0, x0 + draw_w, y0 + draw_h),
            stream=image_bytes,
            keep_proportion=True,
        )

        if y0 > content_rect.y0 + 0.5:
            page.draw_rect(
                fitz.Rect(content_rect.x0, content_rect.y0, content_rect.x1, y0),
                color=None,
                fill=(1, 1, 1),
                overlay=False,
            )

        gap_top = y0 + draw_h
        if gap_top < content_rect.y1 - 0.5:
            page.draw_rect(
                fitz.Rect(content_rect.x0, gap_top, content_rect.x1, content_rect.y1),
                color=None,
                fill=(1, 1, 1),
                overlay=False,
            )

        # Prolongement du connecteur inter-pages D2↔F jusqu'au bord de la feuille
        # (tableau principal sur deux pages), pour la continuité une fois les
        # deux feuilles assemblées. La capture s'arrête au bord de son encart :
        # on complète dans la bande haute (partie basse) ou basse (partie haute).
        if stub_dir and stub_midx is not None and draw_w > 0:
            x = x0 + draw_w * stub_midx / 100.0
            stroke = max(0.4, draw_w * 0.0008)
            color = (0.0, 176 / 255.0, 240 / 255.0)
            # Petit chevauchement dans la capture (même axe, même couleur, donc
            # invisible) pour combler tout arrondi à la jonction bande↔capture.
            overlap = max(4.0, draw_h * 0.02)
            if stub_dir == "up":
                page.draw_line(
                    fitz.Point(x, rect.y0),
                    fitz.Point(x, y0 + overlap),
                    color=color,
                    width=stroke,
                )
            else:  # down : partie haute → prolonge vers le bas
                page.draw_line(
                    fitz.Point(x, y0 + draw_h - overlap),
                    fitz.Point(x, rect.y1),
                    color=color,
                    width=stroke,
                )
    finally:
        image.close()


def capture_key(section: str, slide_index: int) -> str:
    return f"{section}:{slide_index}"

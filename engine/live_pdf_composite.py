"""Composition PDF export : entête Engine + capture écran sur fond blanc."""

from __future__ import annotations

import base64

import fitz

ENGINE_HEADER_RATIO = 0.083
ENGINE_FOOTER_RATIO = 0.042
ENGINE_FOOTER_LOGO_WIDTH_RATIO = 1 / 3
FINAL_TOP_GAP_RATIO = 0.028
FINAL_IMAGE_MAX_WIDTH_RATIO = 0.72


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


def composer_page_export(
    page: fitz.Page,
    source: fitz.Document,
    slide_index: int,
    capture_data: str,
    *,
    section: str = "main",
) -> None:
    """Fond blanc + bandeaux Engine (slide courante) + capture Manager."""
    rect = page.rect
    header_h = rect.height * ENGINE_HEADER_RATIO
    footer_h = rect.height * ENGINE_FOOTER_RATIO
    top_gap = rect.height * FINAL_TOP_GAP_RATIO if section == "final" else 0
    content_rect = fitz.Rect(
        rect.x0,
        rect.y0 + header_h + top_gap,
        rect.x1,
        rect.y1 - footer_h,
    )

    page.draw_rect(rect, color=None, fill=(1, 1, 1), overlay=False)

    if slide_index < 0 or slide_index >= source.page_count:
        raise RuntimeError(f"Page Engine introuvable pour l'index {slide_index}.")

    engine_page = source[slide_index]
    engine_rect = engine_page.rect
    header_clip = fitz.Rect(
        0, 0, engine_rect.width, engine_rect.height * ENGINE_HEADER_RATIO
    )
    header_dest = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + header_h)
    _fit_pdf_clip(page, source, slide_index, header_clip, header_dest)

    footer_clip = _footer_logo_clip(engine_rect)
    footer_dest = fitz.Rect(rect.x0, rect.y1 - footer_h, rect.x1, rect.y1)
    _fit_pdf_clip(page, source, slide_index, footer_clip, footer_dest)

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

        scale = content_rect.width / image_w
        if section == "final":
            max_draw_w = content_rect.width * FINAL_IMAGE_MAX_WIDTH_RATIO
            scale = min(scale, max_draw_w / image_w)

        draw_h = image_h * scale
        if draw_h > content_rect.height:
            scale = content_rect.height / image_h
            draw_h = content_rect.height
        draw_w = image_w * scale
        x0 = content_rect.x0 + (content_rect.width - draw_w) / 2
        y0 = content_rect.y0
        page.insert_image(
            fitz.Rect(x0, y0, x0 + draw_w, y0 + draw_h),
            stream=image_bytes,
            keep_proportion=True,
        )

        gap_top = y0 + draw_h
        if gap_top < content_rect.y1 - 0.5:
            page.draw_rect(
                fitz.Rect(content_rect.x0, gap_top, content_rect.x1, content_rect.y1),
                color=None,
                fill=(1, 1, 1),
                overlay=False,
            )
    finally:
        image.close()


def capture_key(section: str, slide_index: int) -> str:
    return f"{section}:{slide_index}"

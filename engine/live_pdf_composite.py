"""Composition PDF export : entête Engine + capture écran sur fond blanc."""

from __future__ import annotations

import base64

import fitz

ENGINE_HEADER_RATIO = 0.083


def _decode_capture(data: str) -> bytes:
    if data.startswith("data:"):
        _, payload = data.split(",", 1)
        return base64.b64decode(payload)
    return base64.b64decode(data)


def composer_page_export(
    page: fitz.Page,
    source: fitz.Document,
    slide_index: int,
    capture_data: str,
) -> None:
    """Fond blanc + bandeau Engine + capture Manager collée en dessous."""
    rect = page.rect
    header_h = rect.height * ENGINE_HEADER_RATIO
    content_rect = fitz.Rect(rect.x0, rect.y0 + header_h, rect.x1, rect.y1)

    page.draw_rect(rect, color=None, fill=(1, 1, 1), overlay=False)

    engine_page = source[slide_index]
    engine_rect = engine_page.rect
    header_clip = fitz.Rect(0, 0, engine_rect.width, engine_rect.height * ENGINE_HEADER_RATIO)
    header_dest = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + header_h)
    page.show_pdf_page(header_dest, source, slide_index, clip=header_clip)

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
    finally:
        image.close()


def capture_key(section: str, slide_index: int) -> str:
    return f"{section}:{slide_index}"

"""Composition PDF export : entête Engine + capture Manager."""

from __future__ import annotations

import base64
import re

import fitz

TEMPLATE_BLUE = (0, 176, 240)
_HEADER_RATIO_FALLBACK = 0.083
_CONTENT_MARGIN_PT = 14


def _decode_capture(data: str) -> bytes:
    if data.startswith("data:"):
        _, payload = data.split(",", 1)
        return base64.b64decode(payload)
    return base64.b64decode(data)


def _is_template_blue(r: int, g: int, b: int, tolerance: int = 55) -> bool:
    return (
        abs(r - TEMPLATE_BLUE[0]) <= tolerance
        and abs(g - TEMPLATE_BLUE[1]) <= tolerance
        and abs(b - TEMPLATE_BLUE[2]) <= tolerance
    )


def detecter_hauteur_entete(page: fitz.Page) -> float:
    """Détecte la hauteur du bandeau bleu Engine en haut de page."""
    rect = page.rect
    pixmap = page.get_pixmap(dpi=96, alpha=False)
    width = pixmap.width
    height = pixmap.height
    max_scan = max(12, int(height * 0.14))
    sample_step = max(1, width // 48)

    for y in range(6, max_scan):
        blue_hits = 0
        samples = 0
        for x in range(0, width, sample_step):
            samples += 1
            pixel = pixmap.pixel(x, y)
            if _is_template_blue(pixel[0], pixel[1], pixel[2]):
                blue_hits += 1
        if samples and blue_hits / samples < 0.12:
            return (y / height) * rect.height

    return rect.height * _HEADER_RATIO_FALLBACK


def _fit_image_rect(
    image_width: float,
    image_height: float,
    area: fitz.Rect,
    margin: float = _CONTENT_MARGIN_PT,
) -> fitz.Rect:
    inner = fitz.Rect(
        area.x0 + margin,
        area.y0 + margin,
        area.x1 - margin,
        area.y1 - margin,
    )
    if inner.width <= 0 or inner.height <= 0:
        return inner

    scale = min(inner.width / image_width, inner.height / image_height)
    width = image_width * scale
    height = image_height * scale
    x0 = inner.x0 + (inner.width - width) / 2
    y0 = inner.y0 + (inner.height - height) / 2
    return fitz.Rect(x0, y0, x0 + width, y0 + height)


def composer_page_export(
    page: fitz.Page,
    source: fitz.Document,
    slide_index: int,
    capture_data: str,
) -> None:
    """Colle l'entête Engine + fond blanc + image Manager."""
    engine_page = source[slide_index]
    rect = page.rect
    header_h = detecter_hauteur_entete(engine_page)
    header_rect = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + header_h)
    content_rect = fitz.Rect(rect.x0, rect.y0 + header_h, rect.x1, rect.y1)

    page.draw_rect(rect, color=None, fill=(1, 1, 1), overlay=False)

    engine_rect = engine_page.rect
    header_clip = fitz.Rect(0, 0, engine_rect.width, header_h)
    page.show_pdf_page(header_rect, source, slide_index, clip=header_clip)

    page.draw_rect(content_rect, color=None, fill=(1, 1, 1), overlay=False)

    image_bytes = _decode_capture(capture_data)
    filetype = "jpeg" if image_bytes[:2] == b"\xff\xd8" else "png"
    image = fitz.open(stream=image_bytes, filetype=filetype)
    try:
        pixmap = image[0].get_pixmap(alpha=True)
        fit_rect = _fit_image_rect(pixmap.width, pixmap.height, content_rect)
        page.insert_image(fit_rect, stream=image_bytes, keep_proportion=True)
    finally:
        image.close()


def capture_key(section: str, slide_index: int) -> str:
    return f"{section}:{slide_index}"

"""Composition PDF export : entête Engine + capture Manager."""

from __future__ import annotations

import base64

import fitz

TEMPLATE_BLUE = (0, 176, 240)
_HEADER_RATIO = 0.083
_CONTENT_MARGIN_PT = 0


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
    """Hauteur du bandeau bleu Engine (titre de section uniquement)."""
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

    return rect.height * _HEADER_RATIO


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
    y0 = inner.y0
    return fitz.Rect(x0, y0, x0 + width, y0 + height)


def composer_page_export(
    page: fitz.Page,
    source: fitz.Document,
    slide_index: int,
    capture_data: str,
) -> None:
    """Entête Engine + fond blanc + image Manager (sans le reste de la page Engine)."""
    engine_page = source[slide_index]
    rect = page.rect
    detected = detecter_hauteur_entete(engine_page)
    header_h = min(max(detected, rect.height * 0.055), rect.height * 0.11)
    header_rect = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y0 + header_h)
    content_rect = fitz.Rect(rect.x0, rect.y0 + header_h, rect.x1, rect.y1)

    page.draw_rect(rect, color=None, fill=(1, 1, 1), overlay=False)

    engine_rect = engine_page.rect
    header_clip = fitz.Rect(0, 0, engine_rect.width, header_h)
    page.show_pdf_page(header_rect, source, slide_index, clip=header_clip)

    page.draw_rect(content_rect, color=None, fill=(1, 1, 1), overlay=False)
    page.add_redact_annot(content_rect, fill=(1, 1, 1))
    page.apply_redactions()

    image_bytes = _decode_capture(capture_data)
    if len(image_bytes) < 4096:
        raise RuntimeError("Capture Manager trop petite ou vide.")

    if image_bytes[:2] == b"\xff\xd8":
        filetype = "jpeg"
    else:
        filetype = "png"

    image = fitz.open(stream=image_bytes, filetype=filetype)
    try:
        page_w = float(image[0].rect.width)
        page_h = float(image[0].rect.height)
        if page_w <= 0 or page_h <= 0:
            raise RuntimeError("Capture Manager invalide.")

        fit_rect = _fit_image_rect(page_w, page_h, content_rect, _CONTENT_MARGIN_PT)
        page.insert_image(fit_rect, stream=image_bytes, keep_proportion=True)
    finally:
        image.close()


def capture_key(section: str, slide_index: int) -> str:
    return f"{section}:{slide_index}"

"""Composition PDF export : entête Engine + capture écran sur fond blanc."""

from __future__ import annotations

import base64

import fitz

ENGINE_HEADER_RATIO = 0.083
FINAL_TOP_GAP_RATIO = 0.028
FINAL_IMAGE_MAX_WIDTH_RATIO = 0.72


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
    *,
    section: str = "main",
) -> None:
    """Fond blanc + bandeau Engine + capture Manager (contain, centrée)."""
    rect = page.rect
    header_h = rect.height * ENGINE_HEADER_RATIO
    top_gap = rect.height * FINAL_TOP_GAP_RATIO if section == "final" else 0
    content_rect = fitz.Rect(
        rect.x0,
        rect.y0 + header_h + top_gap,
        rect.x1,
        rect.y1,
    )

    page.draw_rect(rect, color=None, fill=(1, 1, 1), overlay=False)

    engine_page = source[slide_index]
    engine_rect = engine_page.rect
    header_clip = fitz.Rect(
        0, 0, engine_rect.width, engine_rect.height * ENGINE_HEADER_RATIO
    )
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

        scale = min(content_rect.width / image_w, content_rect.height / image_h)
        if section == "final":
            max_draw_w = content_rect.width * FINAL_IMAGE_MAX_WIDTH_RATIO
            scale = min(scale, max_draw_w / image_w)

        draw_w = image_w * scale
        draw_h = image_h * scale
        x0 = content_rect.x0 + (content_rect.width - draw_w) / 2
        y0 = content_rect.y0 + (content_rect.height - draw_h) / 2
        page.insert_image(
            fitz.Rect(x0, y0, x0 + draw_w, y0 + draw_h),
            stream=image_bytes,
            keep_proportion=True,
        )
    finally:
        image.close()


def capture_key(section: str, slide_index: int) -> str:
    return f"{section}:{slide_index}"

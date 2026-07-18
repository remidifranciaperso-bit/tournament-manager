"""Stub inter-pages D2↔F (tableau principal scindé) — port Live + dessin marges PDF."""

from __future__ import annotations

import fitz

from engine.live_bracket_box_layout import infer_split_main_bracket_half
from engine.live_bracket_connectors import (
    _child_inlet,
    _connector_mid_x,
    _parent_outlet,
)

TEMPLATE_BLUE = (0.0, 176 / 255.0, 240 / 255.0)


def compute_viewport_cross_page_stub(
    slots: list[dict],
    box_layouts: dict[str, dict],
) -> dict[str, float | str] | None:
    """Métadonnées du prolongement inter-pages (équivalent ``getViewportCrossPageStub``)."""
    slide_codes = {slot["code"] for slot in slots}
    slide_half = infer_split_main_bracket_half(slide_codes, slide_codes)
    if not slide_half:
        return None

    d1 = box_layouts.get("D1")
    d2 = box_layouts.get("D2")
    f_box = box_layouts.get("F")

    if slide_half == "upper" and d1 and f_box:
        outlet_x, _ = _parent_outlet(d1)
        child_x, _ = _child_inlet(f_box)
        return {
            "dir": "down",
            "midx": _connector_mid_x(outlet_x, child_x),
        }

    if slide_half == "lower" and d2:
        outlet_x, _ = _parent_outlet(d2)
        return {
            "dir": "up",
            "midx": _connector_mid_x(outlet_x, d2["left"]),
        }

    return None


def draw_crosspage_margin_stub(
    page: fitz.Page,
    page_rect: fitz.Rect,
    content_rect: fitz.Rect,
    stub: dict[str, float | str] | None,
) -> None:
    """Prolonge le connecteur D2↔F dans la marge haute ou basse de la feuille."""
    if not stub:
        return

    direction = stub.get("dir")
    try:
        midx = float(stub["midx"])
    except (TypeError, ValueError, KeyError):
        return

    if direction not in ("up", "down") or not 0.0 <= midx <= 100.0:
        return

    draw_w = content_rect.width
    if draw_w <= 0:
        return

    x = content_rect.x0 + draw_w * midx / 100.0
    stroke = max(0.4, draw_w * 0.0008)
    overlap = max(4.0, content_rect.height * 0.02)

    if direction == "up":
        page.draw_line(
            fitz.Point(x, page_rect.y0),
            fitz.Point(x, content_rect.y0 + overlap),
            color=TEMPLATE_BLUE,
            width=stroke,
        )
    else:
        page.draw_line(
            fitz.Point(x, content_rect.y1 - overlap),
            fitz.Point(x, page_rect.y1),
            color=TEMPLATE_BLUE,
            width=stroke,
        )

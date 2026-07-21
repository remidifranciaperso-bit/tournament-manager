"""Rendu serveur des pages Manager pour l'export PDF (fiable, sans capture DOM)."""

from __future__ import annotations

import base64
import re
from pathlib import Path

import fitz

from engine.bracket_crosspage_stub import (
    compute_viewport_cross_page_stub,
    draw_crosspage_margin_stub,
)
from engine.live_bracket_box_layout import infer_split_main_bracket_half, resolve_match_box_layouts
from engine.live_bracket_connectors import build_bracket_connector_paths
from engine.live_bracket_layout import parse_bracket_slide
from engine.live_export_render_support import (
    draw_bracket_slide,
    draw_final_ranking,
)
from engine.live_render_pdf import charger_layout_slide

TEMPLATE_BLUE = (0, 176 / 255, 240 / 255)
WHITE = (1, 1, 1)
RENDER_DPI = 144


def _pct_point(x_pct: float, y_pct: float, area: fitz.Rect) -> fitz.Point:
    return fitz.Point(
        area.x0 + area.width * x_pct / 100,
        area.y0 + area.height * y_pct / 100,
    )


def _draw_connector_paths(
    page: fitz.Page,
    paths: list[list[tuple[float, float]]],
    area: fitz.Rect,
) -> None:
    stroke = max(0.4, area.width * 0.0008)
    for path in paths:
        if len(path) < 2:
            continue
        points = [_pct_point(x, y, area) for x, y in path]
        for index in range(len(points) - 1):
            page.draw_line(
                points[index],
                points[index + 1],
                color=TEMPLATE_BLUE,
                width=stroke,
                overlay=True,
            )


def render_bracket_into_area(
    page: fitz.Page,
    area: fitz.Rect,
    *,
    base_dir: Path,
    template_id: str,
    slide_index: int,
    matches: list[dict],
    match_results: dict[str, dict],
    show_placement_labels: bool,
    layout_fields: list[dict] | None = None,
    export_mode: bool = False,
) -> dict[str, float | str] | None:
    """Dessine connecteurs + encarts dans ``area`` (comme la capture Live)."""
    if layout_fields is None:
        layout_fields = charger_layout_slide(template_id, slide_index, base_dir)
    parsed = parse_bracket_slide(layout_fields)
    slots = parsed["matches"]
    include_feed_connectors = not (
        slots and all(re.match(r"^C[\d_]+$", slot["code"]) for slot in slots)
    )
    connector_paths = build_bracket_connector_paths(
        layout_fields,
        matches,
        include_feed_connectors=include_feed_connectors,
    )
    _draw_connector_paths(page, connector_paths, area)

    box_layouts = resolve_match_box_layouts(
        slots,
        match_codes={match["code"] for match in matches},
    )
    slide_codes = {slot["code"] for slot in slots}
    split_main_bracket = (
        infer_split_main_bracket_half(slide_codes, slide_codes) is not None
    )
    draw_bracket_slide(
        page,
        area,
        slots,
        parsed["feeds"],
        box_layouts,
        matches,
        match_results,
        show_placement_labels=show_placement_labels,
        base_dir=base_dir,
        split_main_bracket=split_main_bracket,
        export_mode=export_mode,
    )
    return compute_viewport_cross_page_stub(slots, box_layouts)


def render_bracket_slide_png(
    *,
    base_dir: Path,
    template_id: str,
    slide_index: int,
    matches: list[dict],
    match_results: dict[str, dict],
    show_placement_labels: bool,
    page_size: fitz.Rect,
) -> str:
    layout_fields = charger_layout_slide(template_id, slide_index, base_dir)
    width = page_size.width
    height = page_size.height

    doc = fitz.open()
    try:
        page = doc.new_page(width=width, height=height)
        page.draw_rect(
            page.rect,
            color=WHITE,
            fill=WHITE,
            width=0,
            overlay=False,
        )
        render_bracket_into_area(
            page,
            page.rect,
            base_dir=base_dir,
            template_id=template_id,
            slide_index=slide_index,
            matches=matches,
            match_results=match_results,
            show_placement_labels=show_placement_labels,
        )

        pixmap = page.get_pixmap(dpi=RENDER_DPI, alpha=False)
        png_bytes = pixmap.tobytes("png")
        encoded = base64.b64encode(png_bytes).decode("ascii")
        return f"data:image/png;base64,{encoded}"
    finally:
        doc.close()


def render_final_slide_png(
    *,
    base_dir: Path,
    matches: list[dict],
    match_results: dict[str, dict],
    fields: dict[str, str],
    nb_equipes: int,
    page_size: fitz.Rect,
) -> str:
    width = page_size.width
    height = page_size.height

    doc = fitz.open()
    try:
        page = doc.new_page(width=width, height=height)
        page.draw_rect(page.rect, color=WHITE, fill=WHITE, width=0, overlay=False)
        draw_final_ranking(
            page,
            page.rect,
            matches,
            match_results,
            fields,
            nb_equipes,
        )
        pixmap = page.get_pixmap(dpi=RENDER_DPI, alpha=False)
        png_bytes = pixmap.tobytes("png")
        encoded = base64.b64encode(png_bytes).decode("ascii")
        return f"data:image/png;base64,{encoded}"
    finally:
        doc.close()


def generer_captures_export(
    *,
    base_dir: Path,
    template_id: str,
    page_map: dict,
    matches: list[dict],
    match_results: dict[str, dict],
    fields: dict[str, str],
    nb_equipes: int,
    page_size: fitz.Rect,
) -> dict[str, str]:
    captures: dict[str, str] = {}

    for entry in page_map.get("main", []):
        slide_index = int(entry["index"])
        key = f"main:{slide_index}"
        captures[key] = render_bracket_slide_png(
            base_dir=base_dir,
            template_id=template_id,
            slide_index=slide_index,
            matches=matches,
            match_results=match_results,
            show_placement_labels=True,
            page_size=page_size,
        )

    for entry in page_map.get("classement", []):
        slide_index = int(entry["index"])
        key = f"classement:{slide_index}"
        captures[key] = render_bracket_slide_png(
            base_dir=base_dir,
            template_id=template_id,
            slide_index=slide_index,
            matches=matches,
            match_results=match_results,
            show_placement_labels=True,
            page_size=page_size,
        )

    for entry in page_map.get("final", []):
        slide_index = int(entry["index"])
        key = f"final:{slide_index}"
        captures[key] = render_final_slide_png(
            base_dir=base_dir,
            matches=matches,
            match_results=match_results,
            fields=fields,
            nb_equipes=nb_equipes,
            page_size=page_size,
        )

    return captures


__all__ = [
    "draw_crosspage_margin_stub",
    "render_bracket_into_area",
    "render_bracket_slide_png",
    "render_final_slide_png",
    "generer_captures_export",
]

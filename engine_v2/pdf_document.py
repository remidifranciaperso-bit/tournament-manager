"""Assemblage PDF multi-pages Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.bracket_crosspage_stub import draw_crosspage_margin_stub
from engine.live_export_render import render_bracket_into_area
from engine.live_render_pdf import render_final_page, render_planning_page
from engine.live_render_pdf import charger_layout_slide
from engine_v2.config import PAGE_HEIGHT_PT, PAGE_WIDTH_PT
from engine_v2.pages._layout import (
    content_area,
    draw_blank_header_band,
    draw_page_footer_logo,
    draw_page_header,
    overlay_page_chrome,
    prepare_content_page,
)
from engine_v2.pages.convocations import render_convocations_page
from engine_v2.pages.cover import render_cover_page
from engine_v2.pages.participants import render_participants_page


def _a4_rect() -> fitz.Rect:
    return fitz.Rect(0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT)


def _render_bracket_page(
    doc: fitz.Document,
    *,
    base_dir: Path,
    template_id: str,
    slide_index: int,
    matches: list[dict],
    match_results: dict,
    page_size: fitz.Rect,
    tournoi,
    title: str,
    logo_bytes: bytes | None,
    logo_wh: tuple[int, int] | None,
) -> None:
    from engine.bracket_crosspage_stub import compute_viewport_cross_page_stub
    from engine.live_bracket_box_layout import resolve_match_box_layouts
    from engine.live_bracket_layout import parse_bracket_slide

    layout_fields = charger_layout_slide(template_id, slide_index, base_dir)
    parsed = parse_bracket_slide(layout_fields)
    slots = parsed["matches"]
    box_layouts = resolve_match_box_layouts(
        slots,
        match_codes={match["code"] for match in matches},
    )
    stub = compute_viewport_cross_page_stub(slots, box_layouts)

    page = doc.new_page(width=page_size.width, height=page_size.height)
    prepare_content_page(page)

    if stub and stub.get("dir") == "up":
        draw_blank_header_band(page)
    else:
        draw_page_header(page, tournoi, title, base_dir=base_dir)

    area = content_area(page.rect)
    render_bracket_into_area(
        page,
        area,
        base_dir=base_dir,
        template_id=template_id,
        slide_index=slide_index,
        matches=matches,
        match_results=match_results,
        show_placement_labels=True,
        layout_fields=layout_fields,
    )

    draw_page_footer_logo(page, logo_bytes=logo_bytes, logo_wh=logo_wh)
    draw_crosspage_margin_stub(page, page.rect, area, stub)


def _section_title(entry: dict, default: str) -> str:
    label = (entry.get("label") or default).strip()
    return label.upper()


def build_tournament_pdf(
    *,
    base_dir: Path,
    tournoi,
    matchs: list,
    template_id: str,
    cache: dict,
    fields: dict[str, str],
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> fitz.Document:
    """Construit le document PDF complet (rendu Live, sans LibreOffice)."""
    page_size = _a4_rect()
    page_map = cache["page_map"]
    match_dicts = [
        {
            "ordre": m.ordre,
            "code": m.code,
            "tour": m.tour,
            "equipe1": m.equipe1_label(),
            "equipe2": m.equipe2_label(),
            "terrain": m.terrain,
            "heure": m.heure,
            "jour": getattr(m, "jour", 1),
            "ordre_planning": getattr(m, "ordre_planning", m.ordre),
            "parents": list(m.parents),
        }
        for m in matchs
    ]
    match_results: dict[str, dict] = {}

    doc = fitz.open()
    try:
        cover = doc.new_page(width=page_size.width, height=page_size.height)
        render_cover_page(
            cover,
            tournoi,
            base_dir=base_dir,
            logo_bytes=logo_bytes,
            logo_wh=logo_wh,
        )

        participants = doc.new_page(width=page_size.width, height=page_size.height)
        render_participants_page(
            participants,
            tournoi,
            base_dir=base_dir,
            logo_bytes=logo_bytes,
            logo_wh=logo_wh,
        )

        convocations = doc.new_page(width=page_size.width, height=page_size.height)
        render_convocations_page(
            convocations,
            tournoi,
            matchs,
            base_dir=base_dir,
            logo_bytes=logo_bytes,
            logo_wh=logo_wh,
        )

        for entry in page_map.get("main", []):
            slide_index = int(entry["index"])
            _render_bracket_page(
                doc,
                base_dir=base_dir,
                template_id=template_id,
                slide_index=slide_index,
                matches=match_dicts,
                match_results=match_results,
                page_size=page_size,
                tournoi=tournoi,
                title=_section_title(entry, "Tableau principal"),
                logo_bytes=logo_bytes,
                logo_wh=logo_wh,
            )

        for entry in page_map.get("classement", []):
            slide_index = int(entry["index"])
            _render_bracket_page(
                doc,
                base_dir=base_dir,
                template_id=template_id,
                slide_index=slide_index,
                matches=match_dicts,
                match_results=match_results,
                page_size=page_size,
                tournoi=tournoi,
                title=_section_title(entry, "Matchs classement"),
                logo_bytes=logo_bytes,
                logo_wh=logo_wh,
            )

        planning_layout = cache.get("planning_layout") or {}
        for entry in page_map.get("planning", []):
            slide_index = int(entry["index"])
            layout_key = str(slide_index)
            layout_fields = planning_layout.get(layout_key)
            if not layout_fields:
                layout_fields = charger_layout_slide(template_id, slide_index, base_dir)
            page = doc.new_page(width=page_size.width, height=page_size.height)
            render_planning_page(
                page,
                layout_fields,
                match_dicts,
                completed=[],
                match_results=match_results,
                title=entry.get("label") or "Planning",
                base_dir=base_dir,
            )
            overlay_page_chrome(
                page,
                tournoi,
                _section_title(entry, "Planning"),
                base_dir=base_dir,
                logo_bytes=logo_bytes,
                logo_wh=logo_wh,
            )

        for entry in page_map.get("final", []):
            page = doc.new_page(width=page_size.width, height=page_size.height)
            render_final_page(
                page,
                match_dicts,
                match_results,
                fields,
                tournoi.nb_equipes,
                title=entry.get("label") or "Classement final",
                base_dir=base_dir,
            )
            overlay_page_chrome(
                page,
                tournoi,
                _section_title(entry, "Classement final"),
                base_dir=base_dir,
                logo_bytes=logo_bytes,
                logo_wh=logo_wh,
            )

        if doc.page_count == 0:
            raise RuntimeError("PDF Engine V2 vide.")
        return doc
    except Exception:
        doc.close()
        raise

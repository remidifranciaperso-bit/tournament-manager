"""Assemblage PDF multi-pages Engine V2."""

from __future__ import annotations

import math
from pathlib import Path

import fitz

from engine.bracket_crosspage_stub import draw_crosspage_margin_stub
from engine.pdf_titles import pdf_header_title
from engine.live_export_render import render_bracket_into_area
from engine.live_export_render_support import draw_final_ranking, draw_planning_table
from engine.live_render_pdf import charger_layout_slide
from engine_v2.config import PAGE_HEIGHT_PT, PAGE_WIDTH_PT, SLIDE_ASPECT
from engine_v2.pages._layout import (
    content_area,
    draw_blank_header_band,
    draw_page_footer_logo,
    draw_page_header,
    prepare_content_page,
)
from engine_v2.pages.convocations import render_convocations_page
from engine_v2.pages.cover import render_cover_page
from engine_v2.pages.participants import render_participants_page


def _a4_rect() -> fitz.Rect:
    return fitz.Rect(0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT)


def _live_bracket_area(content: fitz.Rect) -> fitz.Rect:
    """Zone slide Live (ratio template) — comme capture export puis scale dans le contenu."""
    draw_h = content.width / SLIDE_ASPECT
    if draw_h > content.height:
        draw_w = content.height * SLIDE_ASPECT
        x0 = content.x0 + (content.width - draw_w) / 2
        return fitz.Rect(x0, content.y0, x0 + draw_w, content.y1)
    return fitz.Rect(content.x0, content.y0, content.x1, content.y0 + draw_h)


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
    elif (title or "").strip():
        draw_page_header(page, tournoi, title, base_dir=base_dir)
    else:
        draw_page_header(page, tournoi, "", base_dir=base_dir)

    content = content_area(page.rect)
    bracket_area = _live_bracket_area(content)
    render_bracket_into_area(
        page,
        bracket_area,
        base_dir=base_dir,
        template_id=template_id,
        slide_index=slide_index,
        matches=matches,
        match_results=match_results,
        show_placement_labels=True,
        layout_fields=layout_fields,
    )

    if bracket_area.y1 < content.y1 - 0.5:
        page.draw_rect(
            fitz.Rect(content.x0, bracket_area.y1, content.x1, content.y1),
            color=None,
            fill=(1, 1, 1),
            overlay=False,
        )

    draw_page_footer_logo(page, logo_bytes=logo_bytes, logo_wh=logo_wh)
    draw_crosspage_margin_stub(page, page.rect, bracket_area, stub)


def _section_title(entry: dict, default: str) -> str:
    return pdf_header_title(entry.get("label"), default)


def _final_place_range(
    nb_equipes: int,
    page_index: int,
    page_count: int,
) -> tuple[int, int]:
    chunk = max(1, math.ceil(nb_equipes / max(page_count, 1)))
    start = page_index * chunk + 1
    end = min(nb_equipes, (page_index + 1) * chunk)
    return start, end


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
            prepare_content_page(page)
            draw_page_header(
                page,
                tournoi,
                _section_title(entry, "Planning"),
                base_dir=base_dir,
            )
            draw_planning_table(
                page,
                content_area(page.rect),
                layout_fields,
                match_dicts,
                match_results,
                base_dir=base_dir,
                export_mode=True,
            )
            draw_page_footer_logo(page, logo_bytes=logo_bytes, logo_wh=logo_wh)

        final_entries = page_map.get("final", [])
        final_page_count = max(1, len(final_entries))
        for page_index, entry in enumerate(final_entries):
            page = doc.new_page(width=page_size.width, height=page_size.height)
            prepare_content_page(page)
            draw_page_header(
                page,
                tournoi,
                _section_title(entry, "Classement final"),
                base_dir=base_dir,
            )
            place_range = (
                _final_place_range(tournoi.nb_equipes, page_index, final_page_count)
                if final_page_count > 1
                else None
            )
            draw_final_ranking(
                page,
                content_area(page.rect),
                match_dicts,
                match_results,
                fields,
                tournoi.nb_equipes,
                base_dir=base_dir,
                place_range=place_range,
            )
            draw_page_footer_logo(page, logo_bytes=logo_bytes, logo_wh=logo_wh)

        if doc.page_count == 0:
            raise RuntimeError("PDF Engine V2 vide.")
        return doc
    except Exception:
        doc.close()
        raise

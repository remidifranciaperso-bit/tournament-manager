"""Assemblage PDF multi-pages Engine V2."""

from __future__ import annotations

import base64
from pathlib import Path

import fitz

from engine.live_export_render import render_bracket_slide_png
from engine.live_render_pdf import render_final_page, render_planning_page
from engine.live_render_pdf import charger_layout_slide
from engine_v2.config import PAGE_HEIGHT_PT, PAGE_WIDTH_PT
from engine_v2.pages.convocations import render_convocations_page
from engine_v2.pages.cover import render_cover_page
from engine_v2.pages.participants import render_participants_page


def _page_size_from_cache(cache: dict) -> fitz.Rect:
    sizes = cache.get("page_sizes") or {}
    if sizes:
        first = next(iter(sizes.values()))
        return fitz.Rect(0, 0, float(first["width"]), float(first["height"]))
    return fitz.Rect(0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT)


def _insert_png_page(doc: fitz.Document, png_data: str, page_size: fitz.Rect) -> None:
    payload = png_data.split(",", 1)[-1] if png_data.startswith("data:") else png_data
    raw = base64.b64decode(payload)
    page = doc.new_page(width=page_size.width, height=page_size.height)
    page.insert_image(page.rect, stream=raw, keep_proportion=False)


def _render_bracket_page_direct(
    doc: fitz.Document,
    *,
    base_dir: Path,
    template_id: str,
    slide_index: int,
    matches: list[dict],
    match_results: dict,
    show_placement_labels: bool,
    page_size: fitz.Rect,
) -> None:
    png = render_bracket_slide_png(
        base_dir=base_dir,
        template_id=template_id,
        slide_index=slide_index,
        matches=matches,
        match_results=match_results,
        show_placement_labels=show_placement_labels,
        page_size=page_size,
    )
    _insert_png_page(doc, png, page_size)


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
    page_size = _page_size_from_cache(cache)
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
        render_participants_page(participants, tournoi, base_dir=base_dir)

        convocations = doc.new_page(width=page_size.width, height=page_size.height)
        render_convocations_page(
            convocations,
            tournoi,
            matchs,
            base_dir=base_dir,
        )

        for entry in page_map.get("main", []):
            slide_index = int(entry["index"])
            _render_bracket_page_direct(
                doc,
                base_dir=base_dir,
                template_id=template_id,
                slide_index=slide_index,
                matches=match_dicts,
                match_results=match_results,
                show_placement_labels=True,
                page_size=page_size,
            )

        for entry in page_map.get("classement", []):
            slide_index = int(entry["index"])
            _render_bracket_page_direct(
                doc,
                base_dir=base_dir,
                template_id=template_id,
                slide_index=slide_index,
                matches=match_dicts,
                match_results=match_results,
                show_placement_labels=True,
                page_size=page_size,
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

        if doc.page_count == 0:
            raise RuntimeError("PDF Engine V2 vide.")
        return doc
    except Exception:
        doc.close()
        raise

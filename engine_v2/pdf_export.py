"""Export PDF Engine V2 — même composite Live + pages statiques V2."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

from engine.live_participants import trouver_indices_participants
from engine.live_pdf_composite import (
    capture_key,
    composer_page_export,
    composer_page_planning_native,
)
from engine.live_pdf_export import _charger_logo, _footer_reference_slide_index

_CONVOCATION_RE = re.compile(r"CONVOCATION", re.IGNORECASE)


def trouver_indices_convocations(pdf_path: Path) -> list[int]:
    doc = fitz.open(str(pdf_path))
    indices: list[int] = []
    try:
        for index in range(doc.page_count):
            text = doc[index].get_text("text")
            if _CONVOCATION_RE.search(text):
                indices.append(index)
    finally:
        doc.close()
    return indices


def exporter_pdf_engine_v2(
    source_pdf: Path,
    output_pdf: Path,
    *,
    page_map: dict,
    captures: dict[str, str],
    logo_path: Path | None = None,
    crosspage_stubs: dict[str, dict] | None = None,
    snapshot: dict | None = None,
    base_dir: Path | None = None,
) -> None:
    """
    Assemble le PDF final Engine V2.

    Identique à l'export Manager Live (captures + composite), avec en plus
    les pages convocations V2 insérées après les participants.
    """
    source = fitz.open(str(source_pdf))
    merged = fitz.open()
    logo_bytes, logo_wh = _charger_logo(logo_path)

    try:
        if source.page_count == 0:
            raise RuntimeError("PDF coquille V2 vide.")

        page_rect = source[0].rect

        merged.insert_pdf(source, from_page=0, to_page=0)

        for index in trouver_indices_participants(source_pdf):
            if 0 < index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)

        for index in trouver_indices_convocations(source_pdf):
            if 0 < index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)

        footer_reference = _footer_reference_slide_index(page_map, source)
        planning_layout = (snapshot or {}).get("planning_layout") or {}
        matches = (snapshot or {}).get("matches") or []
        match_results = (snapshot or {}).get("match_results") or {}
        club_name = ((snapshot or {}).get("meta") or {}).get("club")
        render_base = base_dir or Path(__file__).resolve().parent.parent

        for key, capture_data in captures.items():
            if not key.startswith("composition:") or not capture_data:
                continue
            try:
                comp_index = int(key.split(":", 1)[1])
            except (ValueError, IndexError):
                continue
            if comp_index < 0 or comp_index >= source.page_count:
                continue
            page = merged.new_page(width=page_rect.width, height=page_rect.height)
            composer_page_export(
                page,
                source,
                comp_index,
                capture_data,
                section="main",
                logo_bytes=logo_bytes,
                logo_wh=logo_wh,
                club_name=club_name,
                base_dir=render_base,
            )

        for section in ("main", "classement", "planning", "final"):
            for entry in page_map.get(section, []):
                slide_index = int(entry["index"])
                key = capture_key(section, slide_index)
                capture_data = captures.get(key)

                if slide_index < 0 or slide_index >= source.page_count:
                    raise RuntimeError(
                        f"Page coquille introuvable pour l'index {slide_index}."
                    )

                layout_fields = planning_layout.get(str(slide_index))
                if section == "planning" and layout_fields:
                    page = merged.new_page(width=page_rect.width, height=page_rect.height)
                    composer_page_planning_native(
                        page,
                        source,
                        slide_index,
                        layout_fields,
                        matches,
                        match_results,
                        base_dir=render_base,
                        footer_slide_index=footer_reference,
                        logo_bytes=logo_bytes,
                        logo_wh=logo_wh,
                        club_name=club_name,
                    )
                    continue

                if not capture_data:
                    merged.insert_pdf(
                        source, from_page=slide_index, to_page=slide_index
                    )
                    continue

                page = merged.new_page(width=page_rect.width, height=page_rect.height)
                composer_page_export(
                    page,
                    source,
                    slide_index,
                    capture_data,
                    section=section,
                    footer_slide_index=(
                        footer_reference if section == "planning" else None
                    ),
                    logo_bytes=logo_bytes,
                    logo_wh=logo_wh,
                    club_name=club_name,
                    base_dir=render_base,
                    crosspage_stub=(crosspage_stubs or {}).get(key),
                )

        if merged.page_count == 0:
            raise RuntimeError("Aucune page dans l'export V2.")

        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        merged.save(str(output_pdf), garbage=4, deflate=True)
    finally:
        merged.close()
        source.close()

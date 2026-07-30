"""Export PDF Engine V2 — même composite Live + pages statiques V2."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

from engine.live_participants import trouver_indices_participants
from engine.live_pdf_composite import (
    capture_key,
    composer_page_bracket_native,
    composer_page_export,
    composer_page_planning_native,
    composer_page_pool_composition_native,
    composer_page_pool_native,
)
from engine.live_pdf_export import _charger_logo, _footer_reference_slide_index
_CONVOCATION_RE = re.compile(r"CONVOCATION", re.IGNORECASE)


def _pool_export_context(
    template_id: str | None,
    base_dir: Path,
    meta: dict | None = None,
) -> tuple[dict[int, str], int | None]:
    snapshot_meta = meta if isinstance(meta, dict) else {}
    raw_letters = snapshot_meta.get("pool_slide_letters")
    if isinstance(raw_letters, dict) and raw_letters:
        letters = {int(key): str(value) for key, value in raw_letters.items()}
        comp_raw = snapshot_meta.get("composition_slide_index")
        composition_index = int(comp_raw) if comp_raw is not None else None
        return letters, composition_index

    if not template_id:
        return {}, None
    try:
        from engine.live_pool_layout import (
            charger_layout_template,
            composition_slide_index_from_layout,
            pool_slide_letters_from_layout,
        )

        layout = charger_layout_template(template_id, base_dir)
        return (
            pool_slide_letters_from_layout(layout),
            composition_slide_index_from_layout(layout),
        )
    except FileNotFoundError:
        return {}, None


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
    native_bracket_sections: frozenset[str] | None = None,
    match_dicts: list[dict] | None = None,
    template_id: str | None = None,
    native_planning: bool = False,
    planning_layout: dict | None = None,
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
        render_base = base_dir or Path(__file__).resolve().parent.parent

        # Garde : page 0 de la coquille (méta complètes à la génération), comme export Live V1.
        merged.insert_pdf(source, from_page=0, to_page=0)

        for index in trouver_indices_participants(source_pdf):
            if 0 < index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)

        for index in trouver_indices_convocations(source_pdf):
            if 0 < index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)

        footer_reference = _footer_reference_slide_index(page_map, source)
        meta = (snapshot or {}).get("meta") or {}
        club_name = meta.get("club")
        pool_slide_letters, composition_index = _pool_export_context(
            template_id, render_base, meta
        )
        snapshot_fields = (snapshot or {}).get("fields") or {}
        export_match_results = (snapshot or {}).get("match_results") or {}

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

                if (
                    section == "main"
                    and composition_index is not None
                    and slide_index == composition_index
                    and captures.get(f"composition:{slide_index}")
                ):
                    continue

                pool_letter = (
                    pool_slide_letters.get(slide_index) if section == "main" else None
                )

                if pool_letter and section == "main":
                    page = merged.new_page(
                        width=page_rect.width, height=page_rect.height
                    )
                    if match_dicts is not None:
                        composer_page_pool_native(
                            page,
                            source,
                            slide_index,
                            pool_letter,
                            match_dicts,
                            export_match_results,
                            base_dir=render_base,
                            footer_slide_index=footer_reference,
                            logo_bytes=logo_bytes,
                            logo_wh=logo_wh,
                            club_name=club_name,
                        )
                    elif capture_data:
                        composer_page_export(
                            page,
                            source,
                            slide_index,
                            capture_data,
                            section="pools",
                            logo_bytes=logo_bytes,
                            logo_wh=logo_wh,
                            club_name=club_name,
                            base_dir=render_base,
                        )
                    elif 0 <= slide_index < source.page_count:
                        merged.insert_pdf(
                            source, from_page=slide_index, to_page=slide_index
                        )
                    continue

                if (
                    section == "main"
                    and composition_index is not None
                    and slide_index == composition_index
                ):
                    page = merged.new_page(
                        width=page_rect.width, height=page_rect.height
                    )
                    if native_bracket_sections and match_dicts is not None:
                        composer_page_pool_composition_native(
                            page,
                            source,
                            slide_index,
                            match_dicts,
                            snapshot_fields,
                            base_dir=render_base,
                            footer_slide_index=footer_reference,
                            logo_bytes=logo_bytes,
                            logo_wh=logo_wh,
                            club_name=club_name,
                        )
                    elif capture_data:
                        composer_page_export(
                            page,
                            source,
                            slide_index,
                            capture_data,
                            section="main",
                            logo_bytes=logo_bytes,
                            logo_wh=logo_wh,
                            club_name=club_name,
                            base_dir=render_base,
                        )
                    elif match_dicts is not None:
                        composer_page_pool_composition_native(
                            page,
                            source,
                            slide_index,
                            match_dicts,
                            snapshot_fields,
                            base_dir=render_base,
                            footer_slide_index=footer_reference,
                            logo_bytes=logo_bytes,
                            logo_wh=logo_wh,
                            club_name=club_name,
                        )
                    elif 0 <= slide_index < source.page_count:
                        merged.insert_pdf(
                            source, from_page=slide_index, to_page=slide_index
                        )
                    continue

                if (
                    native_bracket_sections
                    and section in native_bracket_sections
                    and section in ("main", "classement")
                    and match_dicts is not None
                    and template_id
                    and pool_letter is None
                    and not (
                        section == "main"
                        and composition_index is not None
                        and slide_index == composition_index
                    )
                ):
                    page = merged.new_page(
                        width=page_rect.width, height=page_rect.height
                    )
                    composer_page_bracket_native(
                        page,
                        source,
                        slide_index,
                        template_id=template_id,
                        matches=match_dicts,
                        match_results=export_match_results,
                        base_dir=render_base,
                        logo_bytes=logo_bytes,
                        logo_wh=logo_wh,
                        club_name=club_name,
                        crosspage_stub=(crosspage_stubs or {}).get(key),
                    )
                    continue

                if (
                    native_planning
                    and section == "planning"
                    and match_dicts is not None
                    and template_id
                ):
                    from engine.live_render_pdf import charger_layout_slide

                    layout_fields = (planning_layout or {}).get(str(slide_index))
                    if not layout_fields:
                        layout_fields = charger_layout_slide(
                            template_id, slide_index, render_base
                        )
                    page = merged.new_page(
                        width=page_rect.width, height=page_rect.height
                    )
                    composer_page_planning_native(
                        page,
                        source,
                        slide_index,
                        layout_fields,
                        match_dicts,
                        export_match_results,
                        base_dir=render_base,
                        footer_slide_index=footer_reference,
                        logo_bytes=logo_bytes,
                        logo_wh=logo_wh,
                        club_name=club_name,
                    )
                    continue

                if slide_index < 0 or slide_index >= source.page_count:
                    if not capture_data:
                        continue
                    raise RuntimeError(
                        f"Page coquille introuvable pour l'index {slide_index}."
                    )

                if not capture_data:
                    merged.insert_pdf(
                        source, from_page=slide_index, to_page=slide_index
                    )
                    continue

                page = merged.new_page(
                    width=page_rect.width, height=page_rect.height
                )
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

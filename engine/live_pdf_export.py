"""Export PDF tournoi Manager."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_participants import trouver_indices_participants
from engine.live_render_pdf import (
    SECTION_TITLES,
    charger_layout_slide,
    render_bracket_page,
    render_final_page,
    render_planning_page,
)


def exporter_pdf_tournoi_manager(
    source_pdf: Path,
    output_pdf: Path,
    base_dir: Path,
    *,
    template_id: str,
    page_map: dict,
    planning_layout: dict,
    matches: list[dict],
    match_results: dict[str, dict],
    completed: list[str],
    fields: dict[str, str],
    nb_equipes: int,
) -> None:
    source = fitz.open(str(source_pdf))
    merged = fitz.open()

    try:
        if source.page_count == 0:
            raise RuntimeError("PDF source vide.")

        page_rect = source[0].rect

        merged.insert_pdf(source, from_page=0, to_page=0)
        for index in trouver_indices_participants(source_pdf):
            if 0 < index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)

        for section in ("main", "classement", "planning", "final"):
            title = SECTION_TITLES[section]
            for entry in page_map.get(section, []):
                slide_index = int(entry["index"])
                page = merged.new_page(width=page_rect.width, height=page_rect.height)

                if section in ("main", "classement"):
                    layout_fields = charger_layout_slide(
                        template_id, slide_index, base_dir
                    )
                    render_bracket_page(
                        page,
                        layout_fields,
                        matches,
                        match_results,
                        title,
                        base_dir,
                        show_placement_labels=True,
                    )
                elif section == "planning":
                    layout_fields = planning_layout.get(str(slide_index), [])
                    if not layout_fields:
                        layout_fields = charger_layout_slide(
                            template_id, slide_index, base_dir
                        )
                    render_planning_page(
                        page,
                        layout_fields,
                        matches,
                        completed,
                        match_results,
                        title,
                        base_dir,
                    )
                else:
                    render_final_page(
                        page,
                        matches,
                        match_results,
                        fields,
                        nb_equipes,
                        title,
                        base_dir,
                    )

        if merged.page_count == 0:
            raise RuntimeError("Aucune page dans l'export.")

        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        merged.save(str(output_pdf), garbage=4, deflate=True)
    finally:
        merged.close()
        source.close()

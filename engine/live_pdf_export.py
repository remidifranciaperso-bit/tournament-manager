"""Export PDF tournoi Manager."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine.live_participants import trouver_indices_participants
from engine.live_pdf_composite import capture_key, composer_page_export


def exporter_pdf_tournoi_manager(
    source_pdf: Path,
    output_pdf: Path,
    *,
    page_map: dict,
    captures: dict[str, str],
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

        for section in ("main", "classement", "final"):
            for entry in page_map.get(section, []):
                slide_index = int(entry["index"])
                key = capture_key(section, slide_index)
                capture_data = captures.get(key)
                if not capture_data:
                    raise RuntimeError(
                        f"Capture Manager manquante pour la page {key}."
                    )

                if slide_index < 0 or slide_index >= source.page_count:
                    raise RuntimeError(
                        f"Page Engine introuvable pour l'index {slide_index}."
                    )

                page = merged.new_page(width=page_rect.width, height=page_rect.height)
                composer_page_export(
                    page,
                    source,
                    slide_index,
                    capture_data,
                    section,
                )

        if merged.page_count == 0:
            raise RuntimeError("Aucune page dans l'export.")

        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        merged.save(str(output_pdf), garbage=4, deflate=True)
    finally:
        merged.close()
        source.close()

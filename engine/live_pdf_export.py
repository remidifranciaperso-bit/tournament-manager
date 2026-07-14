"""Export PDF tournoi Manager."""

from __future__ import annotations

import re
from pathlib import Path

import fitz

from engine.live_participants import trouver_indices_participants
from engine.live_pdf_composite import capture_key, composer_page_export

_PRELIM_LABEL = re.compile(r"préliminaire|preliminaire", re.IGNORECASE)


def _footer_reference_slide_index(page_map: dict, source: fitz.Document) -> int:
    """Diapo Engine avec logo en pied (hors garde et planning)."""
    for entry in page_map.get("main", []):
        slide_index = int(entry["index"])
        if slide_index <= 0 or slide_index >= source.page_count:
            continue
        if _PRELIM_LABEL.search(entry.get("label", "")):
            continue
        return slide_index

    for section in ("main", "classement", "final"):
        for entry in page_map.get(section, []):
            slide_index = int(entry["index"])
            if slide_index > 0 and slide_index < source.page_count:
                return slide_index

    return min(1, max(0, source.page_count - 1))


def _charger_logo(logo_path: Path | None) -> tuple[bytes | None, tuple[int, int] | None]:
    """Charge le logo de session déjà préparé (bon ratio, identique au live)."""
    if logo_path is None:
        return None, None
    logo_path = Path(logo_path)
    if not logo_path.is_file():
        return None, None
    try:
        logo_bytes = logo_path.read_bytes()
        if len(logo_bytes) < 32:
            return None, None
        from PIL import Image

        with Image.open(logo_path) as img:
            return logo_bytes, (int(img.width), int(img.height))
    except Exception:
        return None, None


def exporter_pdf_tournoi_manager(
    source_pdf: Path,
    output_pdf: Path,
    *,
    page_map: dict,
    captures: dict[str, str],
    logo_path: Path | None = None,
    crosspage_stubs: dict[str, dict] | None = None,
) -> None:
    source = fitz.open(str(source_pdf))
    merged = fitz.open()

    logo_bytes, logo_wh = _charger_logo(logo_path)

    try:
        if source.page_count == 0:
            raise RuntimeError("PDF source vide.")

        page_rect = source[0].rect

        merged.insert_pdf(source, from_page=0, to_page=0)
        for index in trouver_indices_participants(source_pdf):
            if 0 < index < source.page_count:
                merged.insert_pdf(source, from_page=index, to_page=index)

        footer_reference = _footer_reference_slide_index(page_map, source)

        for section in ("main", "classement", "planning", "final"):
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
                    section=section,
                    footer_slide_index=(
                        footer_reference if section == "planning" else None
                    ),
                    logo_bytes=logo_bytes,
                    logo_wh=logo_wh,
                    crosspage_stub=(crosspage_stubs or {}).get(key),
                )

        if merged.page_count == 0:
            raise RuntimeError("Aucune page dans l'export.")

        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        merged.save(str(output_pdf), garbage=4, deflate=True)
    finally:
        merged.close()
        source.close()

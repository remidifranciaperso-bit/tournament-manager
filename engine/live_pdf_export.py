"""Export PDF tournoi live : couverture Engine + pages sélectionnées + titres brush bleu."""

from __future__ import annotations

from pathlib import Path

import fitz

BRUSH_BLUE = (0, 176 / 255, 240 / 255)

SECTION_TITLES: dict[str, str] = {
    "main": "Tableau principal",
    "classement": "Matchs classement",
    "planning": "Planning",
    "final": "Classement final",
}


def pages_export_tournoi(page_map: dict) -> list[tuple[int, str | None]]:
    """Pages ordonnées : (index PDF, titre brush ou None pour la couverture)."""
    pages: list[tuple[int, str | None]] = [(0, None)]

    for key in ("main", "classement", "planning", "final"):
        title = SECTION_TITLES[key]
        for entry in page_map.get(key, []):
            if not isinstance(entry, dict):
                continue
            pages.append((int(entry["index"]), title))

    return pages


def _chemin_font_grindy(base_dir: Path) -> Path | None:
    candidats = (
        base_dir / "fonts" / "GrindyBrush.otf",
        base_dir / "fonts" / "Grindy Brush.otf",
        base_dir / "frontend" / "public" / "fonts" / "GrindyBrush.otf",
        base_dir / "frontend" / "dist" / "fonts" / "GrindyBrush.otf",
    )
    for path in candidats:
        if path.is_file():
            return path
    return None


def _taille_titre(page_rect: fitz.Rect) -> float:
    return max(22.0, min(34.0, page_rect.width * 0.035))


def _ajouter_titre_brush(
    page: fitz.Page,
    titre: str,
    font_path: Path,
) -> None:
    rect = page.rect
    fontsize = _taille_titre(rect)
    band_bottom = rect.y0 + 6 + fontsize * 1.65

    page.draw_rect(
        fitz.Rect(rect.x0, rect.y0, rect.x1, band_bottom + 4),
        color=None,
        fill=(1, 1, 1),
        overlay=True,
    )

    font = fitz.Font(fontfile=str(font_path))
    text_width = font.text_length(titre, fontsize=fontsize)
    x = rect.x0 + max(24.0, (rect.width - text_width) / 2)
    y = rect.y0 + fontsize * 1.25

    writer = fitz.TextWriter(rect)
    writer.append((x, y), titre, font=font, fontsize=fontsize)
    writer.write_text(page, color=BRUSH_BLUE)


def exporter_pdf_tournoi(
    source_pdf: Path,
    page_map: dict,
    output_pdf: Path,
    base_dir: Path,
) -> None:
    font_path = _chemin_font_grindy(base_dir)
    specs = pages_export_tournoi(page_map)

    source = fitz.open(str(source_pdf))
    merged = fitz.open()

    try:
        for index, title in specs:
            if index < 0 or index >= source.page_count:
                continue

            merged.insert_pdf(source, from_page=index, to_page=index)

            if title and font_path:
                _ajouter_titre_brush(merged[-1], title, font_path)

        if merged.page_count == 0:
            raise RuntimeError("Aucune page à exporter.")

        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        merged.save(str(output_pdf), garbage=4, deflate=True)
    finally:
        merged.close()
        source.close()

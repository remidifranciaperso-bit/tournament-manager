import gc
from pathlib import Path

import fitz

DPI_AFFICHAGE = 144


def lire_tailles_pages(
    pdf_path: Path,
    indices: list[int],
) -> dict[str, dict[str, float]]:
    """Lit uniquement les dimensions des pages (léger en RAM)."""
    if not indices:
        return {}

    doc = fitz.open(str(pdf_path))
    sizes: dict[str, dict[str, float]] = {}

    try:
        for index in sorted(set(indices)):
            if index < 0 or index >= doc.page_count:
                continue
            rect = doc[index].rect
            sizes[str(index)] = {
                "width": float(rect.width),
                "height": float(rect.height),
            }
    finally:
        doc.close()

    return sizes


def generer_page_png(
    pdf_path: Path,
    index: int,
    output_path: Path,
    dpi: int = DPI_AFFICHAGE,
) -> None:
    """Génère une PNG à la demande (une page à la fois)."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(pdf_path))
    try:
        if index < 0 or index >= doc.page_count:
            raise ValueError(f"Page PDF introuvable : {index}")
        pixmap = doc[index].get_pixmap(dpi=dpi, alpha=False)
        try:
            pixmap.save(str(output_path))
        finally:
            del pixmap
    finally:
        doc.close()
    gc.collect()


def generer_page_pdf(
    pdf_path: Path,
    index: int,
    output_path: Path,
) -> None:
    """Extrait une page PDF à la demande."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(pdf_path))
    single = fitz.open()
    try:
        if index < 0 or index >= doc.page_count:
            raise ValueError(f"Page PDF introuvable : {index}")
        single.insert_pdf(doc, from_page=index, to_page=index)
        single.save(str(output_path), garbage=4, deflate=True)
    finally:
        single.close()
        doc.close()
    gc.collect()


def indices_depuis_page_map(page_map: dict) -> list[int]:
    from engine.live_page_map import indices_depuis_page_map as _indices

    return _indices(page_map)

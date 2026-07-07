import base64
from pathlib import Path

import fitz


def extraire_pages_pdf(pdf_path: Path, indices: list[int]) -> dict[str, str]:
    """
    Extrait des PDF d'une page (base64) pour affichage natif navigateur.
    Une page = un onglet : rendu identique à l'Engine (polices, emojis, brush).
    """
    if not indices:
        return {}

    doc = fitz.open(str(pdf_path))
    pages: dict[str, str] = {}

    try:
        for index in sorted(set(indices)):
            if index < 0 or index >= doc.page_count:
                continue

            single = fitz.open()
            single.insert_pdf(doc, from_page=index, to_page=index)
            pdf_bytes = single.tobytes(deflate=True, garbage=4)
            single.close()

            pages[str(index)] = base64.b64encode(pdf_bytes).decode("ascii")
    finally:
        doc.close()

    return pages


def indices_depuis_page_map(page_map: dict) -> list[int]:
    from engine.live_page_map import indices_depuis_page_map as _indices

    return _indices(page_map)

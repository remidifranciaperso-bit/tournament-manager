from pathlib import Path

import fitz


def extraire_pages_sur_disque(
    pdf_path: Path,
    indices: list[int],
    output_dir: Path,
) -> dict[str, dict[str, float]]:
    """Découpe le PDF Engine en pages (fichiers sur disque, pas de base64)."""
    if not indices:
        return {}

    output_dir.mkdir(parents=True, exist_ok=True)
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

            single = fitz.open()
            try:
                single.insert_pdf(doc, from_page=index, to_page=index)
                single.save(str(output_dir / f"{index}.pdf"), garbage=4, deflate=True)
            finally:
                single.close()
    finally:
        doc.close()

    return sizes


def indices_depuis_page_map(page_map: dict) -> list[int]:
    from engine.live_page_map import indices_depuis_page_map as _indices

    return _indices(page_map)

"""Logo club pour sessions live : fichier pack ou image embarquée PDF."""

from __future__ import annotations

from pathlib import Path

import fitz


def _pixmap_to_png(pix: fitz.Pixmap, output_path: Path) -> None:
    if pix.alpha:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(output_path))


def extraire_logo_embarque_pdf(
    pdf_path: Path,
    output_path: Path,
) -> bool:
    """Extrait le logo embarqué du pied de page PDF (image PNG, pas bandeau raster)."""
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)

    doc = fitz.open(str(pdf_path))
    try:
        best_xref: int | None = None
        best_area = float("inf")

        for page_index in range(doc.page_count):
            page = doc[page_index]
            footer_y = page.rect.height * 0.9

            for info in page.get_image_info(xrefs=True):
                bbox = fitz.Rect(info["bbox"])
                if bbox.y0 < footer_y:
                    continue

                width = int(info["width"])
                height = int(info["height"])
                if width < 16 or height < 16 or width > 320 or height > 320:
                    continue

                area = float(width * height)
                if area < best_area:
                    best_area = area
                    best_xref = int(info["xref"])

        if best_xref is None:
            return False

        pix = fitz.Pixmap(doc, best_xref)
        _pixmap_to_png(pix, output_path)
        return output_path.is_file() and output_path.stat().st_size > 128
    finally:
        doc.close()


def assurer_logo_session(live_token: str) -> bool:
    """Crée logo.* dans la session live si absent (repli image embarquée PDF)."""
    from api.live_store import chemin_logo, chemin_pdf_complet, chemin_session

    if chemin_logo(live_token) is not None:
        return True

    pdf_path = chemin_pdf_complet(live_token)
    session_dir = chemin_session(live_token)
    if pdf_path is None or session_dir is None:
        return False

    return extraire_logo_embarque_pdf(pdf_path, session_dir / "logo.png")

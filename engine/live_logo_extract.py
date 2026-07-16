"""Logo club pour sessions live : fichier pack ou image embarquée PDF."""

from __future__ import annotations

from pathlib import Path

import fitz


def _pixmap_to_png(pix: fitz.Pixmap, output_path: Path) -> None:
    if pix.alpha:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(output_path))


def _iter_page_images(page: fitz.Page, doc: fitz.Document) -> list[tuple[int, int, int, fitz.Rect | None]]:
    """(xref, width_px, height_px, bbox_en_points ou None)."""
    images: list[tuple[int, int, int, fitz.Rect | None]] = []
    seen: set[int] = set()

    try:
        for info in page.get_image_info(xrefs=True):
            xref = int(info["xref"])
            if xref in seen:
                continue
            seen.add(xref)
            bbox = fitz.Rect(info["bbox"])
            images.append(
                (
                    xref,
                    int(info["width"]),
                    int(info["height"]),
                    bbox,
                )
            )
    except (AttributeError, TypeError, ValueError):
        pass

    for entry in page.get_images(full=True):
        xref = int(entry[0])
        if xref in seen:
            continue
        seen.add(xref)
        try:
            pix = fitz.Pixmap(doc, xref)
        except Exception:
            continue
        images.append((xref, pix.width, pix.height, None))

    return images


def _footer_candidates(page: fitz.Page, doc: fitz.Document) -> list[tuple[float, int]]:
    footer_y = page.rect.height * 0.88
    candidates: list[tuple[float, int]] = []

    for xref, width_px, height_px, bbox in _iter_page_images(page, doc):
        if bbox is not None:
            if bbox.y0 < footer_y:
                continue
            width_pt = bbox.width
            height_pt = bbox.height
            if width_pt < 8 or height_pt < 8:
                continue
            if width_pt > 220 or height_pt > 120:
                continue
            area = float(width_pt * height_pt)
        else:
            if width_px < 16 or height_px < 16:
                continue
            if width_px > 512 or height_px > 512:
                continue
            area = float(width_px * height_px)

        candidates.append((area, xref))

    return candidates


def _smallest_logo_candidates(page: fitz.Page, doc: fitz.Document) -> list[tuple[float, int]]:
    """Repli : plus petite image raisonnable (en-tête ou pied de page)."""
    page_area = page.rect.width * page.rect.height
    candidates: list[tuple[float, int]] = []

    for xref, width_px, height_px, bbox in _iter_page_images(page, doc):
        if width_px < 16 or height_px < 16:
            continue
        if width_px > 512 or height_px > 512:
            continue

        if bbox is not None:
            bbox_area = bbox.width * bbox.height
            if bbox_area > page_area * 0.2:
                continue
            area = float(bbox_area)
        else:
            if float(width_px * height_px) > page_area * 0.2:
                continue
            area = float(width_px * height_px)

        candidates.append((area, xref))

    return candidates


def _garde_candidates(page: fitz.Page, doc: fitz.Document) -> list[tuple[float, int]]:
    """Logo grand en tête de garde (meilleure qualité que le pied de page PDF)."""
    header_y_max = page.rect.height * 0.22
    page_area = page.rect.width * page.rect.height
    candidates: list[tuple[float, int]] = []

    for xref, width_px, height_px, bbox in _iter_page_images(page, doc):
        if bbox is None:
            continue
        if bbox.y0 > header_y_max:
            continue
        if width_px < 48 or height_px < 48:
            continue
        bbox_area = bbox.width * bbox.height
        if bbox_area > page_area * 0.15:
            continue
        if width_px > 512 or height_px > 512:
            continue
        area = float(width_px * height_px)
        candidates.append((area, xref))

    return candidates


def extraire_logo_qualite_pdf(
    pdf_path: Path,
    output_path: Path,
) -> bool:
    """Extrait le logo le plus net du PDF (garde 1re page, sinon pied de page)."""
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)

    from engine.pdf_pages import pdf_est_lisible

    if not pdf_est_lisible(pdf_path):
        return False

    try:
        doc = fitz.open(str(pdf_path))
    except Exception:
        return False

    try:
        best_xref: int | None = None
        best_score = -1.0

        if doc.page_count > 0:
            for area, xref in _garde_candidates(doc[0], doc):
                if area > best_score:
                    best_score = area
                    best_xref = xref

        if best_xref is None:
            for area, xref in _footer_candidates(doc[0], doc):
                if area > best_score:
                    best_score = area
                    best_xref = xref

        if best_xref is None:
            return False

        pix = fitz.Pixmap(doc, best_xref)
        _pixmap_to_png(pix, output_path)
        return output_path.is_file() and output_path.stat().st_size > 128
    finally:
        doc.close()


def extraire_logo_embarque_pdf(
    pdf_path: Path,
    output_path: Path,
) -> bool:
    """Extrait le logo embarqué du PDF (pied de page, sinon plus petite image utile)."""
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)

    from engine.pdf_pages import pdf_est_lisible

    if not pdf_est_lisible(pdf_path):
        return False

    try:
        doc = fitz.open(str(pdf_path))
    except Exception:
        return False

    try:
        best_xref: int | None = None
        best_area = float("inf")

        page_index = 0
        for area, xref in _footer_candidates(doc[page_index], doc):
            if area < best_area:
                best_area = area
                best_xref = xref

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

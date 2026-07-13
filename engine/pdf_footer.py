"""Tampon logo en pied de page PDF — après LibreOffice (évite l'OOM PPTX)."""

from __future__ import annotations

import gc
import os
import tempfile
from pathlib import Path

import fitz

ENGINE_FOOTER_RATIO = 0.042
ENGINE_FOOTER_LOGO_WIDTH_RATIO = 1 / 3
PDF_LOGO_MAX_PX = 220


def _zone_logo_pied(page: fitz.Page) -> fitz.Rect:
    rect = page.rect
    footer_top = rect.height * (1 - ENGINE_FOOTER_RATIO)
    side = rect.width * (1 - ENGINE_FOOTER_LOGO_WIDTH_RATIO) / 2
    return fitz.Rect(side, footer_top, rect.width - side, rect.height)


def appliquer_logo_sur_pdf(pdf_path: Path, logo_path: Path) -> None:
    """Insère le logo dans la bande pied de chaque page du PDF Engine."""
    from engine.logo_prepare import preparer_logo_fichier

    pdf_path = Path(pdf_path)
    logo_path = Path(logo_path)
    if not pdf_path.is_file() or not logo_path.is_file():
        return

    preparer_logo_fichier(logo_path, max_px=PDF_LOGO_MAX_PX)
    logo_bytes = logo_path.read_bytes()
    if len(logo_bytes) < 32:
        return

    doc = fitz.open(str(pdf_path))
    try:
        for page in doc:
            zone = _zone_logo_pied(page)
            page.draw_rect(zone, color=None, fill=(1, 1, 1), overlay=True)
            page.insert_image(zone, stream=logo_bytes, keep_proportion=True)

        fd, temp_name = tempfile.mkstemp(suffix=".pdf", prefix="pdf-logo-")
        os.close(fd)
        temp_path = Path(temp_name)
        doc.save(str(temp_path), garbage=4, deflate=True)
        doc.close()
        doc = None
        gc.collect()
        temp_path.replace(pdf_path)
    finally:
        if doc is not None:
            doc.close()
        gc.collect()

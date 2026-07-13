"""Tampon logo en pied de page PDF — après LibreOffice (évite l'OOM PPTX)."""

from __future__ import annotations

import gc
import shutil
import uuid
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


def _remplacer_fichier_atomique(cible: Path, source: Path) -> None:
    """Remplace cible par source (même volume requis pour rename atomique)."""
    cible = Path(cible)
    source = Path(source)
    try:
        source.replace(cible)
    except OSError:
        shutil.copy2(source, cible)
        source.unlink(missing_ok=True)


def appliquer_logo_sur_pdf(pdf_path: Path, logo_path: Path) -> None:
    """Insère le logo dans la bande pied de chaque page du PDF Engine."""
    from engine.logo_prepare import preparer_logo_fichier

    pdf_path = Path(pdf_path).resolve()
    logo_path = Path(logo_path)
    if not pdf_path.is_file() or not logo_path.is_file():
        return

    preparer_logo_fichier(logo_path, max_px=PDF_LOGO_MAX_PX)
    logo_bytes = logo_path.read_bytes()
    if len(logo_bytes) < 32:
        return

    # Fichier temporaire dans le même dossier que le PDF (évite errno 18 sur Render).
    temp_path = pdf_path.parent / f".{pdf_path.stem}-logo-{uuid.uuid4().hex}.pdf"

    doc = fitz.open(str(pdf_path))
    try:
        for page in doc:
            zone = _zone_logo_pied(page)
            page.draw_rect(zone, color=None, fill=(1, 1, 1), overlay=True)
            page.insert_image(zone, stream=logo_bytes, keep_proportion=True)

        doc.save(str(temp_path), garbage=4, deflate=True)
    finally:
        doc.close()
        gc.collect()

    try:
        _remplacer_fichier_atomique(pdf_path, temp_path)
    finally:
        temp_path.unlink(missing_ok=True)

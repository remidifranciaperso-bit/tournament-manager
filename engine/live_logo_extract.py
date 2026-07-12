"""Extraction du logo club depuis le pied de page PDF Engine."""

from __future__ import annotations

from pathlib import Path

import fitz

ENGINE_FOOTER_RATIO = 0.042
ENGINE_FOOTER_LOGO_WIDTH_RATIO = 1 / 3


def _footer_logo_clip(page_rect: fitz.Rect) -> fitz.Rect:
    footer_top = page_rect.height * (1 - ENGINE_FOOTER_RATIO)
    side = page_rect.width * (1 - ENGINE_FOOTER_LOGO_WIDTH_RATIO) / 2
    return fitz.Rect(side, footer_top, page_rect.width - side, page_rect.height)


def _pixmap_has_logo_content(pix: fitz.Pixmap) -> bool:
    samples = pix.samples
    if not samples:
        return False

    step = max(12, len(samples) // 600)
    non_white = 0
    samples_count = 0

    for index in range(0, len(samples), step):
        if index + 2 >= len(samples):
            break
        samples_count += 1
        red, green, blue = samples[index], samples[index + 1], samples[index + 2]
        if red < 245 or green < 245 or blue < 245:
            non_white += 1

    return samples_count > 0 and (non_white / samples_count) >= 0.01


def extraire_logo_depuis_pdf(
    pdf_path: Path,
    output_path: Path,
    *,
    page_index: int = 0,
) -> bool:
    """Rogne le tiers central du pied de page Engine et enregistre le logo."""
    pdf_path = Path(pdf_path)
    output_path = Path(output_path)

    doc = fitz.open(str(pdf_path))
    try:
        if page_index < 0 or page_index >= doc.page_count:
            return False

        page = doc[page_index]
        clip = _footer_logo_clip(page.rect)
        if clip.width <= 1 or clip.height <= 1:
            return False

        pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=clip, alpha=False)
        if not _pixmap_has_logo_content(pixmap):
            return False

        output_path.parent.mkdir(parents=True, exist_ok=True)
        pixmap.save(str(output_path))
        return output_path.is_file() and output_path.stat().st_size > 256
    finally:
        doc.close()


def assurer_logo_session(live_token: str) -> bool:
    """Crée logo.* dans la session live depuis le PDF si absent."""
    from api.live_store import chemin_logo, chemin_pdf_complet, chemin_session

    if chemin_logo(live_token) is not None:
        return True

    pdf_path = chemin_pdf_complet(live_token)
    session_dir = chemin_session(live_token)
    if pdf_path is None or session_dir is None:
        return False

    return extraire_logo_depuis_pdf(pdf_path, session_dir / "logo.png")

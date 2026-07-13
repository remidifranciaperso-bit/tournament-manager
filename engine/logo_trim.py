"""Rogne les marges blanches / transparentes autour d'un logo."""

from pathlib import Path

from PIL import Image, ImageChops

_WHITE_SEUIL = 245
_ALPHA_SEUIL = 16


def rogner_image(image: Image.Image, marge_px: int = 2) -> Image.Image:
    rgba = image.convert("RGBA")
    rouge, vert, bleu, alpha = rgba.split()
    rgb = Image.merge("RGB", (rouge, vert, bleu))
    blanc = Image.new("RGB", rgb.size, (_WHITE_SEUIL, _WHITE_SEUIL, _WHITE_SEUIL))
    diff = ImageChops.difference(rgb, blanc).convert("L")
    masque_alpha = alpha.point(lambda valeur: 255 if valeur >= _ALPHA_SEUIL else 0)
    visible = ImageChops.lighter(diff, masque_alpha)
    bbox = visible.getbbox()
    if not bbox:
        return image

    rogne = rgba.crop(bbox)
    if marge_px <= 0:
        return rogne

    padded = Image.new(
        "RGBA",
        (rogne.width + marge_px * 2, rogne.height + marge_px * 2),
        (0, 0, 0, 0),
    )
    padded.paste(rogne, (marge_px, marge_px))
    return padded


def rogner_logo_fichier(chemin: Path, marge_px: int = 2) -> Path:
    """Rogne un fichier logo sur place. Retourne le chemin."""
    from engine.logo_prepare import preparer_logo_fichier

    return preparer_logo_fichier(chemin)

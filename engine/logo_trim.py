"""Rogne les marges blanches / transparentes autour d'un logo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops

_WHITE_SEUIL = 245
_ALPHA_SEUIL = 16


def rogner_image_contenu(image: Image.Image, marge_px: int = 2) -> Image.Image:
    """Rogne comme le wizard frontend (blanc opaque exclu du cadre utile)."""
    rgba = image.convert("RGBA")
    largeur, hauteur = rgba.size
    pixels = rgba.load()

    min_x = largeur
    min_y = hauteur
    max_x = 0
    max_y = 0
    trouve = False

    for y in range(hauteur):
        for x in range(largeur):
            rouge, vert, bleu, alpha = pixels[x, y]
            if alpha < _ALPHA_SEUIL:
                continue
            if (
                rouge >= _WHITE_SEUIL
                and vert >= _WHITE_SEUIL
                and bleu >= _WHITE_SEUIL
            ):
                continue
            trouve = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if not trouve:
        return image

    rogne = rgba.crop((min_x, min_y, max_x + 1, max_y + 1))
    if marge_px <= 0:
        return rogne

    padded = Image.new(
        "RGBA",
        (rogne.width + marge_px * 2, rogne.height + marge_px * 2),
        (0, 0, 0, 0),
    )
    padded.paste(rogne, (marge_px, marge_px))
    return padded


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

"""Rogne les marges blanches / transparentes autour d'un logo."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops

_WHITE_SEUIL = 245
_ALPHA_SEUIL = 16


def _pixel_fond_blanc_opaque(
    pixels,
    x: int,
    y: int,
    *,
    seuil: int = _WHITE_SEUIL,
) -> bool:
    rouge, vert, bleu, alpha = pixels[x, y]
    return (
        alpha >= _ALPHA_SEUIL
        and rouge >= seuil
        and vert >= seuil
        and bleu >= seuil
    )


def retirer_fond_blanc_bord(
    image: Image.Image,
    *,
    seuil: int = _WHITE_SEUIL,
) -> Image.Image:
    """Rend transparent le blanc opaque relié aux bords (fond carré des packs)."""
    rgba = image.convert("RGBA")
    largeur, hauteur = rgba.size
    if largeur < 2 or hauteur < 2:
        return rgba

    pixels = rgba.load()
    visites: set[tuple[int, int]] = set()
    file_attente: deque[tuple[int, int]] = deque()

    for x in range(largeur):
        for y in (0, hauteur - 1):
            if _pixel_fond_blanc_opaque(pixels, x, y, seuil=seuil):
                file_attente.append((x, y))
    for y in range(hauteur):
        for x in (0, largeur - 1):
            if _pixel_fond_blanc_opaque(pixels, x, y, seuil=seuil):
                file_attente.append((x, y))

    while file_attente:
        x, y = file_attente.popleft()
        if (x, y) in visites:
            continue
        visites.add((x, y))
        rouge, vert, bleu, _alpha = pixels[x, y]
        pixels[x, y] = (rouge, vert, bleu, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (
                0 <= nx < largeur
                and 0 <= ny < hauteur
                and (nx, ny) not in visites
                and _pixel_fond_blanc_opaque(pixels, nx, ny, seuil=seuil)
            ):
                file_attente.append((nx, ny))

    return rgba


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

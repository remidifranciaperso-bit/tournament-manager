"""Rogne les marges blanches / transparentes autour d'un logo."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops

_WHITE_SEUIL = 245
_ALPHA_SEUIL = 16


def _couleur_proche(
    rouge: int,
    vert: int,
    bleu: int,
    reference: tuple[int, int, int],
    *,
    tolerance: int,
) -> bool:
    return (
        abs(rouge - reference[0]) <= tolerance
        and abs(vert - reference[1]) <= tolerance
        and abs(bleu - reference[2]) <= tolerance
    )


def retirer_fond_uniforme_bord(
    image: Image.Image,
    *,
    tolerance: int = 35,
) -> Image.Image:
    """Rend transparent le fond uniforme relié aux bords (noir/blanc des logos PDF)."""
    rgba = image.convert("RGBA")
    largeur, hauteur = rgba.size
    if largeur < 2 or hauteur < 2:
        return rgba

    pixels = rgba.load()
    coins = [
        pixels[0, 0],
        pixels[largeur - 1, 0],
        pixels[0, hauteur - 1],
        pixels[largeur - 1, hauteur - 1],
    ]
    reference = coins[0][:3]

    def correspond(x: int, y: int) -> bool:
        rouge, vert, bleu, alpha = pixels[x, y]
        if alpha < _ALPHA_SEUIL:
            return False
        return _couleur_proche(rouge, vert, bleu, reference, tolerance=tolerance)

    visites: set[tuple[int, int]] = set()
    file_attente: deque[tuple[int, int]] = deque()

    for x in range(largeur):
        for y in (0, hauteur - 1):
            if correspond(x, y):
                file_attente.append((x, y))
    for y in range(hauteur):
        for x in (0, largeur - 1):
            if correspond(x, y):
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
                and correspond(nx, ny)
            ):
                file_attente.append((nx, ny))

    return rgba


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

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


def _pixel_est_visible(rouge: int, vert: int, bleu: int, alpha: int) -> bool:
    if alpha < _ALPHA_SEUIL:
        return False
    return not (
        rouge >= _WHITE_SEUIL
        and vert >= _WHITE_SEUIL
        and bleu >= _WHITE_SEUIL
    )


def bbox_contenu_utile(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Cadre du contenu visible (mêmes règles que le rognage wizard / ``rogner_image_contenu``)."""
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
            if not _pixel_est_visible(rouge, vert, bleu, alpha):
                continue
            trouve = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if not trouve:
        return None
    return min_x, min_y, max_x, max_y


def dimensions_contenu_utile(image: Image.Image) -> tuple[int, int] | None:
    bbox = bbox_contenu_utile(image)
    if bbox is None:
        return None
    min_x, min_y, max_x, max_y = bbox
    return max_x - min_x + 1, max_y - min_y + 1


def _contenu_motif_rond_ou_carre(
    rgba: Image.Image,
    min_x: int,
    min_y: int,
    max_x: int,
    max_y: int,
) -> bool:
    """Coins du bbox surtout vides → pastille / cercle mal rogné (bbox un peu allongée)."""
    w = max_x - min_x + 1
    h = max_y - min_y + 1
    if w < 8 or h < 8:
        return True

    corner_side = max(2, min(w, h) // 6)
    pixels = rgba.load()

    def _compter_zone(x0: int, y0: int) -> int:
        total = 0
        x1 = min(x0 + corner_side, max_x + 1)
        y1 = min(y0 + corner_side, max_y + 1)
        for y in range(y0, y1):
            for x in range(x0, x1):
                rouge, vert, bleu, alpha = pixels[x, y]
                if _pixel_est_visible(rouge, vert, bleu, alpha):
                    total += 1
        return total

    coin = (
        _compter_zone(min_x, min_y)
        + _compter_zone(max_x - corner_side + 1, min_y)
        + _compter_zone(min_x, max_y - corner_side + 1)
        + _compter_zone(max_x - corner_side + 1, max_y - corner_side + 1)
    )
    cx = (min_x + max_x) // 2
    cy = (min_y + max_y) // 2
    centre = _compter_zone(cx - corner_side // 2, cy - corner_side // 2)
    if centre <= 0:
        return False
    return coin <= centre * 0.4


# Aligné sur ``COVER_LOGO_COMPACT_ASPECT_MAX`` (page de garde V2).
_LOGO_GARDE_COMPACT_AR = 1.12
_LOGO_GARDE_ROND_AR_MAX = 1.45


def logo_garde_est_compact(image: Image.Image) -> bool:
    """Carré, rond ou pastille — pas un bandeau texte (après rognage / bbox utile)."""
    bbox = bbox_contenu_utile(image)
    if bbox is None:
        largeur, hauteur = image.size
        w, h = largeur, hauteur
        rgba = None
    else:
        min_x, min_y, max_x, max_y = bbox
        w = max_x - min_x + 1
        h = max_y - min_y + 1
        rgba = image.convert("RGBA")

    if w <= 0 or h <= 0:
        return False

    ratio = max(w, h) / min(w, h)
    if ratio <= _LOGO_GARDE_COMPACT_AR:
        return True
    if ratio <= _LOGO_GARDE_ROND_AR_MAX and bbox is not None and rgba is not None:
        return _contenu_motif_rond_ou_carre(rgba, *bbox)
    return False


def logo_garde_est_compact_depuis_bytes(payload: bytes) -> bool:
    import io

    with Image.open(io.BytesIO(payload)) as img:
        return logo_garde_est_compact(img)


def rogner_image_contenu(image: Image.Image, marge_px: int = 2) -> Image.Image:
    """Rogne comme le wizard frontend (blanc opaque exclu du cadre utile)."""
    bbox = bbox_contenu_utile(image)
    if bbox is None:
        return image

    min_x, min_y, max_x, max_y = bbox
    rgba = image.convert("RGBA")
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

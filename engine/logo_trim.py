"""Rogne les marges blanches / transparentes autour d'un logo."""

from pathlib import Path

from PIL import Image

_WHITE_SEUIL = 245
_ALPHA_SEUIL = 16


def rogner_image(image: Image.Image, marge_px: int = 2) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    largeur, hauteur = rgba.size

    min_x, min_y = largeur, hauteur
    max_x, max_y = 0, 0
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


def rogner_logo_fichier(chemin: Path, marge_px: int = 2) -> Path:
    """Rogne un fichier logo sur place. Retourne le chemin."""
    chemin = Path(chemin)
    if not chemin.is_file():
        return chemin

    with Image.open(chemin) as source:
        rogne = rogner_image(source, marge_px=marge_px)
        suffixe = chemin.suffix.lower()

        if suffixe in {".jpg", ".jpeg"}:
            fond = Image.new("RGB", rogne.size, (255, 255, 255))
            fond.paste(rogne, mask=rogne.split()[3])
            fond.save(chemin, format="JPEG", quality=95, optimize=True)
        elif suffixe == ".webp":
            rogne.save(chemin, format="WEBP", quality=95)
        else:
            rogne.save(chemin, format="PNG", optimize=True)

    return chemin

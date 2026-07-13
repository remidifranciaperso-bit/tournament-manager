"""Préparation logo upload : taille max, rognage, mémoire maîtrisée."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

from engine.logo_trim import rogner_image

MAX_LOGO_BYTES = 4 * 1024 * 1024
MAX_LOGO_PX = 480


def preparer_logo_fichier(chemin: Path, *, max_px: int = MAX_LOGO_PX) -> Path:
    """Redimensionne et rogne un logo avant insertion PPTX / session live."""
    chemin = Path(chemin)
    if not chemin.is_file():
        return chemin

    taille = chemin.stat().st_size
    if taille > MAX_LOGO_BYTES:
        raise ValueError(
            "Logo trop lourd (max 4 Mo). Réduisez la taille de l'image."
        )

    with Image.open(chemin) as source:
        source = ImageOps.exif_transpose(source)
        largeur, hauteur = source.size
        cote_max = max(largeur, hauteur)
        if cote_max > max_px:
            ratio = max_px / cote_max
            source = source.resize(
                (max(1, int(largeur * ratio)), max(1, int(hauteur * ratio))),
                Image.Resampling.LANCZOS,
            )

        rogne = rogner_image(source, marge_px=2)
        suffixe = chemin.suffix.lower()

        if suffixe in {".jpg", ".jpeg"}:
            fond = Image.new("RGB", rogne.size, (255, 255, 255))
            fond.paste(rogne, mask=rogne.split()[3])
            fond.save(chemin, format="JPEG", quality=88, optimize=True)
        elif suffixe == ".webp":
            rogne.save(chemin, format="WEBP", quality=88)
        else:
            rogne.save(chemin, format="PNG", optimize=True)

    return chemin

"""Préparation logo club — limite la RAM sur hébergement 512 Mo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

MAX_LOGO_EDGE = 900
MAX_LOGO_BYTES = 320_000


def preparer_logo_pour_moteur(source: Path) -> Path:
    """
    Redimensionne et compresse le logo avant PPTX/PDF/live.
    Un logo photo haute résolution peut faire dépasser 512 Mo sur Render.
    """
    source = Path(source)
    with Image.open(source) as img:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        width, height = img.size
        max_edge = max(width, height)
        if max_edge > MAX_LOGO_EDGE:
            ratio = MAX_LOGO_EDGE / max_edge
            img = img.resize(
                (max(1, int(width * ratio)), max(1, int(height * ratio))),
                Image.Resampling.LANCZOS,
            )

        png_path = source.with_suffix(".prepared.png")
        img.save(png_path, format="PNG", optimize=True)

        if png_path.stat().st_size <= MAX_LOGO_BYTES:
            return png_path

        png_path.unlink(missing_ok=True)
        jpeg_path = source.with_suffix(".prepared.jpg")
        img.convert("RGB").save(
            jpeg_path,
            format="JPEG",
            quality=84,
            optimize=True,
        )
        return jpeg_path

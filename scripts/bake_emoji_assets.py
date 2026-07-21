#!/usr/bin/env python3
"""Génère les PNG emoji couleur (Noto/Apple) pour le rendu PDF natif."""

from __future__ import annotations

import sys
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = ROOT / "engine_v2" / "assets" / "emoji_baked"
EMOJI_FILES = {
    "trophy": "🏆",
    "cross": "❌",
    "gold": "🥇",
    "silver": "🥈",
    "bronze": "🥉",
}


def _load_font() -> tuple[ImageFont.FreeTypeFont, int]:
    """Noto Color Emoji uniquement — même glyphes que le live Chromium."""
    candidates = [
        ROOT / "fonts" / "NotoColorEmoji.ttf",
        Path("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"),
    ]
    for path in candidates:
        if not path.is_file():
            continue
        for size in (48, 64, 80, 96, 128, 40, 32):
            try:
                if path.suffix.lower() == ".ttc":
                    return ImageFont.truetype(str(path), size, index=0), size
                return ImageFont.truetype(str(path), size), size
            except OSError:
                continue
    raise RuntimeError("Police emoji couleur introuvable pour bake_emoji_assets")


def bake() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    font, _size = _load_font()
    for name, char in EMOJI_FILES.items():
        bbox = font.getbbox(char)
        iw = max(bbox[2] - bbox[0], 1)
        ih = max(bbox[3] - bbox[1], 1)
        img = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.text((-bbox[0], -bbox[1]), char, font=font, embedded_color=True)
        out = OUT_DIR / f"{name}.png"
        img.save(out, format="PNG")
        print(f"  {out.relative_to(ROOT)}")


if __name__ == "__main__":
    print("→ bake emoji PNG")
    bake()

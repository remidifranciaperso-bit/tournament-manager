"""Page de couverture Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

from engine_v2.pages._layout import (
    draw_cover_background,
    draw_cover_logo,
    draw_cover_texts,
)


def render_cover_page(
    page: fitz.Page,
    tournoi,
    *,
    base_dir: Path,
    logo_bytes: bytes | None = None,
    logo_wh: tuple[int, int] | None = None,
) -> None:
    draw_cover_background(page, base_dir)
    draw_cover_logo(
        page,
        logo_bytes=logo_bytes,
        logo_wh=logo_wh,
        club_name=getattr(tournoi, "club", None),
        base_dir=base_dir,
    )
    draw_cover_texts(page, tournoi, base_dir=base_dir)

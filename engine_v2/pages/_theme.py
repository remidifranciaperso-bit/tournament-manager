"""Palette et helpers typographiques Engine V2."""

from __future__ import annotations

from pathlib import Path

import fitz

BRUSH_BLUE = (0, 176 / 255, 240 / 255)
TEMPLATE_BLUE = (0, 176 / 255, 240 / 255)
YELLOW = (1.0, 1.0, 0.0)
LIME = (212 / 255, 1.0, 74 / 255)
WHITE = (1, 1, 1)
BLACK = (0, 0, 0)
ARENA_950 = (4 / 255, 10 / 255, 18 / 255)
ARENA_800 = (0.12, 0.16, 0.25)
MUTED = (0.45, 0.5, 0.58)

TABLE_HEAD_PT = 9
TABLE_BODY_PT = 9


def font_paths(base_dir: Path) -> dict[str, Path | None]:
    candidates = {
        "brush": [
            base_dir / "fonts" / "Grindy Brush.otf",
            base_dir / "fonts" / "GrindyBrush.otf",
            base_dir / "frontend" / "public" / "fonts" / "GrindyBrush.otf",
            base_dir / "frontend" / "dist" / "fonts" / "GrindyBrush.otf",
        ],
        "tsl": [
            base_dir / "fonts" / "TSLSans.ttf",
            base_dir / "frontend" / "public" / "fonts" / "TSLSans.ttf",
            base_dir / "frontend" / "dist" / "fonts" / "TSLSans.ttf",
        ],
        "noto": [
            base_dir / "fonts" / "NotoSans-Regular.ttf",
            base_dir / "frontend" / "public" / "fonts" / "NotoSans-Regular.ttf",
            base_dir / "frontend" / "dist" / "fonts" / "NotoSans-Regular.ttf",
            Path("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"),
            Path("/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf"),
        ],
        "noto_bold": [
            base_dir / "fonts" / "NotoSans-Bold.ttf",
            base_dir / "frontend" / "public" / "fonts" / "NotoSans-Bold.ttf",
            base_dir / "frontend" / "dist" / "fonts" / "NotoSans-Bold.ttf",
            Path("/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"),
            Path("/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf"),
        ],
    }
    out: dict[str, Path | None] = {}
    for key, paths in candidates.items():
        out[key] = next((p for p in paths if p.is_file()), None)
    return out


def draw_table(
    page: fitz.Page,
    area: fitz.Rect,
    headers: list[str],
    rows: list[list[str]],
    *,
    col_widths: list[float] | None = None,
    base_dir: Path | None = None,
) -> None:
    if not headers:
        return
    n_cols = len(headers)
    if col_widths is None:
        col_widths = [1 / n_cols] * n_cols

    fonts = font_paths(base_dir) if base_dir else {}
    body_font = fonts.get("noto")
    body_fontname = "helv"
    if body_font and body_font.is_file():
        body_fontname = "noto"

    row_h = max(18.0, min(26.0, area.height / max(len(rows) + 2, 6)))
    x0 = area.x0
    y = area.y0

    for index, header in enumerate(headers):
        width = area.width * col_widths[index]
        cell = fitz.Rect(x0, y, x0 + width, y + row_h)
        page.draw_rect(cell, color=TEMPLATE_BLUE, fill=TEMPLATE_BLUE, width=0)
        page.insert_textbox(
            cell,
            header.upper() if header.isascii() else header,
            fontsize=TABLE_HEAD_PT,
            color=WHITE,
            align=fitz.TEXT_ALIGN_CENTER,
            fontname="hebo",
        )
        x0 += width

    y += row_h
    for row_index, row in enumerate(rows):
        x0 = area.x0
        fill = WHITE if row_index % 2 == 0 else (0.97, 0.99, 1.0)
        for col_index, value in enumerate(row):
            width = area.width * col_widths[col_index]
            cell = fitz.Rect(x0, y, x0 + width, y + row_h)
            page.draw_rect(cell, color=TEMPLATE_BLUE, fill=fill, width=0.4)
            kwargs: dict = {
                "fontsize": TABLE_BODY_PT,
                "color": ARENA_800,
                "align": fitz.TEXT_ALIGN_CENTER,
                "fontname": body_fontname,
            }
            if body_font and body_font.is_file():
                kwargs["fontfile"] = str(body_font)
            page.insert_textbox(cell, value or "—", **kwargs)
            x0 += width
        y += row_h

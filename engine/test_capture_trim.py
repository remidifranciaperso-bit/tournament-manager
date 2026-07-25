"""Vérification rognage marges blanches — export PDF planning / final."""

from __future__ import annotations

import unittest
from io import BytesIO

from PIL import Image, ImageDraw

from engine.live_export_render_support import narrow_table_width_pt
from engine.live_pdf_composite import _trim_capture_whitespace


def _synthetic_capture(
    canvas_w: int,
    canvas_h: int,
    table_w: int,
    table_h: int,
) -> bytes:
    img = Image.new("RGB", (canvas_w, canvas_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    x0 = (canvas_w - table_w) // 2
    y0 = (canvas_h - table_h) // 2
    draw.rectangle(
        [x0, y0, x0 + table_w - 1, y0 + table_h - 1],
        fill=(0, 80, 140),
    )
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class CaptureTrimTests(unittest.TestCase):
    def test_trim_centered_table(self) -> None:
        raw = _synthetic_capture(1400, 900, 820, 420)
        _, w, h = _trim_capture_whitespace(raw)
        self.assertEqual(w, 820.0)
        self.assertEqual(h, 420.0)

    def test_trim_keeps_full_image_when_no_content(self) -> None:
        buf = BytesIO()
        Image.new("RGB", (400, 300), (255, 255, 255)).save(buf, format="PNG")
        _, w, h = _trim_capture_whitespace(buf.getvalue())
        self.assertEqual(w, 400.0)
        self.assertEqual(h, 300.0)

    def test_planning_scale_uses_trimmed_width(self) -> None:
        """Tableau centré : le rognage permet de remplir la largeur utile."""
        raw = _synthetic_capture(1400, 900, 820, 420)
        _, trimmed_w, _ = _trim_capture_whitespace(raw)
        avail_w = 500.0
        before_scale = avail_w / 1400.0
        after_scale = avail_w / trimmed_w
        self.assertAlmostEqual(after_scale / before_scale, 1400.0 / 820.0, places=2)


if __name__ == "__main__":
    unittest.main()

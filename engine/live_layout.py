import json
import re
from pathlib import Path

from pptx import Presentation

from engine.ppt_engine import parcourir_shapes

SLIDE_W = 9906000
SLIDE_H = 6858000

_TAG = re.compile(r"\{\{([^}]+)\}\}")


def _pct(value: int, total: int) -> float:
    return round(value / total * 100, 3)


def extraire_layout_template(template_path) -> dict[str, list[dict]]:
    prs = Presentation(str(template_path))
    layout: dict[str, list[dict]] = {}

    for slide_index, slide in enumerate(prs.slides):
        fields: list[dict] = []
        for shape in parcourir_shapes(slide.shapes):
            if not getattr(shape, "has_text_frame", False):
                continue

            text = shape.text_frame.text.strip()
            if not text or "{{" not in text:
                continue

            for key in _TAG.findall(text):
                fields.append(
                    {
                        "key": key.strip(),
                        "left": _pct(shape.left, SLIDE_W),
                        "top": _pct(shape.top, SLIDE_H),
                        "width": _pct(shape.width, SLIDE_W),
                        "height": _pct(shape.height, SLIDE_H),
                    }
                )

        if fields:
            layout[str(slide_index)] = fields

    return layout


def chemin_layout_public(base_dir: Path, template_id: str) -> Path:
    return (
        base_dir
        / "frontend"
        / "public"
        / "live-templates"
        / template_id
        / "layout.json"
    )


def ecrire_layout_public(base_dir: Path, template_id: str, layout: dict) -> Path:
    path = chemin_layout_public(base_dir, template_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(layout, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def lire_layout_public(base_dir: Path, template_id: str) -> dict[str, list[dict]]:
    path = chemin_layout_public(base_dir, template_id)
    if not path.exists():
        return extraire_layout_template(
            base_dir / "templates bleus" / f"{template_id}.pptx"
        )
    return json.loads(path.read_text(encoding="utf-8"))

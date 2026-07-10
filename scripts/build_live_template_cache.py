#!/usr/bin/env python3
"""Pré-calcule les caches live (.pptx.live.json) pour tous les templates."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.live_template_cache import ecrire_cache_live  # noqa: E402

TEMPLATES_DIR = ROOT / "templates bleus"


def main() -> int:
    templates = sorted(
        path
        for path in TEMPLATES_DIR.glob("Template_*.pptx")
        if not path.name.startswith("~$")
    )
    if not templates:
        print("Aucun template trouvé.", file=sys.stderr)
        return 1

    for template in templates:
        destination = ecrire_cache_live(template)
        print(f"OK {template.name} -> {destination.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

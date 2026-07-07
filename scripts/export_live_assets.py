#!/usr/bin/env python3
"""
Exporte les assets live Manager (layout.json + masques PNG par slide).

Usage dev (nécessite LibreOffice une fois) :
  python3 scripts/export_live_assets.py
  python3 scripts/export_live_assets.py --template Template_16_1J

Le Manager en ligne n'utilise pas LibreOffice : seuls ces fichiers statiques
sont servis depuis frontend/public/live-templates/.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.live_layout import ecrire_layout_public, extraire_layout_template
from engine.live_mask import preparer_pptx_masque
from engine.pdf_engine import convertir_pptx_en_pdf, trouver_soffice
from engine.pdf_images import extraire_pages_png


def templates_disponibles() -> list[Path]:
    dossier = ROOT / "templates bleus"
    return sorted(dossier.glob("Template_*.pptx"))


def exporter_template(template_path: Path, dpi: int = 200) -> None:
    template_id = template_path.stem
    print(f"→ {template_id}")

    layout = extraire_layout_template(template_path)
    layout_path = ecrire_layout_public(ROOT, template_id, layout)
    print(f"  layout : {layout_path.relative_to(ROOT)} ({len(layout)} slides)")

    if not trouver_soffice():
        print(
            "  ⚠️  LibreOffice absent : masques PNG non générés. "
            "Installez LO ou lancez sur une machine avec LO."
        )
        return

    sortie = ROOT / "exports" / "_live_masks"
    sortie.mkdir(parents=True, exist_ok=True)

    pptx_masque = sortie / f"{template_id}_mask.pptx"
    preparer_pptx_masque(template_path, pptx_masque)

    pdf_path = convertir_pptx_en_pdf(pptx_masque, sortie)
    indices = [int(key) for key in layout.keys()]
    images = extraire_pages_png(pdf_path, indices, dpi=dpi)

    dest_dir = ROOT / "frontend" / "public" / "live-templates" / template_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    for index in indices:
        png_b64 = images.get(str(index))
        if not png_b64:
            print(f"  ⚠️  slide {index} : PNG manquant")
            continue
        import base64

        png_path = dest_dir / f"{index}.png"
        png_path.write_bytes(base64.b64decode(png_b64))
        print(f"  masque : {png_path.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export assets live Manager")
    parser.add_argument(
        "--template",
        help="Nom sans extension (ex. Template_16_1J). Par défaut : tous.",
    )
    parser.add_argument("--dpi", type=int, default=200)
    args = parser.parse_args()

    if args.template:
        chemin = ROOT / "templates bleus" / f"{args.template}.pptx"
        if not chemin.exists():
            print(f"Template introuvable : {chemin}", file=sys.stderr)
            return 1
        exporter_template(chemin, dpi=args.dpi)
        return 0

    for template_path in templates_disponibles():
        exporter_template(template_path, dpi=args.dpi)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

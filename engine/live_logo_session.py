"""Résolution du logo club pour les sessions live."""

from __future__ import annotations

from pathlib import Path

from engine.live_snapshot import materialiser_logo_snapshot


def _preparer_fichier_logo(chemin: Path) -> Path | None:
    from engine.logo_prepare import (
        UPLOAD_LOGO_MAX_PX,
        preparer_logo_fichier,
        preparer_logo_png_export,
    )
    from engine.logo_trim import retirer_fond_uniforme_bord
    from PIL import Image

    prepare_path = chemin.parent / "logo_live.png"
    with Image.open(chemin) as source:
        nettoye = retirer_fond_uniforme_bord(source)
        brut = chemin.parent / "_logo_nettoye.png"
        nettoye.save(brut, format="PNG", optimize=True)

    payload = preparer_logo_png_export(brut, max_px=UPLOAD_LOGO_MAX_PX)
    if payload:
        prepare_path.write_bytes(payload)
        return prepare_path

    return preparer_logo_fichier(brut, max_px=UPLOAD_LOGO_MAX_PX)


def _logo_depuis_pdf(pdf_path: Path, dest_dir: Path) -> Path | None:
    from engine.live_logo_extract import extraire_logo_qualite_pdf

    brut = dest_dir / "_logo_pdf_brut.png"
    if not extraire_logo_qualite_pdf(pdf_path, brut):
        return None
    return _preparer_fichier_logo(brut)


def preparer_logo_import(
    pdf_path: Path,
    snapshot: dict,
    logo_path: Path | str | None = None,
) -> Path | None:
    """Logo pack : JSON/ZIP préparés, sinon garde PDF (packs Engine sans logo_png)."""
    dest_dir = Path(pdf_path).parent

    source = materialiser_logo_snapshot(snapshot, dest_dir)
    if source is None or not source.is_file():
        if logo_path is not None:
            candidat = Path(logo_path)
            if candidat.is_file() and candidat.stat().st_size > 64:
                source = candidat

    if source is not None:
        return _preparer_fichier_logo(source)

    return _logo_depuis_pdf(Path(pdf_path), dest_dir)


def logo_url_pour_meta(live_token: str) -> str | None:
    """URL relative du logo de session (évite les data URL lourdes en mémoire)."""
    from api.live_store import chemin_logo

    if chemin_logo(live_token) is None:
        return None
    return f"/api/live/{live_token}/logo"

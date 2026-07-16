"""Résolution du logo club pour les sessions live."""

from __future__ import annotations

from pathlib import Path

from engine.live_snapshot import materialiser_logo_snapshot


def preparer_logo_import(
    pdf_path: Path,
    snapshot: dict,
    logo_path: Path | str | None = None,
) -> Path | None:
    """Prépare le logo pack comme le live Excel (_ecrire_logo_temporaire)."""
    dest_dir = Path(pdf_path).parent

    source = materialiser_logo_snapshot(snapshot, dest_dir)
    if source is None or not source.is_file():
        if logo_path is not None:
            candidat = Path(logo_path)
            if candidat.is_file() and candidat.stat().st_size > 64:
                source = candidat

    if source is None:
        return None

    from engine.logo_prepare import (
        UPLOAD_LOGO_MAX_PX,
        preparer_logo_fichier,
        preparer_logo_png_export,
    )

    # Même pipeline que le wizard Engine : rognage contenu + PNG 720px.
    prepare_path = dest_dir / "logo_live.png"
    payload = preparer_logo_png_export(source, max_px=UPLOAD_LOGO_MAX_PX)
    if payload:
        prepare_path.write_bytes(payload)
        return prepare_path

    # Repli strict live Excel : preparer_logo_fichier après upload.
    return preparer_logo_fichier(source, max_px=UPLOAD_LOGO_MAX_PX)


def logo_url_pour_meta(live_token: str) -> str | None:
    """URL relative du logo de session (évite les data URL lourdes en mémoire)."""
    from api.live_store import chemin_logo

    if chemin_logo(live_token) is None:
        return None
    return f"/api/live/{live_token}/logo"

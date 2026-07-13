"""Résolution du logo club pour les sessions live."""

from __future__ import annotations

from pathlib import Path

from engine.live_snapshot import materialiser_logo_snapshot


def preparer_logo_import(
    pdf_path: Path,
    snapshot: dict,
    logo_path: Path | str | None = None,
) -> Path | None:
    """Logo uploadé ou snapshot pack — pas d'extraction PDF automatique."""
    if logo_path is not None:
        source = Path(logo_path)
        if source.is_file() and source.stat().st_size > 64:
            return source

    decoded = materialiser_logo_snapshot(snapshot, pdf_path.parent)
    if decoded is not None and decoded.is_file():
        return decoded

    return None


def logo_url_pour_meta(live_token: str) -> str | None:
    """URL relative du logo de session (évite les data URL lourdes en mémoire)."""
    from api.live_store import chemin_logo

    if chemin_logo(live_token) is None:
        return None
    return f"/api/live/{live_token}/logo"

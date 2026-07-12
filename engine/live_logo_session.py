"""Résolution du logo club pour les sessions live."""

from __future__ import annotations

import base64
import mimetypes
from pathlib import Path

from engine.live_logo_extract import extraire_logo_embarque_pdf


def preparer_logo_import(
    pdf_path: Path,
    snapshot: dict,
    logo_path: Path | str | None = None,
) -> Path | None:
    """Logo pack / snapshot / PDF embarqué, dans l'ordre."""
    if logo_path is not None:
        source = Path(logo_path)
        if source.is_file() and source.stat().st_size > 64:
            return source

    from engine.live_snapshot import materialiser_logo_snapshot

    decoded = materialiser_logo_snapshot(snapshot, pdf_path.parent)
    if decoded is not None and decoded.is_file():
        return decoded

    destination = pdf_path.parent / "logo-import.png"
    if extraire_logo_embarque_pdf(pdf_path, destination):
        return destination

    return None


def logo_url_pour_meta(live_token: str) -> str | None:
    """URL data:image pour affichage direct (évite un 2e fetch qui échoue)."""
    from api.live_store import chemin_logo

    chemin = chemin_logo(live_token)
    if chemin is None:
        return None

    mime = mimetypes.guess_type(chemin.name)[0] or "image/png"
    payload = base64.b64encode(chemin.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{payload}"

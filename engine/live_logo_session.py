"""Résolution du logo club pour les sessions live."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from engine.live_snapshot import materialiser_logo_snapshot
from engine.logo_prepare import preparer_logo_fichier
from engine.logo_trim import retirer_fond_blanc_bord


def _nettoyer_logo_pack(chemin: Path) -> Path:
    """Retire le fond blanc carré des logos pack avant rognage / session live."""
    chemin = Path(chemin)
    if not chemin.is_file() or chemin.stat().st_size <= 64:
        return chemin

    with Image.open(chemin) as source:
        nettoye = retirer_fond_blanc_bord(source)
        suffixe = chemin.suffix.lower()
        if suffixe in {".jpg", ".jpeg"}:
            fond = Image.new("RGB", nettoye.size, (255, 255, 255))
            fond.paste(nettoye, mask=nettoye.split()[3])
            fond.save(chemin, format="JPEG", quality=88, optimize=True)
        elif suffixe == ".webp":
            nettoye.save(chemin, format="WEBP", quality=88)
        else:
            nettoye.save(chemin, format="PNG", optimize=True)

    return preparer_logo_fichier(chemin)


def preparer_logo_import(
    pdf_path: Path,
    snapshot: dict,
    logo_path: Path | str | None = None,
) -> Path | None:
    """Logo uploadé ou snapshot pack — pas d'extraction PDF automatique."""
    if logo_path is not None:
        source = Path(logo_path)
        if source.is_file() and source.stat().st_size > 64:
            return _nettoyer_logo_pack(source)

    decoded = materialiser_logo_snapshot(snapshot, pdf_path.parent)
    if decoded is not None and decoded.is_file():
        return _nettoyer_logo_pack(decoded)

    return None


def logo_url_pour_meta(live_token: str) -> str | None:
    """URL relative du logo de session (évite les data URL lourdes en mémoire)."""
    from api.live_store import chemin_logo

    if chemin_logo(live_token) is None:
        return None
    return f"/api/live/{live_token}/logo"

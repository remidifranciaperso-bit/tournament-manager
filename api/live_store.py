import gc
import json
import os
import shutil
import time
import uuid
from pathlib import Path


def _base_live_dir() -> Path:
    """Racine des sessions live.

    Sur un déploiement avec disque persistant (``LIVE_DATA_DIR``), les sessions
    survivent aux redéploiements et aux redémarrages — indispensable pour les
    tournois sur plusieurs jours. Sinon, repli sur ``exports/_live`` (local).
    """
    custom = os.environ.get("LIVE_DATA_DIR")
    if custom:
        return Path(custom)
    return Path(__file__).resolve().parent.parent / "exports" / "_live"


BASE_LIVE_DIR = _base_live_dir()
# Durée de vie longue : un tournoi peut s'étaler sur plusieurs jours (poules
# J1, tableau J2/J3…). On ne purge qu'au bout d'une semaine d'inactivité.
TTL_SECONDS = 7 * 24 * 60 * 60
# Rafraîchit au plus une fois par heure le mtime d'une session consultée, pour
# la maintenir « active » sans I/O superflue à chaque requête.
_TOUCH_MIN_INTERVAL = 60 * 60
_CLEANUP_MIN_INTERVAL = 60 * 60
_CLEANUP_MAX_DIRS_PER_RUN = 80
_last_cleanup_at = 0.0


def _live_root() -> Path:
    dossier = BASE_LIVE_DIR
    dossier.mkdir(parents=True, exist_ok=True)
    return dossier


def _toucher_session(dossier: Path) -> None:
    """Repousse l'expiration d'une session tant qu'elle est consultée/jouée."""
    try:
        now = time.time()
        if now - dossier.stat().st_mtime >= _TOUCH_MIN_INTERVAL:
            os.utime(dossier, (now, now))
    except OSError:
        pass


def nettoyer_sessions_expirees() -> None:
    global _last_cleanup_at
    now = time.time()
    if now - _last_cleanup_at < _CLEANUP_MIN_INTERVAL:
        return
    _last_cleanup_at = now
    seuil = now - TTL_SECONDS
    scanned = 0
    for dossier in _live_root().iterdir():
        if scanned >= _CLEANUP_MAX_DIRS_PER_RUN:
            break
        scanned += 1
        if not dossier.is_dir():
            continue
        try:
            if dossier.stat().st_mtime < seuil:
                shutil.rmtree(dossier, ignore_errors=True)
        except OSError:
            pass


def creer_session(
    pdf_path: Path,
    pdf_filename: str,
    page_map: dict | None = None,
    logo_path: Path | str | None = None,
    *,
    move_pdf: bool = False,
    trim_logo: bool = True,
    page_indices: list[int] | None = None,
    page_sizes: dict[str, dict[str, float]] | None = None,
) -> tuple[str, Path, dict[str, dict[str, float]]]:
    from engine.pdf_pages import valider_pdf_fichier

    pdf_path = Path(pdf_path)
    valider_pdf_fichier(pdf_path)

    nettoyer_sessions_expirees()
    token = uuid.uuid4().hex
    session_dir = _live_root() / token
    pages_dir = session_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    dest_pdf = session_dir / "full.pdf"
    if move_pdf:
        shutil.move(str(pdf_path), str(dest_pdf))
    else:
        shutil.copy2(pdf_path, dest_pdf)
    valider_pdf_fichier(dest_pdf)
    (session_dir / "filename.txt").write_text(pdf_filename, encoding="utf-8")
    if page_map is not None:
        (session_dir / "page_map.json").write_text(
            json.dumps(page_map, ensure_ascii=False),
            encoding="utf-8",
        )
    if logo_path is not None:
        source = Path(logo_path)
        if source.is_file():
            from engine.logo_prepare import preparer_logo_fichier

            if trim_logo:
                preparer_logo_fichier(source)
            ext = source.suffix.lower() or ".png"
            shutil.copy2(source, session_dir / f"logo{ext}")

    page_sizes = page_sizes or {}
    if not page_sizes and page_indices:
        from engine.pdf_pages import lire_tailles_pages

        page_sizes = lire_tailles_pages(dest_pdf, page_indices)
        if page_sizes:
            (session_dir / "page_sizes.json").write_text(
                json.dumps(page_sizes, ensure_ascii=False),
                encoding="utf-8",
            )

    return token, pages_dir, page_sizes


def chemin_session(token: str) -> Path | None:
    if not token or not token.isalnum():
        return None
    dossier = _live_root() / token
    if not dossier.is_dir():
        return None
    _toucher_session(dossier)
    return dossier


def chemin_pdf_complet(token: str) -> Path | None:
    session = chemin_session(token)
    if session is None:
        return None
    pdf = session / "full.pdf"
    return pdf if pdf.is_file() else None


def chemin_page(token: str, index: int) -> Path | None:
    session = chemin_session(token)
    if session is None:
        return None
    page = session / "pages" / f"{index}.pdf"
    return page if page.is_file() else None


def chemin_page_png(token: str, index: int, dpi: int = 144) -> Path | None:
    session = chemin_session(token)
    if session is None:
        return None
    suffix = "" if dpi == 144 else f"@{dpi}"
    page = session / "pages" / f"{index}{suffix}.png"
    if page.is_file():
        return page
    if suffix:
        legacy = session / "pages" / f"{index}.png"
        return legacy if legacy.is_file() else None
    return None


def nom_pdf(token: str) -> str:
    session = chemin_session(token)
    if session is None:
        return "tournoi.pdf"
    fichier = session / "filename.txt"
    if fichier.is_file():
        return fichier.read_text(encoding="utf-8").strip() or "tournoi.pdf"
    return "tournoi.pdf"


def charger_page_map(token: str) -> dict | None:
    session = chemin_session(token)
    if session is None:
        return None
    fichier = session / "page_map.json"
    if not fichier.is_file():
        return None
    try:
        return json.loads(fichier.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def chemin_logo(token: str) -> Path | None:
    session = chemin_session(token)
    if session is None:
        return None
    for candidate in sorted(session.glob("logo.*")):
        if candidate.is_file():
            return candidate
    return None


def chemin_pdf_export(token: str) -> Path | None:
    session = chemin_session(token)
    if session is None:
        return None
    pdf = session / "export.pdf"
    return pdf if pdf.is_file() else None


def liberer_memoire() -> None:
    gc.collect()
    gc.collect()

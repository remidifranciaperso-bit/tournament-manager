import gc
import shutil
import time
import uuid
from pathlib import Path

BASE_LIVE_DIR = Path(__file__).resolve().parent.parent / "exports" / "_live"
TTL_SECONDS = 6 * 60 * 60


def _live_root() -> Path:
    dossier = BASE_LIVE_DIR
    dossier.mkdir(parents=True, exist_ok=True)
    return dossier


def nettoyer_sessions_expirees() -> None:
    seuil = time.time() - TTL_SECONDS
    for dossier in _live_root().iterdir():
        if not dossier.is_dir():
            continue
        try:
            if dossier.stat().st_mtime < seuil:
                shutil.rmtree(dossier, ignore_errors=True)
        except OSError:
            pass


def creer_session(pdf_path: Path, pdf_filename: str) -> tuple[str, Path]:
    nettoyer_sessions_expirees()
    token = uuid.uuid4().hex
    session_dir = _live_root() / token
    pages_dir = session_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(pdf_path, session_dir / "full.pdf")
    (session_dir / "filename.txt").write_text(pdf_filename, encoding="utf-8")
    return token, pages_dir


def chemin_session(token: str) -> Path | None:
    if not token or not token.isalnum():
        return None
    dossier = _live_root() / token
    return dossier if dossier.is_dir() else None


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


def nom_pdf(token: str) -> str:
    session = chemin_session(token)
    if session is None:
        return "tournoi.pdf"
    fichier = session / "filename.txt"
    if fichier.is_file():
        return fichier.read_text(encoding="utf-8").strip() or "tournoi.pdf"
    return "tournoi.pdf"


def liberer_memoire() -> None:
    gc.collect()

import shutil
import time
import uuid
from pathlib import Path

BASE_NOTIFY_DIR = Path(__file__).resolve().parent.parent / "exports" / "_notify"
TTL_SECONDS = 6 * 60 * 60


def _notify_dir() -> Path:
    dossier = BASE_NOTIFY_DIR
    dossier.mkdir(parents=True, exist_ok=True)
    return dossier


def nettoyer_expires() -> None:
    seuil = time.time() - TTL_SECONDS
    for fichier in _notify_dir().glob("*"):
        if fichier.is_file() and fichier.stat().st_mtime < seuil:
            fichier.unlink(missing_ok=True)


def enregistrer_pdf(pdf_path: Path) -> str:
    nettoyer_expires()
    token = uuid.uuid4().hex
    destination = _notify_dir() / f"{token}.pdf"
    shutil.copy2(pdf_path, destination)
    return token


def chemin_pdf(token: str) -> Path | None:
    if not token or not token.isalnum():
        return None
    chemin = _notify_dir() / f"{token}.pdf"
    return chemin if chemin.exists() else None


def supprimer_pdf(token: str) -> None:
    chemin = chemin_pdf(token)
    if chemin is not None:
        chemin.unlink(missing_ok=True)

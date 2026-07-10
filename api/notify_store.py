import json
import os
import shutil
import tempfile
import time
import uuid
import zipfile
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


def enregistrer_snapshot(token: str, snapshot: dict) -> None:
    destination = _notify_dir() / f"{token}.live.json"
    destination.write_text(
        json.dumps(snapshot, ensure_ascii=False),
        encoding="utf-8",
    )


def chemin_pdf(token: str) -> Path | None:
    if not token or not token.isalnum():
        return None
    chemin = _notify_dir() / f"{token}.pdf"
    return chemin if chemin.exists() else None


def chemin_snapshot(token: str) -> Path | None:
    if not token or not token.isalnum():
        return None
    chemin = _notify_dir() / f"{token}.live.json"
    return chemin if chemin.exists() else None


def snapshot_disponible(token: str) -> bool:
    return chemin_snapshot(token) is not None


def supprimer_pdf(token: str) -> None:
    chemin = chemin_pdf(token)
    if chemin is not None:
        chemin.unlink(missing_ok=True)
    snapshot = chemin_snapshot(token)
    if snapshot is not None:
        snapshot.unlink(missing_ok=True)


def creer_archive_manager_live(token: str) -> Path | None:
    """ZIP : PDF Engine + fichier .live.json pour reprise Manager."""
    pdf_path = chemin_pdf(token)
    snapshot_path = chemin_snapshot(token)
    if pdf_path is None or snapshot_path is None:
        return None

    base = pdf_path.stem
    fd, archive_name = tempfile.mkstemp(suffix="-manager-live.zip")
    os.close(fd)
    archive = Path(archive_name)

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(pdf_path, arcname=pdf_path.name)
        zf.write(snapshot_path, arcname=f"{base}.live.json")

    return archive

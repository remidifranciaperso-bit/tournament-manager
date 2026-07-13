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
    from engine.pdf_pages import valider_pdf_fichier

    pdf_path = Path(pdf_path)
    valider_pdf_fichier(pdf_path)

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


def enregistrer_logo(token: str, logo_path: Path) -> None:
    logo_path = Path(logo_path)
    if not logo_path.is_file():
        return
    ext = logo_path.suffix.lower() or ".png"
    destination = _notify_dir() / f"{token}.logo{ext}"
    shutil.copy2(logo_path, destination)


def chemin_logo_notify(token: str) -> Path | None:
    if not token or not token.isalnum():
        return None
    for candidate in sorted(_notify_dir().glob(f"{token}.logo.*")):
        if candidate.is_file():
            return candidate
    return None


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
        logo_path = chemin_logo_notify(token)
        if logo_path is not None:
            zf.write(logo_path, arcname=f"logo{logo_path.suffix.lower()}")
        else:
            from engine.live_logo_extract import extraire_logo_embarque_pdf
            import tempfile

            fd, temp_name = tempfile.mkstemp(suffix=".png")
            os.close(fd)
            temp_logo = Path(temp_name)
            try:
                if extraire_logo_embarque_pdf(pdf_path, temp_logo):
                    zf.write(temp_logo, arcname="logo.png")
            finally:
                temp_logo.unlink(missing_ok=True)

    return archive

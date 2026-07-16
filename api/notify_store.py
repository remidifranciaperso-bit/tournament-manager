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
    from engine.logo_prepare import preparer_logo_png_export

    payload = preparer_logo_png_export(logo_path)
    if not payload:
        return
    destination = _notify_dir() / f"{token}.logo.png"
    destination.write_bytes(payload)


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

        import base64

        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
        logo_path = chemin_logo_notify(token)
        logo_bytes: bytes | None = None

        if logo_path is not None and logo_path.is_file():
            logo_bytes = logo_path.read_bytes()
        elif snapshot.get("logo_png"):
            try:
                logo_bytes = base64.b64decode(snapshot["logo_png"])
            except (ValueError, TypeError):
                logo_bytes = None

        if logo_bytes is None or len(logo_bytes) < 64:
            from engine.live_logo_session import _logo_depuis_pdf
            import tempfile as tmpmod

            pack_dir = Path(tmpmod.mkdtemp(prefix="pack-logo-"))
            try:
                prepared = _logo_depuis_pdf(pdf_path, pack_dir)
                if prepared is not None and prepared.is_file():
                    logo_bytes = prepared.read_bytes()
            finally:
                shutil.rmtree(pack_dir, ignore_errors=True)

        if logo_bytes and len(logo_bytes) >= 64:
            snapshot["logo_png"] = base64.b64encode(logo_bytes).decode("ascii")
            zf.writestr("logo.png", logo_bytes)

        zf.writestr(
            f"{base}.live.json",
            json.dumps(snapshot, ensure_ascii=False),
        )

    return archive

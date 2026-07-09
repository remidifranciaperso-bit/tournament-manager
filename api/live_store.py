import gc
import json
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


def creer_session(
    pdf_path: Path,
    pdf_filename: str,
    page_map: dict | None = None,
    logo_path: Path | str | None = None,
    *,
    move_pdf: bool = False,
    page_indices: list[int] | None = None,
) -> tuple[str, Path, dict[str, dict[str, float]]]:
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
    (session_dir / "filename.txt").write_text(pdf_filename, encoding="utf-8")
    if page_map is not None:
        (session_dir / "page_map.json").write_text(
            json.dumps(page_map, ensure_ascii=False),
            encoding="utf-8",
        )
    if logo_path is not None:
        source = Path(logo_path)
        if source.is_file():
            ext = source.suffix.lower() or ".png"
            shutil.copy2(source, session_dir / f"logo{ext}")

    page_sizes: dict[str, dict[str, float]] = {}
    if page_indices:
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


def chemin_page_png(token: str, index: int) -> Path | None:
    session = chemin_session(token)
    if session is None:
        return None
    page = session / "pages" / f"{index}.png"
    return page if page.is_file() else None


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

import os
import re
from pathlib import Path

import httpx


def engine_generate_url() -> str | None:
    """URL Engine distante — uniquement pour la preview Manager."""
    if os.environ.get("DEPLOY_TARGET") != "manager-preview":
        return None
    explicit = os.environ.get("ENGINE_GENERATE_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    return "https://tournament-manager-9ytu.onrender.com"


def preview_mode() -> bool:
    return os.environ.get("DEPLOY_TARGET") == "manager-preview"


def soffice_disponible() -> bool:
    from engine.pdf_engine import trouver_soffice

    return bool(trouver_soffice())


def engine_distant_disponible(engine_url: str) -> bool:
    """Vérifie que le service Engine distant expose une API live fonctionnelle."""
    try:
        with httpx.Client(timeout=httpx.Timeout(8.0, connect=5.0)) as client:
            response = client.get(f"{engine_url.rstrip('/')}/api/health")
        if response.status_code != 200:
            return False
        payload = response.json()
        return bool(payload.get("soffice") or payload.get("live"))
    except Exception:
        return False


def _filename_from_disposition(header: str | None, fallback: str) -> str:
    if not header:
        return fallback
    match = re.search(r'filename="?([^";]+)"?', header)
    return match.group(1) if match else fallback


def _detail_from_response(response: httpx.Response) -> str:
    try:
        payload = response.json()
        if isinstance(payload, dict) and isinstance(payload.get("detail"), str):
            return payload["detail"]
    except Exception:
        pass
    text = response.text.strip()
    return text[:500] if text else f"HTTP {response.status_code}"


def generer_pdf_via_engine(
    engine_url: str,
    *,
    excel_path: Path,
    logo_path: Path | None,
    form_fields: dict[str, str],
    output_dir: Path,
) -> Path:
    """Délègue la génération PDF au service Engine (LibreOffice hors du preview)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    files: list[tuple[str, tuple[str, bytes, str]]] = [
        (
            "excel",
            (
                excel_path.name,
                excel_path.read_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
        )
    ]
    if logo_path is not None and logo_path.is_file():
        suffix = logo_path.suffix.lower()
        media = "image/png"
        if suffix in {".jpg", ".jpeg"}:
            media = "image/jpeg"
        elif suffix == ".webp":
            media = "image/webp"
        files.append(
            (
                "logo",
                (logo_path.name, logo_path.read_bytes(), media),
            )
        )

    timeout = httpx.Timeout(300.0, connect=60.0)
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.post(
            f"{engine_url.rstrip('/')}/api/generate",
            data=form_fields,
            files=files,
        )

    if response.status_code != 200:
        raise RuntimeError(
            f"Génération Engine distante échouée : {_detail_from_response(response)}"
        )

    content = response.content
    if len(content) < 128:
        content_type = response.headers.get("content-type", "inconnu")
        raise RuntimeError(
            "Génération Engine distante : le PDF reçu est vide "
            f"({len(content)} octet, {content_type}). "
            "Le service Engine distant est indisponible ou mal déployé."
        )

    filename = _filename_from_disposition(
        response.headers.get("content-disposition"),
        "tournoi.pdf",
    )
    destination = output_dir / filename
    destination.write_bytes(content)

    from engine.pdf_pages import valider_pdf_fichier

    try:
        valider_pdf_fichier(destination)
    except ValueError as exc:
        destination.unlink(missing_ok=True)
        raise RuntimeError(str(exc)) from exc

    return destination

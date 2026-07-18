"""API Engine V2 — rendu PDF sans templates LibreOffice."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from api.notify_store import enregistrer_pdf, enregistrer_snapshot, enregistrer_logo, supprimer_pdf
from engine_v2.config import ENGINE_V2_VERSION

BASE_DIR = Path(__file__).resolve().parent.parent

router = APIRouter(prefix="/api/v2", tags=["engine-v2"])

_PYMUPDF_OK: bool | None = None


def warm_pymupdf() -> bool:
    """Pré-charge PyMuPDF (appelé au démarrage du service V2)."""
    global _PYMUPDF_OK
    if _PYMUPDF_OK is not None:
        return _PYMUPDF_OK
    try:
        import fitz  # noqa: F401

        _PYMUPDF_OK = True
    except ImportError:
        _PYMUPDF_OK = False
    return _PYMUPDF_OK


def _ecrire_fichier_temporaire(upload: UploadFile, suffix: str) -> Path:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            tmp.write(chunk)
        return Path(tmp.name)


def _ecrire_logo_temporaire(upload: UploadFile, suffix: str) -> Path:
    from engine.logo_prepare import UPLOAD_LOGO_MAX_PX, preparer_logo_fichier

    chemin = _ecrire_fichier_temporaire(upload, suffix)
    return preparer_logo_fichier(chemin, max_px=UPLOAD_LOGO_MAX_PX)


def engine_v2_mode() -> bool:
    return os.environ.get("DEPLOY_TARGET") == "engine-v2"


@router.get("/health")
def health_v2():
    pymupdf_ok = warm_pymupdf()

    return {
        "status": "ok",
        "engine": "v2-render",
        "version": ENGINE_V2_VERSION,
        "pymupdf": pymupdf_ok,
        "libreoffice_required": False,
        "deploy": os.environ.get("DEPLOY_TARGET", "engine"),
    }


@router.post("/generate")
async def generate_v2(
    excel: UploadFile = File(...),
    logo: UploadFile | None = File(None),
    club: str = Form(""),
    date_tournoi: str = Form(...),
    type_tournoi: str = Form(...),
    genre_tournoi: str = Form(...),
    mode_tournoi: str = Form("Élimination directe"),
    methode_poules: str = Form("Méthode du serpentin"),
    nb_jours: int = Form(1),
    heures_debut_jours: str = Form("[]"),
    duree_match: int = Form(40),
    terrains: str = Form("[]"),
    terrain_principal: str = Form(...),
    format_match_tableau_principal: str | None = Form(None),
    format_match_classement: str = Form("identique"),
    format_match_finale: str = Form("identique"),
    format_match_poule: str = Form("identique"),
):
    """Génère un PDF tournoi via Engine V2 (PyMuPDF + rendu Live)."""
    from engine_v2.generate import generate_tournament_v2

    try:
        heures = json.loads(heures_debut_jours)
        liste_terrains = json.loads(terrains)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Paramètres JSON invalides.") from exc

    if not heures:
        raise HTTPException(status_code=422, detail="Heure de début manquante.")
    if not liste_terrains:
        raise HTTPException(status_code=422, detail="Aucun terrain défini.")

    excel_path = _ecrire_fichier_temporaire(excel, ".xlsx")
    logo_path = None
    if logo is not None and logo.filename:
        suffix = Path(logo.filename).suffix or ".png"
        logo_path = _ecrire_logo_temporaire(logo, suffix)

    notify_token = None
    try:
        pdf_path, snapshot = generate_tournament_v2(
            excel_path=excel_path,
            club=club,
            date_tournoi=date_tournoi,
            type_tournoi=type_tournoi,
            heure_debut=heures[0],
            duree_match=duree_match,
            terrains=liste_terrains,
            terrain_principal=terrain_principal,
            base_dir=BASE_DIR,
            mode_tournoi=mode_tournoi,
            nb_jours=nb_jours,
            heures_debut_jours=heures,
            logo_path=logo_path,
            genre_tournoi=genre_tournoi,
            methode_poules=methode_poules,
            format_match_tableau_principal=format_match_tableau_principal,
            format_match_classement=format_match_classement,
            format_match_finale=format_match_finale,
            format_match_poule=format_match_poule,
        )

        notify_token = enregistrer_pdf(pdf_path)
        enregistrer_snapshot(notify_token, snapshot)
        if logo_path is not None:
            enregistrer_logo(notify_token, logo_path)

        headers = {
            "X-Notify-Token": notify_token,
            "X-Live-Snapshot-Available": "1",
            "X-Engine-Version": "v2-render",
        }
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=pdf_path.name,
            headers=headers,
        )
    except (ValueError, FileNotFoundError, RuntimeError) as exc:
        if notify_token:
            supprimer_pdf(notify_token)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        if notify_token:
            supprimer_pdf(notify_token)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

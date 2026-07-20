"""API Engine V2 — PDF Live (coquille Engine + captures DOM + composite)."""

from __future__ import annotations

import base64
import json
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from api.notify_store import (
    chemin_logo_notify,
    chemin_pdf,
    chemin_snapshot,
    enregistrer_logo,
    enregistrer_pdf,
    enregistrer_snapshot,
    supprimer_pdf,
)
from engine_v2.config import ENGINE_V2_VERSION

BASE_DIR = Path(__file__).resolve().parent.parent

router = APIRouter(prefix="/api/v2", tags=["engine-v2"])

_PYMUPDF_OK: bool | None = None


def warm_pymupdf() -> bool:
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


async def _captures_depuis_form(form) -> dict[str, str]:
    captures: dict[str, str] = {}
    for field_name, value in form.multi_items():
        if not field_name.startswith("capture_"):
            continue
        if not hasattr(value, "read"):
            continue
        key = field_name.removeprefix("capture_").replace("_", ":", 1)
        raw = await value.read()
        if len(raw) < 4096:
            raise HTTPException(
                status_code=422,
                detail=f"Capture {key} vide ou trop petite.",
            )
        mime = value.content_type or "image/jpeg"
        encoded = base64.b64encode(raw).decode("ascii")
        captures[key] = f"data:{mime};base64,{encoded}"
    return captures


def _parse_tournament_form(
    *,
    club: str,
    date_tournoi: str,
    type_tournoi: str,
    genre_tournoi: str,
    mode_tournoi: str,
    methode_poules: str,
    nb_jours: int,
    heures_debut_jours: str,
    duree_match: int,
    terrains: str,
    terrain_principal: str,
    format_match_tableau_principal: str | None,
    format_match_classement: str,
    format_match_finale: str,
    format_match_poule: str,
):
    try:
        heures = json.loads(heures_debut_jours)
        liste_terrains = json.loads(terrains)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Paramètres JSON invalides.") from exc

    if not heures:
        raise HTTPException(status_code=422, detail="Heure de début manquante.")
    if not liste_terrains:
        raise HTTPException(status_code=422, detail="Aucun terrain défini.")

    liste_terrains = [str(item).strip().upper() for item in liste_terrains if str(item).strip()]

    if not liste_terrains:
        raise HTTPException(status_code=422, detail="Aucun terrain défini.")

    return heures, liste_terrains


def _normalize_club_name(club: str) -> str:
    return (club or "").strip().upper()


def _normalize_terrain_principal(terrain_principal: str, terrains: list[str]) -> str:
    principal = (terrain_principal or "").strip().upper()
    if principal in terrains:
        return principal
    return terrains[0]


@router.get("/health")
def health_v2():
    pymupdf_ok = warm_pymupdf()

    return {
        "status": "ok",
        "engine": "v2-live-capture",
        "version": ENGINE_V2_VERSION,
        "pymupdf": pymupdf_ok,
        "libreoffice_required": False,
        "shell": "v2-pymupdf",
        "deploy": os.environ.get("DEPLOY_TARGET", "engine"),
    }


@router.get("/logo/{token}")
def logo_v2(token: str):
    chemin = chemin_logo_notify(token)
    if chemin is None:
        raise HTTPException(status_code=404, detail="Logo introuvable.")
    media = "image/png"
    if chemin.suffix.lower() in {".jpg", ".jpeg"}:
        media = "image/jpeg"
    return FileResponse(chemin, media_type=media, headers={"Cache-Control": "private, max-age=3600"})


@router.post("/prepare")
async def prepare_v2(
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
    """Prépare coquille PDF + snapshot pour captures Live côté navigateur."""
    from engine_v2.generate import prepare_tournament_v2

    heures, liste_terrains = _parse_tournament_form(
        club=club,
        date_tournoi=date_tournoi,
        type_tournoi=type_tournoi,
        genre_tournoi=genre_tournoi,
        mode_tournoi=mode_tournoi,
        methode_poules=methode_poules,
        nb_jours=nb_jours,
        heures_debut_jours=heures_debut_jours,
        duree_match=duree_match,
        terrains=terrains,
        terrain_principal=terrain_principal,
        format_match_tableau_principal=format_match_tableau_principal,
        format_match_classement=format_match_classement,
        format_match_finale=format_match_finale,
        format_match_poule=format_match_poule,
    )
    club = _normalize_club_name(club)
    terrain_principal = _normalize_terrain_principal(terrain_principal, liste_terrains)

    excel_path = _ecrire_fichier_temporaire(excel, ".xlsx")
    logo_path = None
    if logo is not None and logo.filename:
        suffix = Path(logo.filename).suffix or ".png"
        logo_path = _ecrire_logo_temporaire(logo, suffix)

    notify_token = None
    try:
        shell_path, snapshot, pdf_filename = prepare_tournament_v2(
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

        notify_token = enregistrer_pdf(shell_path)
        enregistrer_snapshot(notify_token, snapshot)
        if logo_path is not None:
            enregistrer_logo(notify_token, logo_path)

        meta = dict(snapshot["meta"])
        meta["logo_url"] = f"/api/v2/logo/{notify_token}"

        return JSONResponse(
            {
                "token": notify_token,
                "pdf_filename": pdf_filename,
                "template_id": meta.get("template_id"),
                "page_map": snapshot["page_map"],
                "matches": snapshot["matches"],
                "fields": snapshot["fields"],
                "planning_layout": snapshot.get("planning_layout") or {},
                "meta": meta,
                "nb_equipes": meta.get("nb_equipes"),
            },
            headers={
                "X-Notify-Token": notify_token,
                "X-Live-Snapshot-Available": "1",
                "X-Engine-Version": "v2-live-capture",
            },
        )
    except (ValueError, FileNotFoundError, RuntimeError) as exc:
        if notify_token:
            supprimer_pdf(notify_token)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        if notify_token:
            supprimer_pdf(notify_token)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        excel_path.unlink(missing_ok=True)
        if logo_path is not None:
            logo_path.unlink(missing_ok=True)


@router.post("/export/{token}")
async def export_v2(token: str, request: Request):
    """Composite captures Live + coquille Engine → PDF final (identique export Manager)."""
    from engine_v2.generate import composite_tournament_v2_pdf

    shell_path = chemin_pdf(token)
    snapshot_path = chemin_snapshot(token)
    if shell_path is None or snapshot_path is None:
        raise HTTPException(status_code=404, detail="Session V2 introuvable.")

    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))

    content_type = request.headers.get("content-type", "")
    if not content_type.startswith("multipart/form-data"):
        raise HTTPException(status_code=422, detail="Captures multipart requises.")

    form = await request.form()
    payload_raw = form.get("payload")
    if not payload_raw:
        raise HTTPException(status_code=422, detail="Payload export manquant.")

    payload = json.loads(payload_raw)
    captures = await _captures_depuis_form(form)
    if not captures:
        raise HTTPException(status_code=422, detail="Captures Live requises.")

    crosspage_stubs = payload.get("crosspage_stubs") or {}
    export_path = shell_path.parent / f"{token}.export.pdf"
    logo_path = chemin_logo_notify(token)

    try:
        composite_tournament_v2_pdf(
            shell_pdf=shell_path,
            output_pdf=export_path,
            snapshot=snapshot,
            captures=captures,
            logo_path=logo_path,
            crosspage_stubs=crosspage_stubs,
        )
        # Pack Manager Live : conserver le PDF exporté (pas la coquille seule).
        import shutil

        shutil.copy2(export_path, shell_path)
    except (RuntimeError, FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Export PDF échoué : {exc}",
        ) from exc

    return FileResponse(
        export_path,
        media_type="application/pdf",
        filename=snapshot.get("pdf_filename") or "tournoi.pdf",
        headers={
            "X-Engine-Version": "v2-live-capture",
            "Cache-Control": "private, max-age=300",
        },
    )


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
    """Obsolète — le PDF final passe par /prepare puis captures Live puis /export."""
    raise HTTPException(
        status_code=410,
        detail=(
            "Génération directe désactivée. Utilisez /api/v2/prepare puis "
            "/api/v2/export avec captures Live (identique export Manager)."
        ),
    )

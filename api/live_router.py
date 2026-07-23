"""Routes Manager Live (session PDF, import pack, export) — partagées Engine V1 et V2."""

from __future__ import annotations

import asyncio
import base64
import json
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from api.live_store import (
    charger_page_map,
    chemin_logo,
    chemin_page,
    chemin_page_png,
    chemin_pdf_complet,
    chemin_session,
    nom_pdf,
)
from api.notify_store import chemin_pdf, supprimer_pdf
from api.wizard_routes import _ecrire_fichier_temporaire

BASE_DIR = Path(__file__).resolve().parent.parent

router = APIRouter(tags=["live"])


class LivePdfExportBody(BaseModel):
    page_map: dict | None = None
    template_id: str | None = None
    matches: list[dict] | None = None
    match_results: dict[str, dict] | None = None
    completed: list[str] | None = None
    fields: dict[str, str] | None = None
    planning_layout: dict | None = None
    nb_equipes: int | None = None
    captures: dict[str, str] | None = None
    crosspage_stubs: dict[str, dict] | None = None


def _ecrire_logo_temporaire(upload: UploadFile, suffix: str) -> Path:
    from engine.logo_prepare import UPLOAD_LOGO_MAX_PX, preparer_logo_fichier

    chemin = _ecrire_fichier_temporaire(upload, suffix)
    return preparer_logo_fichier(chemin, max_px=UPLOAD_LOGO_MAX_PX)


def _traiter_import_pack(
    archive_path: Path,
    logo_path: Path | None,
) -> dict:
    from engine.live_init import init_live_from_snapshot
    from engine.live_pack import extraire_pack_manager_live

    pdf_path, snapshot, temp_dir, logo_from_pack = extraire_pack_manager_live(
        archive_path
    )
    try:
        return init_live_from_snapshot(
            pdf_path=pdf_path,
            snapshot=snapshot,
            logo_path=logo_path or logo_from_pack,
        )
    finally:
        if temp_dir is not None:
            shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/api/live/init")
async def init_live(
    pdf_token: str = Form(...),
    pdf_filename: str = Form("tournoi.pdf"),
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
    """Étape 2 Manager live : session à partir du PDF ``POST /api/generate``."""
    pdf_path = chemin_pdf(pdf_token)
    if pdf_path is None:
        raise HTTPException(
            status_code=404,
            detail="PDF Engine introuvable ou expiré. Regénérez le tournoi.",
        )

    from engine.pdf_pages import valider_pdf_fichier

    try:
        valider_pdf_fichier(pdf_path)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        heures = json.loads(heures_debut_jours)
        liste_terrains = json.loads(terrains)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Parametres JSON invalides.")

    if not heures:
        raise HTTPException(status_code=422, detail="Heure de debut manquante.")

    if not liste_terrains:
        raise HTTPException(status_code=422, detail="Aucun terrain defini.")

    excel_path = _ecrire_fichier_temporaire(excel, ".xlsx")

    logo_path = None
    if logo is not None and logo.filename:
        suffix = Path(logo.filename).suffix or ".png"
        logo_path = _ecrire_logo_temporaire(logo, suffix)

    try:
        from engine.live_init import init_live_session

        payload = await asyncio.to_thread(
            init_live_session,
            pdf_path=pdf_path,
            pdf_filename=pdf_filename,
            excel_path=excel_path,
            club=club,
            date_tournoi=date_tournoi,
            type_tournoi=type_tournoi,
            genre_tournoi=genre_tournoi,
            heure_debut=heures[0],
            duree_match=duree_match,
            terrains=liste_terrains,
            terrain_principal=terrain_principal,
            base_dir=BASE_DIR,
            mode_tournoi=mode_tournoi,
            nb_jours=nb_jours,
            heures_debut_jours=heures,
            logo_path=logo_path,
            methode_poules=methode_poules,
            format_match_tableau_principal=format_match_tableau_principal,
            format_match_classement=format_match_classement,
            format_match_finale=format_match_finale,
            format_match_poule=format_match_poule,
        )
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur live init : {exc}")
    finally:
        excel_path.unlink(missing_ok=True)
        if logo_path is not None:
            logo_path.unlink(missing_ok=True)
        supprimer_pdf(pdf_token)

    return payload


@router.post("/api/live/init-from-pack")
async def init_live_from_pack(
    pack: UploadFile = File(...),
    logo: UploadFile | None = File(None),
):
    """Manager live depuis un pack ZIP Engine (PDF + .live.json)."""
    suffix = Path(pack.filename or "").suffix.lower()
    if suffix not in {".zip"}:
        raise HTTPException(
            status_code=422,
            detail="Importez le pack ZIP téléchargé depuis Engine.",
        )

    archive_path = _ecrire_fichier_temporaire(pack, suffix)

    logo_path = None
    if logo is not None and logo.filename:
        logo_suffix = Path(logo.filename).suffix or ".png"
        logo_path = _ecrire_logo_temporaire(logo, logo_suffix)

    try:
        payload = await asyncio.to_thread(
            _traiter_import_pack,
            archive_path,
            logo_path,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur import pack Manager live : {exc}",
        )
    finally:
        archive_path.unlink(missing_ok=True)
        if logo_path is not None:
            logo_path.unlink(missing_ok=True)

    return payload


@router.post("/api/generate-live")
async def generate_live_deprecated():
    raise HTTPException(
        status_code=410,
        detail=(
            "Endpoint obsolète. Le Manager live passe par /api/generate "
            "(Engine) puis /api/live/init."
        ),
    )


@router.get("/api/live/{token}/page/{index}.png")
def live_page_png(token: str, index: int, dpi: int = 144):
    dpi = max(96, min(int(dpi), 300))
    chemin = chemin_page_png(token, index, dpi)
    if chemin is None:
        session = chemin_session(token)
        pdf_complet = chemin_pdf_complet(token)
        if session is None or pdf_complet is None:
            raise HTTPException(status_code=404, detail="Page live introuvable.")

        from engine.pdf_pages import generer_page_png

        suffix = "" if dpi == 144 else f"@{dpi}"
        output = session / "pages" / f"{index}{suffix}.png"
        try:
            generer_page_png(pdf_complet, index, output, dpi=dpi)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        chemin = output

    return FileResponse(
        chemin,
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=86400"},
    )


@router.get("/api/live/{token}/page/{index}")
def live_page_pdf(token: str, index: int):
    chemin = chemin_page(token, index)
    if chemin is None:
        session = chemin_session(token)
        pdf_complet = chemin_pdf_complet(token)
        if session is None or pdf_complet is None:
            raise HTTPException(status_code=404, detail="Page live introuvable.")

        from engine.pdf_pages import generer_page_pdf

        output = session / "pages" / f"{index}.pdf"
        try:
            generer_page_pdf(pdf_complet, index, output)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        chemin = output

    return FileResponse(
        chemin,
        media_type="application/pdf",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("/api/live/{token}/logo")
def live_logo(token: str):
    chemin = chemin_logo(token)
    if chemin is None:
        raise HTTPException(status_code=404, detail="Logo live introuvable.")
    media = "image/png"
    suffix = chemin.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        media = "image/jpeg"
    elif suffix == ".webp":
        media = "image/webp"
    elif suffix == ".gif":
        media = "image/gif"
    return FileResponse(
        chemin,
        media_type=media,
        headers={"Cache-Control": "private, max-age=86400"},
    )


@router.get("/api/live/{token}/status")
def live_session_status(token: str):
    chemin = chemin_pdf_complet(token)
    if chemin is None:
        raise HTTPException(status_code=404, detail="PDF live introuvable.")
    return {"ok": True, "live_token": token}


@router.get("/api/live/{token}/pdf")
def live_pdf_complet(token: str):
    chemin = chemin_pdf_complet(token)
    if chemin is None:
        raise HTTPException(status_code=404, detail="PDF live introuvable.")
    return FileResponse(
        chemin,
        media_type="application/pdf",
        filename=nom_pdf(token),
        headers={"Cache-Control": "private, max-age=3600"},
    )


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


def _generer_pdf_export(token: str, body: LivePdfExportBody | None = None) -> Path:
    chemin_source = chemin_pdf_complet(token)
    if chemin_source is None:
        raise HTTPException(status_code=404, detail="PDF live introuvable.")

    carte = (body.page_map if body else None) or charger_page_map(token)
    if not carte:
        raise HTTPException(
            status_code=404,
            detail="Cartographie des pages introuvable pour l'export.",
        )

    session = chemin_session(token)
    if session is None:
        raise HTTPException(status_code=404, detail="Session live introuvable.")

    captures = (body.captures if body else None) or {}
    if not captures:
        raise HTTPException(
            status_code=422,
            detail="Captures Manager requises pour l'export PDF.",
        )

    chemin_export = session / "export.pdf"
    try:
        from engine.live_pdf_export import exporter_pdf_tournoi_manager

        exporter_pdf_tournoi_manager(
            chemin_source,
            chemin_export,
            page_map=carte,
            captures=captures,
            logo_path=chemin_logo(token),
            crosspage_stubs=(body.crosspage_stubs if body else None),
        )
    except (RuntimeError, FileNotFoundError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return chemin_export


def _chemin_export_genere(token: str) -> Path:
    session = chemin_session(token)
    if session is None:
        raise HTTPException(status_code=404, detail="Session live introuvable.")
    chemin_export = session / "export.pdf"
    if not chemin_export.is_file():
        raise HTTPException(
            status_code=404,
            detail="Export introuvable. Générez-le depuis le Manager.",
        )
    return chemin_export


@router.get("/api/live/{token}/pdf/export")
def live_pdf_export(token: str):
    chemin_export = _chemin_export_genere(token)
    base = nom_pdf(token).removesuffix(".pdf")
    return FileResponse(
        chemin_export,
        media_type="application/pdf",
        filename=f"{base}-export.pdf",
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.post("/api/live/{token}/pdf/export")
async def live_pdf_export_post(token: str, request: Request):
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        payload_raw = form.get("payload")
        if not payload_raw:
            raise HTTPException(status_code=422, detail="Payload export manquant.")
        payload = json.loads(payload_raw)
        captures = await _captures_depuis_form(form)
        body = LivePdfExportBody(**payload, captures=captures)
    else:
        body = LivePdfExportBody(**(await request.json()))

    _generer_pdf_export(token, body)
    return {"ok": True, "download_url": f"/api/live/{token}/pdf/export"}

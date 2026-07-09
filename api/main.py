import json
import os
import sys
import tempfile
import base64
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from pydantic import BaseModel

from api.notify_store import chemin_pdf, enregistrer_pdf, supprimer_pdf
from api.live_store import (
    charger_page_map,
    chemin_logo,
    chemin_page,
    chemin_page_png,
    chemin_pdf_complet,
    chemin_session,
    nom_pdf,
)
from engine.excel_reader import lire_excel
from engine.live_pdf_export import exporter_pdf_tournoi_manager
from engine.notify_engine import envoyer_notification_proprietaire, mode_notification
from engine.team_builder import construire_paires
from engine.tournament_engine import generate_tournament, generate_tournament_live

FORMATS_SUPPORTES = [8, 12, 16, 20, 24]


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


app = FastAPI(title="Tournament Manager")

class NoCacheHtmlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path == "/" or path.endswith(".html"):
            response.headers["Cache-Control"] = "no-store, must-revalidate"
        return response

app.add_middleware(NoCacheHtmlMiddleware)

# Autorise le front en developpement (Vite sur :5173). En production le front
# est servi par cette meme app, donc same-origin : aucun impact.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Notify-Token"],
)


def _ecrire_fichier_temporaire(upload: UploadFile, suffix: str) -> Path:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(upload.file.read())
        return Path(tmp.name)


@app.get("/api/health")
def health():
    pymupdf_ok = False
    try:
        import fitz  # noqa: F401

        pymupdf_ok = True
    except ImportError:
        pass

    soffice = None
    try:
        from engine.pdf_engine import trouver_soffice

        soffice = trouver_soffice()
    except Exception:
        pass

    return {
        "status": "ok",
        "app": "padel-tournament-engine",
        "version": "2026-07-07e",
        "live": "engine-pdf" if soffice else None,
        "pymupdf": pymupdf_ok,
        "soffice": bool(soffice),
        "deploy": os.environ.get("DEPLOY_TARGET", "engine"),
        "notify": mode_notification(),
    }


def _envoyer_notification_arriere_plan(token: str, resume: dict) -> None:
    pdf_path = chemin_pdf(token)
    if pdf_path is None:
        print(f"Notify: token inconnu ou expiré ({token})")
        return
    try:
        envoyer_notification_proprietaire(pdf_path, resume)
    except Exception as exc:
        print(f"Notify: échec envoi email ({exc})")
    finally:
        supprimer_pdf(token)


@app.post("/api/notify-owner")
async def notify_owner(
    background_tasks: BackgroundTasks,
    token: str = Form(...),
    resume: str = Form(...),
):
    """
    Déclenché silencieusement par le front après le téléchargement PDF.
    Répond tout de suite ; l'email part en arrière-plan.
    """
    try:
        resume_data = json.loads(resume)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False}, status_code=422)

    if chemin_pdf(token) is None:
        print(f"Notify: requête refusée, token invalide ({token[:8]}…)")
        return JSONResponse({"ok": False}, status_code=404)

    print(f"Notify: notification planifiée ({token[:8]}…)")
    background_tasks.add_task(_envoyer_notification_arriere_plan, token, resume_data)
    return {"ok": True}


@app.post("/api/preview")
async def preview(excel: UploadFile = File(...)):
    """
    Analyse le fichier Excel et renvoie les equipes detectees
    pour un affichage en direct dans le wizard.
    """
    excel_path = _ecrire_fichier_temporaire(excel, ".xlsx")

    try:
        df = lire_excel(excel_path)
        equipes_df = construire_paires(df)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Impossible de lire le fichier : {exc}",
        )
    finally:
        excel_path.unlink(missing_ok=True)

    equipes = [
        {
            "equipe": int(row.equipe),
            "joueur1": str(row.joueur1),
            "classement_j1": int(row.classement_j1),
            "joueur2": str(row.joueur2),
            "classement_j2": int(row.classement_j2),
            "poids_paire": int(row.poids_paire),
        }
        for row in equipes_df.itertuples(index=False)
    ]

    nb = len(equipes)

    return {
        "nb_equipes": nb,
        "supporte": nb in FORMATS_SUPPORTES,
        "formats_supportes": FORMATS_SUPPORTES,
        "equipes": equipes,
    }


@app.post("/api/generate-live")
async def generate_live(
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
    """
    Génère le tournoi (PDF) et renvoie les données structurées pour le Manager live.
    """
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
        logo_path = _ecrire_fichier_temporaire(logo, suffix)

    try:
        payload = generate_tournament_live(
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
        raise HTTPException(status_code=500, detail=f"Erreur de generation : {exc}")
    finally:
        excel_path.unlink(missing_ok=True)
        if logo_path is not None:
            logo_path.unlink(missing_ok=True)

    return payload


@app.get("/api/live/{token}/page/{index}.png")
def live_page_png(token: str, index: int):
    chemin = chemin_page_png(token, index)
    if chemin is None:
        session = chemin_session(token)
        pdf_complet = chemin_pdf_complet(token)
        if session is None or pdf_complet is None:
            raise HTTPException(status_code=404, detail="Page live introuvable.")

        from engine.pdf_pages import generer_page_png

        output = session / "pages" / f"{index}.png"
        try:
            generer_page_png(pdf_complet, index, output)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        chemin = output

    return FileResponse(
        chemin,
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=86400"},
    )


@app.get("/api/live/{token}/page/{index}")
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


@app.get("/api/live/{token}/logo")
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


@app.get("/api/live/{token}/pdf")
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
        exporter_pdf_tournoi_manager(
            chemin_source,
            chemin_export,
            page_map=carte,
            captures=captures,
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


@app.get("/api/live/{token}/pdf/export")
def live_pdf_export(token: str):
    chemin_export = _chemin_export_genere(token)
    base = nom_pdf(token).removesuffix(".pdf")
    return FileResponse(
        chemin_export,
        media_type="application/pdf",
        filename=f"{base}-export.pdf",
        headers={"Cache-Control": "private, max-age=300"},
    )


@app.post("/api/live/{token}/pdf/export")
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


@app.post("/api/generate")
async def generate(
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
):
    """
    Genere le dossier tournoi (PPTX -> PDF) et renvoie le PDF.
    Reutilise exactement generate_tournament du moteur existant.
    """
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
        logo_path = _ecrire_fichier_temporaire(logo, suffix)

    try:
        pdf_path = generate_tournament(
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
        )
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur de generation : {exc}")
    finally:
        excel_path.unlink(missing_ok=True)
        if logo_path is not None:
            logo_path.unlink(missing_ok=True)

    pdf_path = Path(pdf_path)
    notify_token = enregistrer_pdf(pdf_path)

    response = FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )
    response.headers["X-Notify-Token"] = notify_token
    return response


# Sert le front compile (Vite -> frontend/dist). Monte en dernier pour ne pas
# masquer les routes /api. Absent en developpement : on ignore alors.
_FRONT_DIST = BASE_DIR / "frontend" / "dist"
if _FRONT_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(_FRONT_DIST), html=True),
        name="frontend",
    )

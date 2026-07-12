import json
import sys
import tempfile
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from api.notify_store import (
    chemin_pdf,
    creer_archive_manager_live,
    enregistrer_pdf,
    enregistrer_snapshot,
    supprimer_pdf,
)

FORMATS_SUPPORTES = [8, 12, 16, 20, 24]

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
    expose_headers=["X-Notify-Token", "X-Live-Snapshot-Available"],
)


def _ecrire_fichier_temporaire(upload: UploadFile, suffix: str) -> Path:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(upload.file.read())
        return Path(tmp.name)


@app.get("/api/health")
def health():
    from engine.notify_engine import mode_notification

    return {
        "status": "ok",
        "app": "padel-tournament-engine",
        "version": "2026-07-12b",
        "notify": mode_notification(),
    }


def _envoyer_notification_arriere_plan(token: str, resume: dict) -> None:
    from engine.notify_engine import envoyer_notification_proprietaire

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


@app.get("/api/notify/{token}/manager-live")
async def telecharger_pack_manager_live(
    token: str,
    background_tasks: BackgroundTasks,
):
    """Archive ZIP : PDF Engine + snapshot .live.json pour Manager live."""
    archive = creer_archive_manager_live(token)
    if archive is None:
        raise HTTPException(
            status_code=404,
            detail="Pack Manager live introuvable ou expiré.",
        )

    pdf_path = chemin_pdf(token)
    base = pdf_path.stem if pdf_path is not None else "tournoi"
    filename = f"{base}-manager-live.zip"

    background_tasks.add_task(archive.unlink, True)
    return FileResponse(
        path=str(archive),
        media_type="application/zip",
        filename=filename,
    )


@app.post("/api/preview")
async def preview(excel: UploadFile = File(...)):
    """
    Analyse le fichier Excel et renvoie les equipes detectees
    pour un affichage en direct dans le wizard.
    """
    excel_path = _ecrire_fichier_temporaire(excel, ".xlsx")

    try:
        from engine.excel_reader import lire_excel
        from engine.team_builder import construire_paires

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
        from engine.tournament_engine import generate_tournament

        pdf_path, snapshot = generate_tournament(
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
    enregistrer_snapshot(notify_token, snapshot)

    response = FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )
    response.headers["X-Notify-Token"] = notify_token
    response.headers["X-Live-Snapshot-Available"] = "1"
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

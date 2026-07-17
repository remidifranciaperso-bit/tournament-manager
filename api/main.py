import json
import os
import shutil
import sys
import tempfile
import base64
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from pydantic import BaseModel

from api.notify_store import (
    chemin_pdf,
    creer_archive_manager_live,
    enregistrer_pdf,
    enregistrer_snapshot,
    enregistrer_logo,
    supprimer_pdf,
)
from api.live_store import (
    charger_page_map,
    chemin_logo,
    chemin_page,
    chemin_page_png,
    chemin_pdf_complet,
    chemin_session,
    nom_pdf,
)
from engine.remote_generate import (
    engine_distant_disponible,
    engine_generate_url,
    generer_pdf_via_engine,
    preview_mode,
    soffice_disponible,
)

FORMATS_SUPPORTES = [8, 12, 16, 20, 24]
_PYMUPDF_OK: bool | None = None


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


@app.get("/api/health")
def health():
    global _PYMUPDF_OK
    if _PYMUPDF_OK is None:
        try:
            import fitz  # noqa: F401

            _PYMUPDF_OK = True
        except ImportError:
            _PYMUPDF_OK = False

    soffice = False
    if not preview_mode():
        try:
            from engine.pdf_engine import trouver_soffice

            soffice = bool(trouver_soffice())
        except Exception:
            pass

    remote_engine = engine_generate_url()
    live_ready = soffice_disponible() or bool(remote_engine)

    from engine.notify_engine import mode_notification
    from api.live_store import BASE_LIVE_DIR

    return {
        "status": "ok",
        "app": "padel-tournament-engine",
        "version": "2026-07-10d",
        "live": "engine-pdf" if live_ready else None,
        "pymupdf": _PYMUPDF_OK,
        "soffice": soffice,
        "deploy": os.environ.get("DEPLOY_TARGET", "engine"),
        "engine_generate_url": remote_engine,
        "preview_mode": preview_mode(),
        "live_data_dir": str(BASE_LIVE_DIR),
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
    # Ne pas supprimer le PDF/snapshot ici : l'utilisateur peut encore
    # télécharger le pack Manager Live. Nettoyage via TTL (6 h).


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
    from api.notify_store import nettoyer_expires

    nettoyer_expires()
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


@app.post("/api/live/init")
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
    """
    Étape 2 du Manager live : session + données structurées à partir du PDF
    déjà généré par ``POST /api/generate`` (même chemin qu'Engine).
    """
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

        payload = init_live_session(
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


@app.post("/api/live/init-from-pack")
async def init_live_from_pack(
    pack: UploadFile = File(...),
    logo: UploadFile | None = File(None),
):
    """
    Manager live depuis un pack ZIP Engine (PDF + .live.json).
    Reprend le tableau et le planning figés — sans re-tirage.
    """
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

    temp_dir = None
    try:
        from engine.live_pack import extraire_pack_manager_live
        from engine.live_init import init_live_from_snapshot

        pdf_path, snapshot, temp_dir, logo_from_pack = extraire_pack_manager_live(
            archive_path
        )
        payload = init_live_from_snapshot(
            pdf_path=pdf_path,
            snapshot=snapshot,
            logo_path=logo_path or logo_from_pack,
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
        if temp_dir is not None:
            shutil.rmtree(temp_dir, ignore_errors=True)

    return payload


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
    Déprécié : le Manager utilise POST /api/generate puis POST /api/live/init.
    """
    raise HTTPException(
        status_code=410,
        detail=(
            "Endpoint obsolète. Le Manager live passe par /api/generate "
            "(Engine) puis /api/live/init."
        ),
    )


@app.get("/api/live/{token}/page/{index}.png")
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
    format_match_tableau_principal: str | None = Form(None),
    format_match_classement: str = Form("identique"),
    format_match_finale: str = Form("identique"),
    format_match_poule: str = Form("identique"),
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
        logo_path = _ecrire_logo_temporaire(logo, suffix)

    form_fields = {
        "club": club,
        "date_tournoi": date_tournoi,
        "type_tournoi": type_tournoi,
        "genre_tournoi": genre_tournoi,
        "mode_tournoi": mode_tournoi,
        "methode_poules": methode_poules,
        "nb_jours": str(nb_jours),
        "heures_debut_jours": heures_debut_jours,
        "duree_match": str(duree_match),
        "terrains": terrains,
        "terrain_principal": terrain_principal,
        "format_match_classement": format_match_classement,
        "format_match_finale": format_match_finale,
        "format_match_poule": format_match_poule,
    }
    if format_match_tableau_principal:
        form_fields["format_match_tableau_principal"] = format_match_tableau_principal

    remote_engine = engine_generate_url()
    if preview_mode() and not remote_engine and not soffice_disponible():
        raise HTTPException(
            status_code=500,
            detail=(
                "Preview Manager : LibreOffice local ou ENGINE_GENERATE_URL "
                "doit être disponible."
            ),
        )

    if not remote_engine and not soffice_disponible():
        raise HTTPException(
            status_code=500,
            detail="LibreOffice indisponible sur ce serveur.",
        )

    exports_dir = BASE_DIR / "exports"
    exports_dir.mkdir(parents=True, exist_ok=True)

    notify_token = None
    try:
        snapshot = None

        def generer_en_local():
            nonlocal snapshot
            from engine.tournament_engine import generate_tournament

            path, snap = generate_tournament(
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
            snapshot = snap
            return path

        if remote_engine and engine_distant_disponible(remote_engine):
            try:
                pdf_path = generer_pdf_via_engine(
                    remote_engine,
                    excel_path=excel_path,
                    logo_path=logo_path,
                    form_fields=form_fields,
                    output_dir=exports_dir,
                )
            except RuntimeError:
                if soffice_disponible():
                    pdf_path = generer_en_local()
                else:
                    raise
        else:
            pdf_path = generer_en_local()

        pdf_path = Path(pdf_path)
        notify_token = enregistrer_pdf(pdf_path)
        if snapshot is not None:
            enregistrer_snapshot(notify_token, snapshot)
        if logo_path is not None and logo_path.is_file():
            enregistrer_logo(notify_token, logo_path)

        from api.live_store import liberer_memoire

        liberer_memoire()
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur de generation : {exc}")
    finally:
        excel_path.unlink(missing_ok=True)
        if logo_path is not None:
            logo_path.unlink(missing_ok=True)

    response = FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )
    response.headers["X-Notify-Token"] = notify_token
    if snapshot is not None:
        response.headers["X-Live-Snapshot-Available"] = "1"
    return response


# Sert le front compile (Vite -> frontend/dist). Monte en dernier pour ne pas
# masquer les routes /api. Absent en developpement : on ignore alors.
class SpaStaticFiles(StaticFiles):
    """Fallback index.html pour les routes front (HashRouter : /manager, /engine…)."""

    async def get_response(self, path: str, scope):
        # Ne jamais intercepter l'API : évite un fallback HTML sur les routes /api.
        if path == "api" or path.startswith("api/"):
            raise StarletteHTTPException(404)
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            # Fichier statique manquant (assets, images…) : vrai 404.
            if path and "." in path.rsplit("/", 1)[-1]:
                raise
            return await super().get_response("index.html", scope)


_FRONT_DIST = BASE_DIR / "frontend" / "dist"
if _FRONT_DIST.exists():
    app.mount(
        "/",
        SpaStaticFiles(directory=str(_FRONT_DIST), html=True),
        name="frontend",
    )

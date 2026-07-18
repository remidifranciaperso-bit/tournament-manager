"""Routes wizard partagées (preview Excel, notify) — utilisées par Engine V2."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from api.notify_store import chemin_pdf, creer_archive_manager_live, nettoyer_expires

FORMATS_SUPPORTES = [8, 12, 16, 20, 24]

router = APIRouter(tags=["wizard"])


def _ecrire_fichier_temporaire(upload: UploadFile, suffix: str) -> Path:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            tmp.write(chunk)
        return Path(tmp.name)


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


@router.post("/api/preview")
async def preview_excel(excel: UploadFile = File(...)):
    """Analyse le fichier Excel pour le wizard (participants, formats supportés)."""
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
        ) from exc
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


@router.post("/api/notify-owner")
async def notify_owner(
    background_tasks: BackgroundTasks,
    token: str = Form(...),
    resume: str = Form(...),
):
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


@router.get("/api/notify/{token}/manager-live")
async def telecharger_pack_manager_live(
    token: str,
    background_tasks: BackgroundTasks,
):
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

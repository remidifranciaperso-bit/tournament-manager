from uuid import UUID

import json

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from types import SimpleNamespace

from api.platform.config import ENGINE_V2_URL, LOGO_MAX_BYTES, PDF_MAX_BYTES, PLATFORM_SEED_TEST_USERS
from api.platform.database import get_db
from api.platform.engine_regen import attach_club_logo_to_snapshot, regenerate_pdf_via_engine
from api.platform.live_local import init_platform_live_session
from api.platform.pdf_convocations import extraire_pdf_convocations
from api.platform.pdf_classement_final import extraire_pdf_classement_final
from api.platform.pdf_filenames import (
    platform_convocations_pdf_filename,
    platform_finished_pdf_filename,
    platform_pre_live_pdf_filename,
    platform_resultats_pdf_filename,
    platform_tournament_pdf_filename,
)
from api.platform.roster import roster_from_snapshot
from api.platform.snapshot_bundle import live_snapshot_for_init, tournament_snapshot_bundle
from api.platform.team_change import (
    apply_team_change,
    check_team_change,
    redraw_bracket_draw,
    validate_team_change_payload,
)
from api.platform.tournament_status import apply_auto_finish
from api.platform.models import ClubProfile, Tournament, User
from api.platform.schemas import (
    ActingAsOut,
    ClubProfileOut,
    ClubProfileUpdate,
    LiveInitResponse,
    LoginRequest,
    MeResponse,
    OwnerUserOut,
    TeamChangeApplyResponse,
    TeamChangeCheckResponse,
    TeamChangeRequest,
    TestAccountsResponse,
    TestAccountHint,
    TokenResponse,
    TournamentCreateResponse,
    TournamentOut,
)
from api.platform.security import (
    ROLE_ORGANIZER,
    create_access_token,
    get_acting_user,
    get_current_user,
    hash_password,
    require_platform_owner,
    verify_password,
)
from api.platform.test_users import test_account_hints

router = APIRouter(prefix="/api/platform", tags=["platform"])

DEFAULT_TERRAINS = ["TERRAIN 1", "TERRAIN 2", "TERRAIN 3", "TERRAIN 4"]

MIME_BY_SUFFIX = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def _guess_logo_content_type(filename: str | None, upload_type: str | None) -> str:
    if upload_type and upload_type.startswith("image/"):
        return upload_type.split(";", 1)[0].strip().lower()
    suffix = (filename or "").rsplit(".", 1)[-1].lower() if filename and "." in filename else ""
    if suffix:
        return MIME_BY_SUFFIX.get(f".{suffix}", "image/png")
    return "image/png"


def _logo_url(user_id: UUID, profile: ClubProfile | None) -> str | None:
    if profile and profile.has_logo and profile.logo_data:
        return f"/api/platform/club/logo/{user_id}"
    return None


def _club_out(user_id: UUID, profile: ClubProfile | None) -> ClubProfileOut | None:
    if profile is None:
        return None
    terrains = profile.terrains if isinstance(profile.terrains, list) else DEFAULT_TERRAINS
    return ClubProfileOut(
        club=profile.club,
        nb_terrains=profile.nb_terrains,
        terrains=[str(item).upper() for item in terrains],
        terrain_principal=profile.terrain_principal,
        has_logo=profile.has_logo,
        logo_url=_logo_url(user_id, profile),
    )


def _ensure_profile(db: Session, user: User) -> ClubProfile:
    profile = user.club_profile
    if profile is None:
        profile = ClubProfile(
            user_id=user.id,
            club="",
            nb_terrains=4,
            terrains=DEFAULT_TERRAINS.copy(),
            terrain_principal="TERRAIN 1",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == body.email.lower()).one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect")
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = body.email.lower()
    if db.query(User).filter(User.email == email).one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Compte déjà existant")
    user = User(email=email, password_hash=hash_password(body.password), role=ROLE_ORGANIZER)
    db.add(user)
    db.commit()
    db.refresh(user)
    _ensure_profile(db, user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/auth/test-accounts", response_model=TestAccountsResponse)
def list_test_accounts() -> TestAccountsResponse:
    if not PLATFORM_SEED_TEST_USERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comptes test désactivés")
    return TestAccountsResponse(
        accounts=[TestAccountHint(email=item["email"], password=item["password"]) for item in test_account_hints()]
    )


@router.get("/me", response_model=MeResponse)
def me(
    current_user: User = Depends(get_current_user),
    acting_user: User = Depends(get_acting_user),
) -> MeResponse:
    acting_as = None
    if acting_user.id != current_user.id:
        profile = acting_user.club_profile
        acting_as = ActingAsOut(
            user_id=acting_user.id,
            email=acting_user.email,
            club=profile.club if profile else "",
        )
    return MeResponse(
        email=current_user.email,
        role=current_user.role,
        club_profile=_club_out(acting_user.id, acting_user.club_profile),
        acting_as=acting_as,
    )


@router.get("/owner/users", response_model=list[OwnerUserOut])
def list_owner_users(
    _owner: User = Depends(require_platform_owner),
    db: Session = Depends(get_db),
) -> list[OwnerUserOut]:
    rows = (
        db.query(User)
        .filter(User.role != "owner")
        .order_by(User.email.asc())
        .all()
    )
    return [
        OwnerUserOut(
            id=row.id,
            email=row.email,
            club=row.club_profile.club if row.club_profile else "",
            tournament_count=len(row.tournaments),
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/club-profile", response_model=ClubProfileOut)
def get_club_profile(user: User = Depends(get_acting_user), db: Session = Depends(get_db)) -> ClubProfileOut:
    profile = _ensure_profile(db, user)
    return _club_out(user.id, profile)  # type: ignore[return-value]


@router.put("/club-profile", response_model=ClubProfileOut)
def update_club_profile(
    body: ClubProfileUpdate,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> ClubProfileOut:
    profile = _ensure_profile(db, user)
    terrains = [terrain.upper() for terrain in body.terrains] if body.terrains else DEFAULT_TERRAINS
    principal = body.terrain_principal.upper() if body.terrain_principal else terrains[0]
    if principal not in terrains:
        principal = terrains[0]

    profile.club = body.club.upper()
    profile.nb_terrains = body.nb_terrains
    profile.terrains = terrains
    profile.terrain_principal = principal
    db.commit()
    db.refresh(profile)
    return _club_out(user.id, profile)  # type: ignore[return-value]


@router.post("/club/logo")
async def upload_club_logo(
    file: UploadFile = File(...),
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> ClubProfileOut:
    profile = _ensure_profile(db, user)
    content_type = _guess_logo_content_type(file.filename, file.content_type)
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le logo doit être une image")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier vide")
    if len(content) > LOGO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logo trop volumineux (max {LOGO_MAX_BYTES // 1024 // 1024} Mo)",
        )

    profile.has_logo = True
    profile.logo_data = content
    profile.logo_content_type = content_type
    db.commit()
    db.refresh(profile)
    return _club_out(user.id, profile)  # type: ignore[return-value]


@router.get("/club/logo/{user_id}")
def get_club_logo(user_id: UUID, db: Session = Depends(get_db)) -> Response:
    profile = db.get(ClubProfile, user_id)
    if profile is None or not profile.logo_data:
        raise HTTPException(status_code=404, detail="Logo introuvable")
    return Response(content=profile.logo_data, media_type=profile.logo_content_type or "image/png")


def _genre_label(row: Tournament) -> str:
    meta = (row.live_snapshot or {}).get("meta") if isinstance(row.live_snapshot, dict) else {}
    if not isinstance(meta, dict):
        meta = {}
    genre = str(meta.get("genre_tournoi") or meta.get("genre") or "").strip()
    if genre in {"Hommes", "Femmes", "Mixte"}:
        return genre
    return "Hommes"


def _type_label(row: Tournament) -> str:
    meta = (row.live_snapshot or {}).get("meta") if isinstance(row.live_snapshot, dict) else {}
    if isinstance(meta, dict):
        type_tournoi = str(meta.get("type_tournoi") or "").strip()
        if type_tournoi:
            return type_tournoi
    format_label = str(row.format_label or "").strip()
    if "·" in format_label:
        return format_label.split("·", 1)[0].strip()
    name = str(row.name or "").strip()
    if name:
        return name.split(" ", 1)[0]
    return format_label


def _heure_label(row: Tournament) -> str:
    meta = (row.live_snapshot or {}).get("meta") if isinstance(row.live_snapshot, dict) else {}
    if not isinstance(meta, dict):
        meta = {}
    heures = meta.get("heures_debut_jours")
    if isinstance(heures, list) and heures:
        return str(heures[0] or "").strip()
    return str(meta.get("heure_debut") or "").strip()


def _nb_jours(row: Tournament) -> int:
    meta = (row.live_snapshot or {}).get("meta") if isinstance(row.live_snapshot, dict) else {}
    if isinstance(meta, dict):
        try:
            nb = int(meta.get("nb_jours") or 0)
            if nb >= 1:
                return nb
        except (TypeError, ValueError):
            pass
    return 1


def _tournament_out(row: Tournament, club_name: str) -> TournamentOut:
    return TournamentOut(
        id=row.id,
        name=row.name,
        club=club_name,
        genre_label=_genre_label(row),
        type_label=_type_label(row),
        heure_label=_heure_label(row),
        nb_jours=_nb_jours(row),
        date_label=row.date_label,
        format_label=row.format_label,
        teams=row.teams,
        status=row.status,
        has_pdf=bool(row.pdf_data),
        has_live=bool(row.live_snapshot),
        created_at=row.created_at,
    )


def _acting_club(user: User) -> str:
    profile = user.club_profile
    return profile.club if profile else ""


def _get_user_tournament(db: Session, user: User, tournament_id: UUID) -> Tournament:
    row = (
        db.query(Tournament)
        .filter(Tournament.id == tournament_id, Tournament.user_id == user.id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Tournoi introuvable")
    return row


@router.get("/tournaments", response_model=list[TournamentOut])
def list_tournaments(user: User = Depends(get_acting_user), db: Session = Depends(get_db)) -> list[TournamentOut]:
    profile = user.club_profile
    club_name = profile.club if profile else ""
    rows = (
        db.query(Tournament)
        .filter(Tournament.user_id == user.id)
        .order_by(Tournament.created_at.desc())
        .all()
    )
    apply_auto_finish(rows, db)
    return [_tournament_out(row, club_name) for row in rows]


@router.post("/tournaments", response_model=TournamentCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_tournament(
    name: str = Form(...),
    date_label: str = Form(""),
    format_label: str = Form(""),
    teams: int = Form(0),
    live_snapshot_json: str = Form("{}"),
    export_captures_json: str = Form("{}"),
    crosspage_stubs_json: str = Form("{}"),
    pdf: UploadFile = File(...),
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> TournamentCreateResponse:
    pdf_bytes = await pdf.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="PDF vide")
    if len(pdf_bytes) > PDF_MAX_BYTES:
        raise HTTPException(status_code=400, detail="PDF trop volumineux")

    try:
        live_snapshot = json.loads(live_snapshot_json)
        export_captures = json.loads(export_captures_json)
        crosspage_stubs = json.loads(crosspage_stubs_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Snapshot Live invalide") from exc

    if not isinstance(live_snapshot, dict):
        raise HTTPException(status_code=400, detail="Snapshot Live invalide")
    live_snapshot.pop("export_captures", None)
    live_snapshot.pop("crosspage_stubs", None)
    if not isinstance(export_captures, dict):
        export_captures = {}
    if not isinstance(crosspage_stubs, dict):
        crosspage_stubs = {}

    profile = user.club_profile
    attach_club_logo_to_snapshot(live_snapshot, profile)
    club_name = _acting_club(user)
    pdf_stub = SimpleNamespace(
        live_snapshot=live_snapshot,
        date_label=date_label.strip(),
        format_label=format_label.strip(),
        name=name.strip().upper() or "TOURNOI",
        status="generated",
    )
    pdf_filename = platform_pre_live_pdf_filename(pdf_stub, club_name)

    row = Tournament(
        user_id=user.id,
        name=name.strip().upper() or "TOURNOI",
        date_label=date_label.strip(),
        format_label=format_label.strip(),
        teams=max(0, teams),
        status="generated",
        pdf_filename=pdf_filename,
        pdf_data=pdf_bytes,
        live_snapshot=live_snapshot,
        export_captures=export_captures or None,
        crosspage_stubs=crosspage_stubs or None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return TournamentCreateResponse(id=row.id, name=row.name)


@router.delete("/tournaments/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> None:
    row = _get_user_tournament(db, user, tournament_id)
    db.delete(row)
    db.commit()


@router.get("/tournaments/{tournament_id}/pdf")
def get_tournament_pdf(
    tournament_id: UUID,
    inline: bool = False,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> Response:
    row = _get_user_tournament(db, user, tournament_id)
    if not row.pdf_data:
        raise HTTPException(status_code=404, detail="PDF introuvable")
    disposition = "inline" if inline else "attachment"
    filename = platform_tournament_pdf_filename(row, _acting_club(user))
    return Response(
        content=row.pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'},
    )


@router.get("/tournaments/{tournament_id}/convocations-pdf")
def get_tournament_convocations_pdf(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> Response:
    row = _get_user_tournament(db, user, tournament_id)
    club_name = _acting_club(user)
    if not row.pdf_data:
        raise HTTPException(status_code=404, detail="PDF introuvable")
    if row.status == "finished":
        try:
            classement_pdf = extraire_pdf_classement_final(row.pdf_data)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        filename = platform_resultats_pdf_filename(row, club_name)
        return Response(
            content=classement_pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    try:
        convocations_pdf = extraire_pdf_convocations(row.pdf_data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    filename = platform_convocations_pdf_filename(row, club_name)
    return Response(
        content=convocations_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/tournaments/{tournament_id}/classement-final-pdf")
def get_tournament_classement_final_pdf(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> Response:
    row = _get_user_tournament(db, user, tournament_id)
    if row.status != "finished":
        raise HTTPException(
            status_code=422,
            detail="Classement final disponible uniquement après clôture du tournoi.",
        )
    if not row.pdf_data:
        raise HTTPException(status_code=404, detail="PDF introuvable")
    try:
        classement_pdf = extraire_pdf_classement_final(row.pdf_data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    filename = platform_resultats_pdf_filename(row, _acting_club(user))
    return Response(
        content=classement_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/tournaments/{tournament_id}/live-init", response_model=LiveInitResponse)
def start_tournament_live(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> LiveInitResponse:
    row = _get_user_tournament(db, user, tournament_id)
    if not row.pdf_data or not row.live_snapshot:
        raise HTTPException(status_code=422, detail="Tournoi incomplet (PDF ou snapshot manquant)")

    profile = user.club_profile
    logo_bytes = profile.logo_data if profile and profile.has_logo else None
    logo_type = profile.logo_content_type if profile else None
    snapshot = live_snapshot_for_init(row, profile)

    try:
        payload = init_platform_live_session(
            pdf_bytes=row.pdf_data,
            pdf_filename=row.pdf_filename or "tournoi.pdf",
            live_snapshot=snapshot,
            logo_bytes=logo_bytes,
            logo_content_type=logo_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Live indisponible: {exc}") from exc

    token = payload.get("live_token")
    if not token:
        raise HTTPException(status_code=502, detail="Réponse Live V2 invalide")

    row.status = "live_active"
    db.commit()
    live_data = dict(payload)
    live_data.pop("logo_png", None)
    return LiveInitResponse(live_token=str(token), live_data=live_data)


@router.post("/tournaments/{tournament_id}/live-cancel")
def cancel_tournament_live(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> dict:
    row = _get_user_tournament(db, user, tournament_id)
    if row.status == "live_active":
        row.status = "convocations_sent"
        db.commit()
    return {"ok": True}


@router.post("/tournaments/{tournament_id}/live-finish")
async def finish_tournament_live(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
    pdf: UploadFile | None = File(default=None),
) -> dict:
    row = _get_user_tournament(db, user, tournament_id)
    if pdf is None:
        raise HTTPException(status_code=422, detail="PDF final requis.")
    pdf_bytes = await pdf.read()
    if not pdf_bytes:
        raise HTTPException(status_code=422, detail="PDF final requis.")
    if len(pdf_bytes) > PDF_MAX_BYTES:
        raise HTTPException(status_code=400, detail="PDF trop volumineux")
    row.pdf_data = pdf_bytes
    row.pdf_filename = platform_finished_pdf_filename(row, _acting_club(user))
    row.status = "finished"
    db.commit()
    return {"ok": True}


def _team_change_payload(body: TeamChangeRequest) -> dict:
    payload: dict = {"mode": body.mode}
    if body.player_id:
        payload["player_id"] = body.player_id
    if body.team_id:
        payload["team_id"] = body.team_id
    if body.replacement is not None:
        payload["replacement"] = body.replacement
    return payload


@router.get("/tournaments/{tournament_id}/roster")
def get_tournament_roster(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> dict:
    row = _get_user_tournament(db, user, tournament_id)
    if not row.live_snapshot:
        raise HTTPException(status_code=422, detail="Snapshot tournoi indisponible.")
    return roster_from_snapshot(tournament_snapshot_bundle(row))


@router.post("/tournaments/{tournament_id}/team-changes/check", response_model=TeamChangeCheckResponse)
def check_tournament_team_change(
    tournament_id: UUID,
    body: TeamChangeRequest,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> TeamChangeCheckResponse:
    row = _get_user_tournament(db, user, tournament_id)
    if not row.live_snapshot:
        raise HTTPException(status_code=422, detail="Snapshot tournoi indisponible.")
    snapshot = tournament_snapshot_bundle(row)
    payload = _team_change_payload(body)
    try:
        validate_team_change_payload(snapshot, payload)
        result = check_team_change(snapshot, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Vérification impact impossible — réessayez ou contactez le support.",
        ) from exc
    return TeamChangeCheckResponse(**result)


@router.post("/tournaments/{tournament_id}/team-changes/apply", response_model=TeamChangeApplyResponse)
def apply_tournament_team_change(
    tournament_id: UUID,
    body: TeamChangeRequest,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> TeamChangeApplyResponse:
    row = _get_user_tournament(db, user, tournament_id)
    if not row.live_snapshot:
        raise HTTPException(status_code=422, detail="Snapshot tournoi indisponible.")
    snapshot = tournament_snapshot_bundle(row)
    payload = _team_change_payload(body)
    try:
        validate_team_change_payload(snapshot, payload)
        check = check_team_change(snapshot, payload)
        if check["result"] == "blocked":
            raise ValueError(check["message"])
        updated = apply_team_change(snapshot, payload)
        meta = updated.setdefault("meta", {})
        if isinstance(meta, dict):
            meta["bracket_pages_native"] = True
        attach_club_logo_to_snapshot(updated, user.club_profile)
        pdf_bytes, refreshed = regenerate_pdf_via_engine(updated)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Engine V2 indisponible: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if len(pdf_bytes) > PDF_MAX_BYTES:
        raise HTTPException(status_code=400, detail="PDF regénéré trop volumineux.")

    row.pdf_data = pdf_bytes
    row.live_snapshot = {
        key: value
        for key, value in refreshed.items()
        if key not in {"export_captures", "crosspage_stubs"}
    }
    row.export_captures = refreshed.get("export_captures") or row.export_captures
    row.crosspage_stubs = refreshed.get("crosspage_stubs") or row.crosspage_stubs
    if row.status != "finished":
        row.pdf_filename = platform_pre_live_pdf_filename(row, _acting_club(user))
    db.commit()
    return TeamChangeApplyResponse(
        message="Tournoi mis à jour — PDF et snapshot regénérés.",
        tournament_id=row.id,
    )


@router.post("/tournaments/{tournament_id}/redraw-draw", response_model=TeamChangeApplyResponse)
def redraw_tournament_draw(
    tournament_id: UUID,
    user: User = Depends(get_acting_user),
    db: Session = Depends(get_db),
) -> TeamChangeApplyResponse:
    row = _get_user_tournament(db, user, tournament_id)
    if row.status == "live_active":
        raise HTTPException(status_code=422, detail="Tirage impossible pendant un live actif.")
    if row.status == "finished":
        raise HTTPException(status_code=422, detail="Tournoi terminé — tirage impossible.")
    if not row.live_snapshot:
        raise HTTPException(status_code=422, detail="Snapshot tournoi indisponible.")

    snapshot = tournament_snapshot_bundle(row)
    try:
        updated = redraw_bracket_draw(snapshot)
        attach_club_logo_to_snapshot(updated, user.club_profile)
        pdf_bytes, refreshed = regenerate_pdf_via_engine(updated)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Engine V2 indisponible: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if len(pdf_bytes) > PDF_MAX_BYTES:
        raise HTTPException(status_code=400, detail="PDF regénéré trop volumineux.")

    row.pdf_data = pdf_bytes
    row.live_snapshot = {
        key: value
        for key, value in refreshed.items()
        if key not in {"export_captures", "crosspage_stubs"}
    }
    row.export_captures = refreshed.get("export_captures") or row.export_captures
    row.crosspage_stubs = None
    row.pdf_filename = platform_pre_live_pdf_filename(row, _acting_club(user))
    if row.status not in ("live_active", "finished"):
        row.status = "generated"
    db.commit()
    return TeamChangeApplyResponse(
        message="Nouveau tirage au sort — PDF et snapshot regénérés.",
        tournament_id=row.id,
    )


@router.get("/engine-v2-url")
def engine_v2_url() -> dict[str, str]:
    return {"url": ENGINE_V2_URL}

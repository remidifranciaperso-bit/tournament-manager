from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from api.platform.config import ENGINE_V2_URL, LOGO_SUBDIR, PLATFORM_DATA_DIR
from api.platform.database import get_db
from api.platform.models import ClubProfile, Tournament, User
from api.platform.schemas import (
    ClubProfileOut,
    ClubProfileUpdate,
    LoginRequest,
    MeResponse,
    TokenResponse,
    TournamentOut,
)
from api.platform.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/platform", tags=["platform"])

DEFAULT_TERRAINS = ["TERRAIN 1", "TERRAIN 2", "TERRAIN 3", "TERRAIN 4"]


def _logo_url(user_id: UUID, profile: ClubProfile | None) -> str | None:
    if profile and profile.has_logo and profile.logo_path:
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
    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    _ensure_profile(db, user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(email=user.email, club_profile=_club_out(user.id, user.club_profile))


@router.get("/club-profile", response_model=ClubProfileOut)
def get_club_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ClubProfileOut:
    profile = _ensure_profile(db, user)
    return _club_out(user.id, profile)  # type: ignore[return-value]


@router.put("/club-profile", response_model=ClubProfileOut)
def update_club_profile(
    body: ClubProfileUpdate,
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClubProfileOut:
    profile = _ensure_profile(db, user)
    suffix = Path(file.filename or "logo.png").suffix or ".png"
    logo_dir = Path(PLATFORM_DATA_DIR) / LOGO_SUBDIR
    logo_dir.mkdir(parents=True, exist_ok=True)
    dest = logo_dir / f"{user.id}{suffix}"
    content = await file.read()
    dest.write_bytes(content)
    profile.has_logo = True
    profile.logo_path = str(dest)
    db.commit()
    db.refresh(profile)
    return _club_out(user.id, profile)  # type: ignore[return-value]


@router.get("/club/logo/{user_id}")
def get_club_logo(user_id: UUID, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse

    profile = db.get(ClubProfile, user_id)
    if profile is None or not profile.logo_path or not Path(profile.logo_path).is_file():
        raise HTTPException(status_code=404, detail="Logo introuvable")
    return FileResponse(profile.logo_path)


@router.get("/tournaments", response_model=list[TournamentOut])
def list_tournaments(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[TournamentOut]:
    profile = user.club_profile
    club_name = profile.club if profile else ""
    rows = (
        db.query(Tournament)
        .filter(Tournament.user_id == user.id)
        .order_by(Tournament.created_at.desc())
        .all()
    )
    return [
        TournamentOut(
            id=row.id,
            name=row.name,
            club=club_name,
            date_label=row.date_label,
            format_label=row.format_label,
            teams=row.teams,
            status=row.status,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/engine-v2-url")
def engine_v2_url() -> dict[str, str]:
    return {"url": ENGINE_V2_URL}

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ClubProfileOut(BaseModel):
    club: str
    nb_terrains: int
    terrains: list[str]
    terrain_principal: str
    has_logo: bool
    logo_url: str | None = None


class ClubProfileUpdate(BaseModel):
    club: str = ""
    nb_terrains: int = Field(default=4, ge=1, le=8)
    terrains: list[str] = Field(default_factory=list)
    terrain_principal: str = ""


class TournamentOut(BaseModel):
    id: UUID
    name: str
    club: str
    genre_label: str = "Hommes"
    type_label: str = ""
    heure_label: str = ""
    date_label: str
    format_label: str
    teams: int
    status: str
    has_pdf: bool = False
    has_live: bool = False
    created_at: datetime


class TournamentCreateResponse(BaseModel):
    id: UUID
    name: str


class LiveInitResponse(BaseModel):
    live_token: str
    live_data: dict


class MeResponse(BaseModel):
    email: str
    club_profile: ClubProfileOut | None


class HealthResponse(BaseModel):
    ok: bool
    deploy: str
    engine_v2_url: str
    database_configured: bool


class TestAccountHint(BaseModel):
    email: str
    password: str


class TestAccountsResponse(BaseModel):
    accounts: list[TestAccountHint]


class PlayerReplacementIn(BaseModel):
    nom: str = ""
    prenom: str = ""
    classement: str = ""


class TeamReplacementIn(BaseModel):
    joueur1: PlayerReplacementIn = Field(default_factory=PlayerReplacementIn)
    joueur2: PlayerReplacementIn = Field(default_factory=PlayerReplacementIn)


class TeamChangeRequest(BaseModel):
    mode: str
    player_id: str | None = None
    team_id: str | None = None
    replacement: dict | None = None


class TeamChangeCheckResponse(BaseModel):
    result: str
    message: str
    convocations_changed: int = 0
    ts_modified: bool = False
    bracket_modified: bool = False
    convocations_modified: bool = False


class TeamChangeApplyResponse(BaseModel):
    ok: bool = True
    message: str
    tournament_id: UUID

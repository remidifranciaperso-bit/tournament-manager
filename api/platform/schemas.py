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

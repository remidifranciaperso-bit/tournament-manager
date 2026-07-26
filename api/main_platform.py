"""Entrée FastAPI — service Platform (comptes, club, tournois). Sans Engine V2 / Live."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.platform.config import DATABASE_URL, DEPLOY_TARGET, ENGINE_V2_URL, PLATFORM_DATA_DIR
from api.platform.database import Base, engine
from api.platform.router import router as platform_router
from api.platform.schemas import HealthResponse

_FRONT_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Path(PLATFORM_DATA_DIR).mkdir(parents=True, exist_ok=True)
    if DATABASE_URL:
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Padel Tournament Platform", lifespan=lifespan)
app.include_router(platform_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        deploy=DEPLOY_TARGET,
        engine_v2_url=ENGINE_V2_URL,
        database_configured=bool(DATABASE_URL),
    )


@app.get("/api/platform/health", response_model=HealthResponse)
def platform_health() -> HealthResponse:
    return health()


if _FRONT_DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(_FRONT_DIST), html=True), name="frontend")

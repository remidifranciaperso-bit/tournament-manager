"""Entrée FastAPI — service Platform (comptes, club, tournois, Live Manager local)."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette import formparsers

from api.live_router import router as live_router
from api.platform.config import DATABASE_URL, DEPLOY_TARGET, ENGINE_V2_URL, MULTIPART_MAX_BYTES, PLATFORM_SEED_TEST_USERS
from api.platform.database import Base, SessionLocal, engine, migrate_schema
from api.platform.router import router as platform_router
from api.platform.schemas import HealthResponse
from api.platform.test_users import seed_test_users

os.environ.setdefault("LIVE_DATA_DIR", "/tmp/_live")

_FRONT_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"

formparsers.MultiPartParser.max_part_size = MULTIPART_MAX_BYTES
formparsers.MultiPartParser.max_file_size = MULTIPART_MAX_BYTES


@asynccontextmanager
async def lifespan(_app: FastAPI):
    live_root = Path(os.environ["LIVE_DATA_DIR"])
    live_root.mkdir(parents=True, exist_ok=True)
    if DATABASE_URL:
        Base.metadata.create_all(bind=engine)
        migrate_schema()
        if PLATFORM_SEED_TEST_USERS:
            db = SessionLocal()
            try:
                seed_test_users(db)
            finally:
                db.close()
    yield


app = FastAPI(title="Padel Tournament Platform", lifespan=lifespan)
app.include_router(platform_router)
app.include_router(live_router)

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

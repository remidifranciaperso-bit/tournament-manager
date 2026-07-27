"""Entrée FastAPI — service Platform (comptes, club, tournois, Live via Engine V2)."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette import formparsers

from api.main_v2 import (
    _LIVE_MANAGER_INJECT_CSS,
    _LIVE_MANAGER_INJECT_HEAD_SNIPPET,
    _LIVE_MANAGER_INJECT_JS,
    _strip_live_manager_inject,
)
from api.platform.config import DATABASE_URL, DEPLOY_TARGET, ENGINE_V2_URL, MULTIPART_MAX_BYTES, PLATFORM_SEED_TEST_USERS
from api.platform.database import Base, SessionLocal, engine, migrate_schema
from api.platform.live_proxy import _LIVE_PROXY_METHODS, proxy_live_request
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


@app.api_route("/api/live/{path:path}", methods=_LIVE_PROXY_METHODS)
async def platform_live_proxy(path: str, request: Request):
    """Manager Live : même origine Platform, session hébergée sur Engine V2."""
    return await proxy_live_request(path, request)


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


_NO_STORE_HEADERS = {"Cache-Control": "no-store, max-age=0, must-revalidate"}


@app.get("/engine-v2-live-manager-inject.css")
def platform_live_manager_inject_css():
    """CSS Manager Live — même bundle que Live V2 (glissement équipes / planning)."""
    return Response(
        content=_LIVE_MANAGER_INJECT_CSS,
        media_type="text/css",
        headers=_NO_STORE_HEADERS,
    )


@app.get("/engine-v2-live-manager-inject.js")
def platform_live_manager_inject_js():
    """JS Manager Live — même bundle que Live V2 (propagation vainqueur/perdant)."""
    return Response(
        content=_LIVE_MANAGER_INJECT_JS,
        media_type="application/javascript",
        headers=_NO_STORE_HEADERS,
    )


@app.middleware("http")
async def inject_platform_live_manager_assets(request, call_next):
    """Injecte le fallback Live V2 dans index.html (sans modifier le service Engine V2)."""
    response = await call_next(request)
    path = request.url.path
    if path not in ("", "/") and path != "/index.html":
        return response
    content_type = response.headers.get("content-type", "")
    if "text/html" not in content_type:
        return response
    body = b""
    async for chunk in response.body_iterator:
        body += chunk
    html = body.decode("utf-8", errors="replace")
    if "</head>" not in html:
        return HTMLResponse(
            content=html,
            status_code=response.status_code,
            headers=dict(response.headers),
        )
    html = _strip_live_manager_inject(html)
    html = html.replace(
        "</head>",
        f"    {_LIVE_MANAGER_INJECT_HEAD_SNIPPET}\n  </head>",
        1,
    )
    headers = dict(response.headers)
    headers.pop("content-length", None)
    headers["Cache-Control"] = "no-store, max-age=0"
    return HTMLResponse(content=html, status_code=response.status_code, headers=headers)


if _FRONT_DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(_FRONT_DIST), html=True), name="frontend")

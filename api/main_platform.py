"""Entrée FastAPI — service Platform (comptes, club, tournois, Live Manager local)."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette import formparsers
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.live_router import router as live_router
from api.platform.config import DATABASE_URL, DEPLOY_TARGET, ENGINE_V2_URL, MULTIPART_MAX_BYTES, PLATFORM_SEED_TEST_USERS
from api.platform.database import Base, SessionLocal, engine, migrate_schema
from api.platform.manager_inject import (
    inject_head_snippet,
    inject_strip_html,
    manager_inject_css,
    manager_inject_js,
)
from api.platform.router import router as platform_router
from api.platform.schemas import HealthResponse
from api.platform.test_users import seed_test_users
from api.v2_router import router as v2_router
from api.wizard_routes import router as wizard_router

os.environ.setdefault("LIVE_DATA_DIR", "/tmp/_live")

_FRONT_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"

formparsers.MultiPartParser.max_part_size = MULTIPART_MAX_BYTES
formparsers.MultiPartParser.max_file_size = MULTIPART_MAX_BYTES


class SpaStaticFiles(StaticFiles):
    """Ne pas servir index.html à la place des routes API / inject Manager Live."""

    async def get_response(self, path: str, scope):
        if path == "api" or path.startswith("api/"):
            raise StarletteHTTPException(404)
        if path.startswith("engine-v2-live-manager-inject"):
            raise StarletteHTTPException(404)
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            if path and "." in path.rsplit("/", 1)[-1]:
                raise
            return await super().get_response("index.html", scope)


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
app.include_router(v2_router)
app.include_router(wizard_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v2/frontend-check")
def platform_frontend_check():
    """Compat prepare/export Platform — même origine que le wizard."""
    return {"ok": True}


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
    return Response(
        content=manager_inject_css(),
        media_type="text/css",
        headers=_NO_STORE_HEADERS,
    )


@app.get("/engine-v2-live-manager-inject.js")
def platform_live_manager_inject_js():
    return Response(
        content=manager_inject_js(),
        media_type="application/javascript",
        headers=_NO_STORE_HEADERS,
    )


@app.middleware("http")
async def inject_platform_live_manager_assets(request, call_next):
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
    html = inject_strip_html(html)
    html = html.replace(
        "</head>",
        f"    {inject_head_snippet()}\n  </head>",
        1,
    )
    headers = dict(response.headers)
    headers.pop("content-length", None)
    headers["Cache-Control"] = "no-store, max-age=0"
    return HTMLResponse(content=html, status_code=response.status_code, headers=headers)


if _FRONT_DIST.is_dir():
    app.mount("/", SpaStaticFiles(directory=str(_FRONT_DIST), html=True), name="frontend")

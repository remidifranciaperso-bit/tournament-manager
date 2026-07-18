"""Entrée FastAPI légère pour le service Engine V2 (démarrage rapide, sans LibreOffice)."""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from api.v2_router import router as v2_router, warm_pymupdf


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Pré-charge PyMuPDF en arrière-plan (ne bloque pas le health check Render)."""
    import asyncio

    async def _warm() -> None:
        await asyncio.to_thread(warm_pymupdf)

    task = asyncio.create_task(_warm())
    yield
    task.cancel()


app = FastAPI(title="Padel Tournament Engine V2", lifespan=lifespan)
app.include_router(v2_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Notify-Token", "X-Live-Snapshot-Available", "X-Engine-Version"],
)


@app.get("/api/health")
def health_compat():
    """Compatibilité si le health check pointe sur /api/health."""
    return {
        "status": "ok",
        "engine": "v2-render",
        "deploy": os.environ.get("DEPLOY_TARGET", "engine-v2"),
        "hint": "use /api/v2/health",
    }


class SpaStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        if path == "api" or path.startswith("api/"):
            raise StarletteHTTPException(404)
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            if path and "." in path.rsplit("/", 1)[-1]:
                raise
            return await super().get_response("index.html", scope)


_FRONT_DIST = BASE_DIR / "frontend" / "dist"
if _FRONT_DIST.is_dir():
    app.mount("/", SpaStaticFiles(directory=str(_FRONT_DIST), html=True), name="frontend")

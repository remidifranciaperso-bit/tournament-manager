"""Entrée FastAPI légère pour le service Engine V2 (démarrage rapide, sans LibreOffice)."""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import HTMLResponse

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from api.v2_router import router as v2_router, warm_pymupdf
from api.live_router import router as live_router
from api.wizard_routes import router as wizard_router


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
app.include_router(wizard_router)
app.include_router(live_router)


@app.post("/api/generate")
async def block_engine_v1_generate():
    """Le service Engine V2 ne génère pas via LibreOffice /api/generate."""
    from fastapi import HTTPException

    raise HTTPException(
        status_code=410,
        detail=(
            "Engine V1 désactivé sur ce service. Ouvrez /#/engine-v2/participants "
            "et utilisez /api/v2/prepare + captures Live + /api/v2/export."
        ),
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Notify-Token", "X-Live-Snapshot-Available", "X-Engine-Version"],
)

# En-têtes tableaux Manager Live à l'écran (Poules / Planning / Classement final).
# Inline dans index.html : fonctionne sans rebuild du bundle JS.
# La couche #export-capture-layer (génération PDF Live) garde 12 pt / graisse normale.
# Taille écran : un peu au-dessus du Live V1 (xs/sm), sans dépasser les colonnes.
# PDF export (#export-capture-layer) : 12 pt Engine, inchangé.
_LIVE_HEAD_SCREEN_PX = 12.5

_ENGINE_V2_LIVE_TABLE_HEAD_INJECT = f"""
<style id="engine-v2-live-table-head">
#root table thead tr.bg-template-blue th {{
  box-sizing: border-box !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-family: "TSL Sans", "Sora", system-ui, sans-serif !important;
  font-size: calc({_LIVE_HEAD_SCREEN_PX}px / var(--live-display-scale, 1)) !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  line-height: 1.12 !important;
  padding-top: 0.45rem !important;
  padding-bottom: 0.45rem !important;
}}
#export-capture-layer table thead tr.bg-template-blue th {{
  font-size: 12pt !important;
  font-weight: 400 !important;
  letter-spacing: 0.05em !important;
  line-height: 1.2 !important;
  overflow: visible !important;
  text-overflow: clip !important;
}}
</style>
<script id="engine-v2-live-table-head-sync">
(function () {
  function syncScale() {
    document.querySelectorAll('[style*="scale("]').forEach(function (el) {
      var m = el.style.transform.match(/scale\\(([0-9.]+)\\)/);
      if (m) el.style.setProperty("--live-display-scale", m[1]);
    });
  }
  function boot() {
    syncScale();
    var root = document.getElementById("root") || document.body;
    new MutationObserver(syncScale).observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    window.addEventListener("resize", syncScale);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
</script>
""".strip()


@app.get("/engine-v2-live-table-head.css")
def engine_v2_live_table_head_css():
    """Compat — préférer le bloc inline injecté dans index.html."""
    return Response(
        content="#deprecated-use-inline-inject",
        media_type="text/css",
        headers={"Cache-Control": "no-store"},
    )


@app.middleware("http")
async def inject_engine_v2_live_table_head_css(request, call_next):
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
    if 'id="engine-v2-live-table-head"' in html or "</head>" not in html:
        return HTMLResponse(
            content=html,
            status_code=response.status_code,
            headers=dict(response.headers),
        )
    html = html.replace(
        "</head>",
        f"    {_ENGINE_V2_LIVE_TABLE_HEAD_INJECT}\n  </head>",
        1,
    )
    headers = dict(response.headers)
    headers.pop("content-length", None)
    headers["Cache-Control"] = "no-store, max-age=0"
    return HTMLResponse(content=html, status_code=response.status_code, headers=headers)


@app.get("/api/health")
def health_compat():
    """Compatibilité si le health check pointe sur /api/health."""
    from api.live_store import BASE_LIVE_DIR

    return {
        "status": "ok",
        "engine": "v2-live-capture",
        "deploy": os.environ.get("DEPLOY_TARGET", "engine-v2"),
        "live": "engine-pdf",
        "live_data_dir": str(BASE_LIVE_DIR),
        "hint": "use /api/v2/health",
        "frontend_must_include": "v2/prepare",
    }


@app.get("/api/v2/frontend-check")
def frontend_check():
    """Vérifie que le bundle servi contient bien le wizard Engine V2."""
    dist = BASE_DIR / "frontend" / "dist" / "assets"
    if not dist.is_dir():
        return {"ok": False, "error": "frontend/dist/assets absent"}
    marker = "export-capture-v2-20260720-planning-native"
    for js in dist.glob("*.js"):
        text = js.read_text(encoding="utf-8", errors="ignore")
        if "v2/prepare" in text and "engine-v2" in text and marker in text:
            return {"ok": True, "bundle": js.name, "capture_marker": marker}
    return {
        "ok": False,
        "error": f"Bundle sans marqueur capture ({marker}) — rebuild frontend requis",
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

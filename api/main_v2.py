"""Entrée FastAPI légère pour le service Engine V2 (démarrage rapide, sans LibreOffice)."""

from __future__ import annotations

import os
import re
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
_PLANNING_SIDE_MARGIN_PX = round(5 * 96 / 25.4)
_PLANNING_VERTICAL_MARGIN_PX = round(4 * 96 / 25.4)
_PLANNING_VERTICAL_FIT_INSET_PX = 22
_PLANNING_CARD_SHELL_EXTRA_PX = 8
_PLANNING_SCALE_HEIGHT_BUFFER_PX = 12
_PLANNING_COL_TERRAIN_FRAC = 0.13
_PLANNING_COL_BASE_FRACS = [0.07, 0.07, 0.13, 0.335, 0.335, 0.06]
_PLANNING_TERRAIN_COL_MIN_CHARS = 17
_PLANNING_TERRAIN_CHAR_PX = 10
_PLANNING_TERRAIN_CELL_PAD_PX = 16
_PLANNING_TERRAIN_COL_SAFETY_PX = 8
_PLANNING_TERRAIN_COL_MIN_PX = (
    _PLANNING_TERRAIN_COL_MIN_CHARS * _PLANNING_TERRAIN_CHAR_PX
    + _PLANNING_TERRAIN_CELL_PAD_PX
    + _PLANNING_TERRAIN_COL_SAFETY_PX
)
_PLANNING_TABLE_BASE_WIDTH_PX = 1400 - 2 * _PLANNING_SIDE_MARGIN_PX
_PLANNING_COL_TERRAIN_BOOST = max(
    1.0,
    _PLANNING_TERRAIN_COL_MIN_PX
    / (_PLANNING_TABLE_BASE_WIDTH_PX * _PLANNING_COL_TERRAIN_FRAC),
)
_PLANNING_TABLE_WIDTH_TERRAIN_FACTOR = (
    1 + _PLANNING_COL_TERRAIN_FRAC * (_PLANNING_COL_TERRAIN_BOOST - 1)
)
_PLANNING_TABLE_WIDTH_PX = round(
    _PLANNING_TABLE_BASE_WIDTH_PX * _PLANNING_TABLE_WIDTH_TERRAIN_FACTOR
)
_PLANNING_CAPTURE_WIDTH_PX = _PLANNING_TABLE_WIDTH_PX + 2 * _PLANNING_SIDE_MARGIN_PX
_LIVE_MANAGER_INJECT_VERSION = "live-planning-terrain-col-v2-20260724i"


def _planning_col_width_percents() -> list[str]:
    factor = _PLANNING_TABLE_WIDTH_TERRAIN_FACTOR
    percents: list[str] = []
    for index, frac in enumerate(_PLANNING_COL_BASE_FRACS):
        width_frac = (
            frac * _PLANNING_COL_TERRAIN_BOOST if index == 2 else frac
        )
        percents.append(f"{(width_frac / factor) * 100:.3f}%")
    return percents


_PLANNING_COL_WIDTH_PCTS = _planning_col_width_percents()


def _fill_live_manager_inject(template: str) -> str:
    result = (
        template.replace("__SCREEN_PX__", str(_LIVE_HEAD_SCREEN_PX))
        .replace("__PLANNING_SIDE__", str(_PLANNING_SIDE_MARGIN_PX))
        .replace("__PLANNING_VERT__", str(_PLANNING_VERTICAL_MARGIN_PX))
        .replace("__PLANNING_BASE__", str(_PLANNING_TABLE_WIDTH_PX))
        .replace("__TERRAIN_MIN__", str(_PLANNING_TERRAIN_COL_MIN_PX))
        .replace("__PLANNING_CAP__", str(_PLANNING_CAPTURE_WIDTH_PX))
        .replace("__FIT_INSET__", str(_PLANNING_VERTICAL_FIT_INSET_PX))
        .replace("__SHELL_EXTRA__", str(_PLANNING_CARD_SHELL_EXTRA_PX))
        .replace("__HEIGHT_BUFFER__", str(_PLANNING_SCALE_HEIGHT_BUFFER_PX))
    )
    for idx, pct in enumerate(_PLANNING_COL_WIDTH_PCTS, start=1):
        result = result.replace(f"__PCOL{idx}__", pct)
    return result


_LIVE_MANAGER_INJECT_CSS_TEMPLATE = """
#root table:not(.live-planning-v2-table) thead tr.bg-template-blue th {
  box-sizing: border-box !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-family: "TSL Sans", "Sora", system-ui, sans-serif !important;
  font-size: calc(__SCREEN_PX__px / var(--live-display-scale, 1)) !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  line-height: 1.12 !important;
  padding-top: 0.45rem !important;
  padding-bottom: 0.45rem !important;
}
#export-capture-layer table thead tr.bg-template-blue th {
  font-size: 12pt !important;
  font-weight: 400 !important;
  letter-spacing: 0.05em !important;
  line-height: 1.2 !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
""".strip()

_LIVE_MANAGER_INJECT_JS_TEMPLATE = """
(function () {
  function syncScale() {
    document.querySelectorAll('[style*="scale("]').forEach(function (el) {
      var m = el.style.transform.match(/scale\\s*\\(\\s*([0-9.]+)(?:\\s*,\\s*([0-9.]+))?\\s*\\)/);
      if (!m) return;
      el.style.setProperty("--live-display-scale", m[1]);
    });
  }

  function boot() {
    syncScale();
    var root = document.getElementById("root");
    if (root) {
      new MutationObserver(syncScale).observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style"],
      });
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(syncScale).observe(root);
      }
    }
    window.addEventListener("resize", syncScale);
    window.addEventListener("hashchange", syncScale);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
""".strip()

_LIVE_MANAGER_INJECT_CSS = _fill_live_manager_inject(_LIVE_MANAGER_INJECT_CSS_TEMPLATE)
_LIVE_MANAGER_INJECT_JS = _fill_live_manager_inject(_LIVE_MANAGER_INJECT_JS_TEMPLATE)
_LIVE_MANAGER_INJECT_HEAD_SNIPPET = (
    f'<link rel="stylesheet" href="/engine-v2-live-manager-inject.css?v={_LIVE_MANAGER_INJECT_VERSION}" '
    f'id="engine-v2-live-manager-inject">\n'
    f'    <script defer src="/engine-v2-live-manager-inject.js?v={_LIVE_MANAGER_INJECT_VERSION}" '
    f'id="engine-v2-live-manager-inject-sync"></script>\n'
    f'    <meta name="live-manager-inject-version" content="{_LIVE_MANAGER_INJECT_VERSION}">'
)
_LIVE_INJECT_STRIP_RE = re.compile(
    r'<link[^>]*engine-v2-live-manager-inject[^>]*>\s*'
    r'|<script[^>]*engine-v2-live-manager-inject[^>]*>\s*</script>\s*'
    r'|<meta[^>]*live-manager-inject-version[^>]*>\s*'
    r'|<style id="engine-v2-live-manager-inject">.*?</style>\s*'
    r'|<script id="engine-v2-live-manager-inject-sync">.*?</script>\s*',
    re.DOTALL | re.IGNORECASE,
)

# Rétrocompat nom constante (inline legacy — ne plus utiliser)
_ENGINE_V2_LIVE_MANAGER_INJECT = (
    f'<style id="engine-v2-live-manager-inject">\n{_LIVE_MANAGER_INJECT_CSS}\n</style>\n'
    f'<script id="engine-v2-live-manager-inject-sync">\n{_LIVE_MANAGER_INJECT_JS}\n</script>'
)
_ENGINE_V2_LIVE_TABLE_HEAD_INJECT = _ENGINE_V2_LIVE_MANAGER_INJECT


def _strip_live_manager_inject(html: str) -> str:
    return _LIVE_INJECT_STRIP_RE.sub("", html)


_NO_STORE_HEADERS = {"Cache-Control": "no-store, max-age=0, must-revalidate"}


@app.get("/engine-v2-live-manager-inject.css")
def engine_v2_live_manager_inject_css():
    return Response(
        content=_LIVE_MANAGER_INJECT_CSS,
        media_type="text/css",
        headers=_NO_STORE_HEADERS,
    )


@app.get("/engine-v2-live-manager-inject.js")
def engine_v2_live_manager_inject_js():
    return Response(
        content=_LIVE_MANAGER_INJECT_JS,
        media_type="application/javascript",
        headers=_NO_STORE_HEADERS,
    )


@app.get("/engine-v2-live-table-head.css")
def engine_v2_live_table_head_css():
    """Compat — redirige vers le CSS Manager Live versionné."""
    return Response(
        content=_LIVE_MANAGER_INJECT_CSS,
        media_type="text/css",
        headers=_NO_STORE_HEADERS,
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
    """État bundle JS + inject Manager Live (planning / en-têtes)."""
    dist = BASE_DIR / "frontend" / "dist" / "assets"
    marker = _LIVE_MANAGER_INJECT_VERSION
    bundle_name = None
    bundle_has_marker = False
    bundle_has_planning_layout = False
    if dist.is_dir():
        for js in dist.glob("*.js"):
            text = js.read_text(encoding="utf-8", errors="ignore")
            if "v2/prepare" in text and "engine-v2" in text:
                bundle_name = js.name
                if "live-planning-v2-table" in text:
                    bundle_has_planning_layout = True
                if "live-planning-fix-v2-20260724i" in text:
                    bundle_has_marker = True
                break
    return {
        "ok": True,
        "live_manager_inject": marker,
        "planning_table_width_px": _PLANNING_TABLE_WIDTH_PX,
        "planning_terrain_col_min_px": _PLANNING_TERRAIN_COL_MIN_PX,
        "planning_margins_mm": {"left_right": 5, "top_bottom": 4},
        "inject_css": f"/engine-v2-live-manager-inject.css?v={_LIVE_MANAGER_INJECT_VERSION}",
        "inject_js": f"/engine-v2-live-manager-inject.js?v={_LIVE_MANAGER_INJECT_VERSION}",
        "bundle": bundle_name,
        "bundle_has_react_marker": bundle_has_marker,
        "note": (
            "Layout planning Live V2 dans le bundle React (classe live-planning-v2-table). "
            "L’inject serveur ne touche plus au planning."
        ),
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

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
_PLANNING_SIDE_MARGIN_PX = round(5 * 96 / 25.4)
_PLANNING_VERTICAL_MARGIN_PX = round(4 * 96 / 25.4)
_PLANNING_VERTICAL_FIT_INSET_PX = 8
_PLANNING_CAPTURE_WIDTH_PX = 1400
_PLANNING_TABLE_WIDTH_PX = _PLANNING_CAPTURE_WIDTH_PX - 2 * _PLANNING_SIDE_MARGIN_PX
_PLANNING_VERTICAL_FIT_INSET_PX = 8
_LIVE_MANAGER_INJECT_VERSION = "live-planning-fit-vertical-v2-20260724"

_ENGINE_V2_LIVE_MANAGER_INJECT = """
<style id="engine-v2-live-manager-inject">
#root table thead tr.bg-template-blue th {
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
#root .engine-v2-planning-card table thead tr.bg-template-blue th,
#root [data-planning-layout] table thead tr.bg-template-blue th {
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: none !important;
  white-space: nowrap !important;
}
#root .engine-v2-planning-page {
  box-sizing: border-box !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;
  padding-left: __PLANNING_SIDE__px !important;
  padding-right: __PLANNING_SIDE__px !important;
  padding-top: __PLANNING_VERT__px !important;
  padding-bottom: __PLANNING_VERT__px !important;
}
#root .engine-v2-planning-wrap {
  position: relative !important;
  flex-shrink: 0 !important;
  width: calc(__PLANNING_BASE__px * var(--ev2-planning-s, 1)) !important;
  height: calc(var(--ev2-planning-nh, 1px) * var(--ev2-planning-s, 1)) !important;
}
#root .engine-v2-planning-card {
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
  width: __PLANNING_BASE__px !important;
  max-width: none !important;
  transform: scale(var(--ev2-planning-s, 1)) !important;
  transform-origin: top left !important;
}
#export-capture-layer.engine-v2-planning-capture {
  box-sizing: border-box !important;
  width: __PLANNING_CAP__px !important;
  padding-left: __PLANNING_SIDE__px !important;
  padding-right: __PLANNING_SIDE__px !important;
  padding-top: __PLANNING_VERT__px !important;
  padding-bottom: __PLANNING_VERT__px !important;
}
</style>
<script id="engine-v2-live-manager-inject-sync">
(function () {
  var SIDE = __PLANNING_SIDE__;
  var VERT = __PLANNING_VERT__;
  var BASE_W = __PLANNING_BASE__;
  var FIT_INSET = __FIT_INSET__;
  var scheduled = false;
  var layoutCache = new WeakMap();
  var maxPlanningNaturalH = 0;

  function isManagerRoute() {
    var hash = location.hash || "";
    return hash.indexOf("/manager") !== -1;
  }

  function syncScale() {
    document.querySelectorAll('[style*="scale("]').forEach(function (el) {
      var m = el.style.transform.match(/scale\\s*\\(\\s*([0-9.]+)(?:\\s*,\\s*([0-9.]+))?\\s*\\)/);
      if (!m) return;
      var next = m[1];
      if (el.style.getPropertyValue("--live-display-scale") === next) return;
      el.style.setProperty("--live-display-scale", next);
    });
  }

  function isPlanningTable(table) {
    if (table.closest("#export-capture-layer")) return false;
    var ths = table.querySelectorAll("thead tr.bg-template-blue th");
    if (ths.length !== 6) return false;
    return (ths[0].textContent || "").trim() === "Code";
  }

  function findShell(table) {
    var card = table.closest("[class*='rounded-xl'][class*='border-template-blue']");
    if (!card || card.closest("#export-capture-layer")) return null;
    var wrap = card.parentElement;
    var page = wrap && wrap.parentElement;
    if (!wrap || !page) return null;
    return { page: page, wrap: wrap, card: card };
  }

  function layoutLivePlanning(shell, uniformScale, naturalH) {
    var page = shell.page;
    var wrap = shell.wrap;
    var card = shell.card;

    page.classList.add("engine-v2-planning-page");
    wrap.classList.add("engine-v2-planning-wrap");
    card.classList.add("engine-v2-planning-card");

    var sStr = String(uniformScale);
    var nh = naturalH + "px";

    var cached = layoutCache.get(page);
    if (cached && cached.s === sStr && cached.nh === nh) {
      return;
    }
    layoutCache.set(page, { s: sStr, nh: nh });

    page.style.setProperty("--ev2-planning-s", sStr);
    page.style.setProperty("--ev2-planning-nh", nh);
    card.style.setProperty("--live-display-scale", sStr);
  }

  function layoutCapturePlanning() {
    var layer = document.getElementById("export-capture-layer");
    if (!layer) return;
    var table = layer.querySelector("table");
    if (!table) return;
    var ths = table.querySelectorAll("thead tr.bg-template-blue th");
    if (ths.length !== 6 || (ths[0].textContent || "").trim() !== "Code") return;
    layer.classList.add("engine-v2-planning-capture");
  }

  function layoutPlanning() {
    if (!isManagerRoute()) return;

    var shells = [];
    document.querySelectorAll("#root table").forEach(function (table) {
      if (!isPlanningTable(table)) return;
      var shell = findShell(table);
      if (shell) shells.push(shell);
    });

    if (!shells.length) {
      layoutCapturePlanning();
      syncScale();
      return;
    }

    shells.forEach(function (shell) {
      var nh = Math.max(shell.card.scrollHeight, shell.card.offsetHeight);
      if (nh > maxPlanningNaturalH) maxPlanningNaturalH = nh;
    });

    var page0 = shells[0].page;
    var availW = page0.clientWidth;
    var availH = page0.clientHeight;
    if (maxPlanningNaturalH <= 0 || availW <= 0 || availH <= 0) return;

    var uniformScale = Math.min(
      1,
      availW / BASE_W,
      Math.max(1, availH - FIT_INSET) / maxPlanningNaturalH
    );

    shells.forEach(function (shell) {
      var nh = Math.max(shell.card.scrollHeight, shell.card.offsetHeight);
      layoutLivePlanning(shell, uniformScale, nh);
    });

    layoutCapturePlanning();
    syncScale();
  }

  function scheduleLayout() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      layoutPlanning();
    });
  }

  function boot() {
    syncScale();
    scheduleLayout();
    var root = document.getElementById("root");
    if (root) {
      new MutationObserver(scheduleLayout).observe(root, {
        subtree: true,
        childList: true,
      });
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(scheduleLayout).observe(root);
      }
    }
    window.addEventListener("resize", scheduleLayout);
    window.addEventListener("hashchange", function () {
      if ((location.hash || "").indexOf("/manager") === -1) {
        maxPlanningNaturalH = 0;
        layoutCache = new WeakMap();
      }
      scheduleLayout();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
</script>
""".strip()
_ENGINE_V2_LIVE_MANAGER_INJECT = (
    _ENGINE_V2_LIVE_MANAGER_INJECT.replace("__SCREEN_PX__", str(_LIVE_HEAD_SCREEN_PX))
    .replace("__PLANNING_SIDE__", str(_PLANNING_SIDE_MARGIN_PX))
    .replace("__PLANNING_VERT__", str(_PLANNING_VERTICAL_MARGIN_PX))
    .replace("__PLANNING_BASE__", str(_PLANNING_TABLE_WIDTH_PX))
    .replace("__PLANNING_CAP__", str(_PLANNING_CAPTURE_WIDTH_PX))
    .replace("__FIT_INSET__", str(_PLANNING_VERTICAL_FIT_INSET_PX))
)

# Rétrocompat nom constante
_ENGINE_V2_LIVE_TABLE_HEAD_INJECT = _ENGINE_V2_LIVE_MANAGER_INJECT


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
    if 'id="engine-v2-live-manager-inject"' in html or "</head>" not in html:
        return HTMLResponse(
            content=html,
            status_code=response.status_code,
            headers=dict(response.headers),
        )
    html = html.replace(
        "</head>",
        f"    {_ENGINE_V2_LIVE_MANAGER_INJECT}\n  </head>",
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
    if dist.is_dir():
        for js in dist.glob("*.js"):
            text = js.read_text(encoding="utf-8", errors="ignore")
            if "v2/prepare" in text and "engine-v2" in text:
                bundle_name = js.name
                if marker in text:
                    bundle_has_marker = True
                break
    return {
        "ok": True,
        "live_manager_inject": marker,
        "planning_table_width_px": _PLANNING_TABLE_WIDTH_PX,
        "planning_margins_mm": {"left_right": 5, "top_bottom": 4},
        "bundle": bundle_name,
        "bundle_has_react_marker": bundle_has_marker,
        "note": (
            "Le layout planning Live V2 est appliqué via inject index.html "
            "(indépendant du bundle JS)."
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

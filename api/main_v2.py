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
_LIVE_MANAGER_INJECT_VERSION = "live-planning-terrain-col-v2-20260724h"


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
#root [data-planning-layout] table thead tr.bg-template-blue th,
#root table[data-live-planning-table] thead tr.bg-template-blue th {
  overflow: visible !important;
  text-overflow: clip !important;
  max-width: none !important;
  white-space: nowrap !important;
  font-size: calc(__SCREEN_PX__px / var(--ev2-planning-s, var(--live-display-scale, 1))) !important;
  font-weight: 600 !important;
  letter-spacing: 0.03em !important;
  line-height: 1.12 !important;
}
#root [data-planning-layout] table,
#root .engine-v2-planning-card table,
#root table.engine-v2-planning-table,
#root table[data-live-planning-table] {
  table-layout: fixed !important;
  width: __PLANNING_BASE__px !important;
  max-width: __PLANNING_BASE__px !important;
}
#root [data-planning-layout] table col:nth-child(1),
#root .engine-v2-planning-card table col:nth-child(1),
#root table.engine-v2-planning-table col:nth-child(1),
#root table[data-live-planning-table] col:nth-child(1) {
  width: __PCOL1__ !important;
}
#root [data-planning-layout] table col:nth-child(2),
#root .engine-v2-planning-card table col:nth-child(2),
#root table.engine-v2-planning-table col:nth-child(2),
#root table[data-live-planning-table] col:nth-child(2) {
  width: __PCOL2__ !important;
}
#root [data-planning-layout] table col:nth-child(3),
#root .engine-v2-planning-card table col:nth-child(3),
#root table.engine-v2-planning-table col:nth-child(3),
#root table[data-live-planning-table] col:nth-child(3) {
  width: __PCOL3__ !important;
  max-width: __TERRAIN_MIN__px !important;
}
#root [data-planning-layout] table col:nth-child(4),
#root .engine-v2-planning-card table col:nth-child(4),
#root table.engine-v2-planning-table col:nth-child(4),
#root table[data-live-planning-table] col:nth-child(4) {
  width: __PCOL4__ !important;
}
#root [data-planning-layout] table col:nth-child(5),
#root .engine-v2-planning-card table col:nth-child(5),
#root table.engine-v2-planning-table col:nth-child(5),
#root table[data-live-planning-table] col:nth-child(5) {
  width: __PCOL5__ !important;
}
#root [data-planning-layout] table col:nth-child(6),
#root .engine-v2-planning-card table col:nth-child(6),
#root table.engine-v2-planning-table col:nth-child(6),
#root table[data-live-planning-table] col:nth-child(6) {
  width: __PCOL6__ !important;
}
#root [data-planning-layout] table tbody td:nth-child(3),
#root table[data-live-planning-table] tbody td:nth-child(3) {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
#root [data-planning-layout] .engine-v2-planning-card,
#root [data-planning-layout] .engine-v2-planning-wrap {
  width: auto !important;
  height: auto !important;
  transform: none !important;
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
""".strip()

_LIVE_MANAGER_INJECT_JS_TEMPLATE = """
(function () {
  var SIDE = __PLANNING_SIDE__;
  var VERT = __PLANNING_VERT__;
  var BASE_W = __PLANNING_BASE__;
  var FIT_INSET = __FIT_INSET__;
  var SHELL_EXTRA = __SHELL_EXTRA__;
  var HEIGHT_BUFFER = __HEIGHT_BUFFER__;
  var TERRAIN_MAX = __TERRAIN_MIN__;
  var COL_WIDTHS = [__PCOL1__, __PCOL2__, __PCOL3__, __PCOL4__, __PCOL5__, __PCOL6__];
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

  function measureCardHeight(card) {
    return Math.max(card.scrollHeight, card.offsetHeight) + SHELL_EXTRA;
  }

  function readPlanningScale(page) {
    var s =
      page.style.getPropertyValue("--ev2-planning-s") ||
      page.style.getPropertyValue("--live-display-scale");
    if (s) return s;
    var card = page.querySelector(
      "[class*='rounded-xl'][class*='border-template-blue']"
    );
    if (!card) return null;
    s = card.style.getPropertyValue("--ev2-planning-s");
    if (s) return s;
    s = card.style.getPropertyValue("--live-display-scale");
    if (s) return s;
    var m = (card.style.transform || "").match(
      /scale\\s*\\(\\s*([0-9.]+)(?:\\s*,\\s*([0-9.]+))?\\s*\\)/
    );
    return m ? m[1] : null;
  }

  function matchPlanningTable(table) {
    if (table.closest("#export-capture-layer")) return false;
    if (table.matches("[data-live-planning-table], .engine-v2-planning-table")) return true;
    var ths = table.querySelectorAll("thead tr.bg-template-blue th");
    if (ths.length !== 6) return false;
    var first = (ths[0].textContent || "").trim().toLowerCase();
    if (first !== "code") return false;
    var third = (ths[2].textContent || "").trim().toLowerCase();
    return third === "terrain";
  }

  function applyPlanningColWidths(table) {
    if (!matchPlanningTable(table)) return;
    table.classList.add("engine-v2-planning-table");
    table.style.setProperty("table-layout", "fixed", "important");
    table.style.setProperty("width", BASE_W + "px", "important");
    table.style.setProperty("max-width", BASE_W + "px", "important");
    var cols = table.querySelectorAll("colgroup > col, col");
    for (var i = 0; i < COL_WIDTHS.length; i++) {
      if (!cols[i]) continue;
      cols[i].style.setProperty("width", COL_WIDTHS[i], "important");
      if (i === 2) {
        cols[i].style.setProperty("max-width", TERRAIN_MAX + "px", "important");
      }
    }
  }

  function syncPlanningColWidths() {
    if (!isManagerRoute()) return;
    document.querySelectorAll("#root table").forEach(applyPlanningColWidths);
  }

  function syncPlanningHeadVars() {
    document
      .querySelectorAll("#root .engine-v2-planning-page, #root [data-planning-layout]")
      .forEach(function (page) {
        var s = readPlanningScale(page);
        if (!s) return;
        page.style.setProperty("--ev2-planning-s", s);
        page.style.setProperty("--live-display-scale", s);
        var card = page.querySelector(
          "[class*='rounded-xl'][class*='border-template-blue']"
        );
        if (card) {
          card.style.setProperty("--ev2-planning-s", s);
          card.style.setProperty("--live-display-scale", s);
        }
      });
  }

  function isPlanningTableForLayout(table) {
    if (table.closest("#export-capture-layer")) return false;
    if (table.closest("[data-planning-layout]")) return false;
    return matchPlanningTable(table);
  }

  function isPlanningTable(table) {
    return matchPlanningTable(table);
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
    page.style.setProperty("--live-display-scale", sStr);
    card.style.setProperty("--live-display-scale", sStr);
  }

  function layoutCapturePlanning() {
    var layer = document.getElementById("export-capture-layer");
    if (!layer) return;
    var table = layer.querySelector("table");
    if (!table) return;
    var ths = table.querySelectorAll("thead tr.bg-template-blue th");
    if (ths.length !== 6 || (ths[0].textContent || "").trim().toLowerCase() !== "code") return;
    layer.classList.add("engine-v2-planning-capture");
  }

  function layoutPlanning() {
    if (!isManagerRoute()) return;

    var shells = [];
    document.querySelectorAll("#root table").forEach(function (table) {
      if (!isPlanningTableForLayout(table)) return;
      var shell = findShell(table);
      if (shell) shells.push(shell);
    });

    if (!shells.length) {
      layoutCapturePlanning();
      syncPlanningHeadVars();
      syncPlanningColWidths();
      syncScale();
      return;
    }

    shells.forEach(function (shell) {
      var nh = measureCardHeight(shell.card);
      if (nh > maxPlanningNaturalH) maxPlanningNaturalH = nh;
    });

    var page0 = shells[0].page;
    var availW = page0.clientWidth;
    var availH = page0.clientHeight;
    if (maxPlanningNaturalH <= 0 || availW <= 0 || availH <= 0) return;

    var uniformScale = Math.min(
      1,
      availW / BASE_W,
      Math.max(1, availH - FIT_INSET) / (maxPlanningNaturalH + HEIGHT_BUFFER)
    );

    shells.forEach(function (shell) {
      var nh = measureCardHeight(shell.card);
      layoutLivePlanning(shell, uniformScale, nh - SHELL_EXTRA);
    });

    layoutCapturePlanning();
    syncPlanningHeadVars();
    syncPlanningColWidths();
    syncScale();
  }

  function layoutPlanningDeferred() {
    requestAnimationFrame(function () {
      requestAnimationFrame(layoutPlanning);
    });
  }

  function scheduleLayout() {
    if (scheduled) return;
    scheduled = true;
    syncPlanningColWidths();
    layoutPlanningDeferred();
    requestAnimationFrame(function () {
      scheduled = false;
    });
  }

  function watchPlanningColgroups() {
    var root = document.getElementById("root");
    if (!root) return;
    new MutationObserver(function () {
      syncPlanningColWidths();
    }).observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "width", "class"],
    });
  }

  function boot() {
    syncScale();
    syncPlanningColWidths();
    watchPlanningColgroups();
    layoutPlanningDeferred();
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
        "planning_terrain_col_min_px": _PLANNING_TERRAIN_COL_MIN_PX,
        "planning_margins_mm": {"left_right": 5, "top_bottom": 4},
        "inject_css": f"/engine-v2-live-manager-inject.css?v={_LIVE_MANAGER_INJECT_VERSION}",
        "inject_js": f"/engine-v2-live-manager-inject.js?v={_LIVE_MANAGER_INJECT_VERSION}",
        "bundle": bundle_name,
        "bundle_has_react_marker": bundle_has_marker,
        "note": (
            "Layout planning Live V2 via CSS/JS versionnés injectés dans index.html "
            "(indépendant du bundle React)."
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

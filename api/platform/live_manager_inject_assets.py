"""Inject Manager Live V2 — copie Platform (ne pas modifier main_v2)."""

import re

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
_LIVE_MANAGER_INJECT_VERSION = "live-planning-propagate-v2-20260725f"


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


def _planning_col_widths_px() -> list[int]:
    widths = [
        round(_PLANNING_TABLE_WIDTH_PX * float(pct[:-1]) / 100)
        for pct in _PLANNING_COL_WIDTH_PCTS
    ]
    widths[2] = min(widths[2], _PLANNING_TERRAIN_COL_MIN_PX)
    drift = _PLANNING_TABLE_WIDTH_PX - sum(widths)
    if drift:
        widths[5] += drift
    return widths


_PLANNING_COL_WIDTHS_PX = _planning_col_widths_px()


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
    for idx, px in enumerate(_PLANNING_COL_WIDTHS_PX):
        result = result.replace(f"__COL{idx}__", str(px))
    return result


_LIVE_MANAGER_INJECT_CSS_TEMPLATE = """
#root table:not(.live-planning-v2-table):not(.ev2-planning-layout) thead tr.bg-template-blue th {
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
#root table.ev2-planning-layout {
  table-layout: fixed !important;
  width: __PLANNING_BASE__px !important;
  max-width: __PLANNING_BASE__px !important;
}
#root table.ev2-planning-layout col:nth-child(1) { width: __COL0__px !important; }
#root table.ev2-planning-layout col:nth-child(2) { width: __COL1__px !important; }
#root table.ev2-planning-layout col:nth-child(3) { width: __COL2__px !important; }
#root table.ev2-planning-layout col:nth-child(4) { width: __COL3__px !important; }
#root table.ev2-planning-layout col:nth-child(5) { width: __COL4__px !important; }
#root table.ev2-planning-layout col:nth-child(6) { width: __COL5__px !important; }
#root table.ev2-planning-layout thead tr.bg-template-blue th {
  max-width: none !important;
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: nowrap !important;
  font-size: calc(__SCREEN_PX__px / var(--live-display-scale, 1)) !important;
  font-weight: 600 !important;
  letter-spacing: 0.03em !important;
  line-height: 1.12 !important;
}
#root table.ev2-planning-layout tbody td:nth-child(3) {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}
#root .ev2-planning-shell {
  max-width: none !important;
  width: __PLANNING_BASE__px !important;
}
#root .ev2-planning-page {
  box-sizing: border-box !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;
  overflow: hidden !important;
  padding-left: __PLANNING_SIDE__px !important;
  padding-right: __PLANNING_SIDE__px !important;
  padding-top: __PLANNING_VERT__px !important;
  padding-bottom: __PLANNING_VERT__px !important;
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
  var BASE_W = __PLANNING_BASE__;
  var SIDE = __PLANNING_SIDE__;
  var VERT = __PLANNING_VERT__;
  var FIT_INSET = __FIT_INSET__;
  var COL_PX = [__COL0__, __COL1__, __COL2__, __COL3__, __COL4__, __COL5__];
  var REF_H_KEY = "ev2-planning-ref-nh";
  var scheduled = false;

  function planningRefHeight(currentNh) {
    try {
      var prev = parseFloat(sessionStorage.getItem(REF_H_KEY) || "0");
      if (!isFinite(prev) || prev < 0) prev = 0;
      var next = Math.max(currentNh, prev);
      if (next > prev) sessionStorage.setItem(REF_H_KEY, String(next));
      return next;
    } catch (e) {
      return currentNh;
    }
  }

  function resetPlanningRefHeight() {
    try {
      sessionStorage.removeItem(REF_H_KEY);
    } catch (e) {}
  }

  function isManagerRoute() {
    return (location.hash || "").indexOf("/manager") !== -1;
  }

  function syncScale() {
    document.querySelectorAll('[style*="scale("]').forEach(function (el) {
      var m = el.style.transform.match(/scale\\s*\\(\\s*([0-9.]+)(?:\\s*,\\s*([0-9.]+))?\\s*\\)/);
      if (!m) return;
      el.style.setProperty("--live-display-scale", m[1]);
    });
  }

  function isPlanningTable(table) {
    if (table.closest("#export-capture-layer")) return false;
    if (
      table.classList.contains("live-planning-v2-table") &&
      table.closest("[data-planning-layout]")
    ) {
      return false;
    }
    var ths = table.querySelectorAll("thead tr.bg-template-blue th");
    if (ths.length !== 6) return false;
    var first = (ths[0].textContent || "").trim().toLowerCase();
    var third = (ths[2].textContent || "").trim().toLowerCase();
    return first === "code" && third === "terrain";
  }

  function applyPlanningTable(table) {
    if (!isPlanningTable(table)) return;
    table.classList.add("ev2-planning-layout");
    table.style.setProperty("table-layout", "fixed", "important");
    table.style.setProperty("width", BASE_W + "px", "important");
    table.style.setProperty("max-width", BASE_W + "px", "important");
    var cols = table.querySelectorAll("colgroup > col, col");
    for (var i = 0; i < COL_PX.length; i++) {
      if (!cols[i]) continue;
      cols[i].style.setProperty("width", COL_PX[i] + "px", "important");
    }
    var card = table.closest("[class*='rounded-xl'][class*='border-template-blue']");
    if (card) {
      card.classList.add("ev2-planning-shell");
      card.style.setProperty("max-width", "none", "important");
      card.style.setProperty("width", BASE_W + "px", "important");
    }
  }

  function findPlanningPage(table) {
    var card = table.closest(".ev2-planning-shell, [class*='rounded-xl'][class*='border-template-blue']");
    if (!card) return null;
    var wrap = card.parentElement;
    var page = wrap && wrap.parentElement;
    if (!page) return null;
    return { page: page, wrap: wrap, card: card, table: table };
  }

  function layoutPlanning() {
    if (!isManagerRoute()) return;
    var shells = [];
    document.querySelectorAll("#root table").forEach(function (table) {
      applyPlanningTable(table);
      if (table.classList.contains("ev2-planning-layout")) {
        var shell = findPlanningPage(table);
        if (shell) shells.push(shell);
      }
    });
    if (!shells.length) {
      syncScale();
      return;
    }
    var shell0 = shells[0];
    var page = shell0.page;
    page.classList.add("ev2-planning-page");
    var availW = Math.max(1, page.clientWidth - 2 * SIDE);
    var availH = Math.max(1, page.clientHeight - 2 * VERT - FIT_INSET);
    var maxNaturalH = 0;
    shells.forEach(function (shell) {
      var nh = Math.max(shell.card.scrollHeight, shell.card.offsetHeight) + __SHELL_EXTRA__;
      if (nh > maxNaturalH) maxNaturalH = nh;
    });
    if (maxNaturalH <= 0) return;
    var refH = planningRefHeight(maxNaturalH);
    var scale = Math.min(
      1,
      availW / BASE_W,
      availH / (refH + __HEIGHT_BUFFER__)
    );
    var scaleStr = String(scale);
    shells.forEach(function (shell) {
      var nh = Math.max(shell.card.scrollHeight, shell.card.offsetHeight) + __SHELL_EXTRA__;
      shell.page.style.setProperty("--live-display-scale", scaleStr);
      shell.card.style.setProperty("width", BASE_W + "px", "important");
      shell.card.style.setProperty("transform", "scale(" + scaleStr + ")", "important");
      shell.card.style.setProperty("transform-origin", "top left", "important");
      shell.card.style.setProperty("--live-display-scale", scaleStr);
      shell.wrap.style.width = BASE_W * scale + "px";
      shell.wrap.style.height = nh * scale + "px";
    });
    syncScale();
  }

  function scheduleLayout() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        layoutPlanning();
        scheduled = false;
      });
    });
  }

  /* bracket-propagate-v2-20260725 — glissement équipes (bundle legacy) */
  var BRACKET_PLACEHOLDER =
    /^(Vainqueur|Perdant|Deuxième|Second|Troisième|🏆|❌|🥇|🥈|🥉|1er|2e|3 )/i;
  var bracketScheduled = false;
  var lastProgressRaw = "";

  function loadLiveSessionData() {
    try {
      var raw = localStorage.getItem("manager-live-session-v1");
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.liveData || !Array.isArray(parsed.liveData.matches)) {
        return null;
      }
      return parsed.liveData;
    } catch (e) {
      return null;
    }
  }

  function loadBracketMatchResults(token) {
    try {
      var raw = localStorage.getItem("live-progress-" + token);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return {};
      return parsed.results || {};
    } catch (e) {
      return {};
    }
  }

  function lookupCaseMap(map, code) {
    if (map[code]) return map[code];
    var upper = String(code || "").toUpperCase();
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toUpperCase() === upper) return map[keys[i]];
    }
    return null;
  }

  function buildBracketMatchesByCode(matches) {
    var map = {};
    for (var i = 0; i < matches.length; i++) {
      map[matches[i].code] = matches[i];
    }
    return map;
  }

  function bracketUnresolved(text) {
    var t = String(text || "").trim();
    return (
      BRACKET_PLACEHOLDER.test(t) ||
      /^Vainqueur\s+/i.test(t) ||
      /^Perdant\s+/i.test(t)
    );
  }

  function bracketFormatTeamSlot(label) {
    var text = String(label || "").trim();
    if (!text) return "—";
    if (/^Vainqueur\s+/i.test(text)) {
      return "🏆\u2009" + text.replace(/^Vainqueur\s+/i, "") + ":";
    }
    if (/^Perdant\s+/i.test(text)) {
      return "❌\u2009" + text.replace(/^Perdant\s+/i, "") + ":";
    }
    return text;
  }

  function bracketShortPlayer(name) {
    var trimmed = String(name || "").trim();
    var idx = trimmed.indexOf(" ");
    if (idx === -1) return trimmed;
    var initial = trimmed.charAt(0).toUpperCase();
    return initial + ". " + trimmed.slice(idx + 1).trim();
  }

  function bracketFormatInitials(label) {
    var text = String(label || "").trim();
    if (!text) return "—";
    if (BRACKET_PLACEHOLDER.test(text)) return bracketFormatTeamSlot(text);
    var seed = "";
    var body = text;
    var seedMatch = text.match(/(\(TS\d*\))\s*$/i);
    if (seedMatch) {
      seed = " " + seedMatch[1];
      body = text.slice(0, seedMatch.index).trim();
    }
    var parts = body.split(/\s*\/\s*/).filter(Boolean);
    if (parts.length >= 2) {
      return parts.map(bracketShortPlayer).join(" / ") + seed;
    }
    return bracketShortPlayer(body) + seed;
  }

  function bracketFormatDisplay(label, resolved) {
    var raw = String(label || "").trim();
    if (!raw) return "—";
    if (
      resolved !== raw &&
      String(resolved || "").trim() &&
      !bracketUnresolved(resolved)
    ) {
      return bracketFormatInitials(resolved);
    }
    if (bracketUnresolved(raw)) return bracketFormatTeamSlot(raw);
    return bracketFormatInitials(String(resolved || raw).trim());
  }

  function resolveBracketLabelOnce(label, matchesByCode, matchResults) {
    var text = String(label || "").trim();
    if (!text) return label;

    var winMatch = text.match(/^Vainqueur\s+(.+)$/i);
    var loseMatch = text.match(/^Perdant\s+(.+)$/i);
    var role = null;
    var parentCode = null;
    if (winMatch) {
      role = "winner";
      parentCode = winMatch[1].trim();
    } else if (loseMatch) {
      role = "loser";
      parentCode = loseMatch[1].trim();
    } else {
      return label;
    }

    var parent = lookupCaseMap(matchesByCode, parentCode);
    var result = lookupCaseMap(matchResults, parentCode);
    if (!parent || !result) return label;

    var side = role === "winner" ? result.winner : result.loser;
    var resolved =
      side === 1
        ? String(parent.equipe1 || "").trim()
        : String(parent.equipe2 || "").trim();
    return resolved || label;
  }

  function resolveBracketLabelDeep(label, matchesByCode, matchResults, depth) {
    depth = depth || 0;
    if (depth > 8) return label;
    var resolved = resolveBracketLabelOnce(label, matchesByCode, matchResults);
    if (resolved === label) return label;
    return resolveBracketLabelDeep(
      resolved,
      matchesByCode,
      matchResults,
      depth + 1
    );
  }

  function resolveBracketTeamDisplay(label, matchesByCode, matchResults) {
    var raw = String(label || "").trim();
    if (!raw) return "—";
    var resolved = resolveBracketLabelDeep(raw, matchesByCode, matchResults);
    return bracketFormatDisplay(raw, resolved);
  }

  var BRACKET_SLIDE_H_IN = 6858000 / 914400;

  function bracketPtOnSlide(pt, scaleH) {
    return Math.max(6, Math.round((pt / 72) * (scaleH / BRACKET_SLIDE_H_IN)));
  }

  function bracketTeamIsPlaceholder(text) {
    return BRACKET_PLACEHOLDER.test(String(text || "").trim());
  }

  /** Tailles équipe planning — aligné liveTeamTextClass (LivePlanningTab). */
  function applyPlanningTeamCellStyle(cell, text) {
    if (!cell) return;
    var trimmed = String(text || "").trim();
    cell.classList.remove("text-[10px]", "sm:text-xs", "text-sm", "sm:text-base");
    if (!trimmed || trimmed === "—") return;
    if (bracketTeamIsPlaceholder(trimmed)) {
      cell.classList.add("text-[10px]", "sm:text-xs");
    } else {
      cell.classList.add("text-sm", "sm:text-base");
    }
  }

  /** Style boîte match aligné Live V1 (font-noto, 8.5 pt placeholder / 12 pt équipe). */
  function applyBracketTeamRowStyle(rowEl, spanEl, text, scaleH, bold) {
    if (!rowEl || !spanEl || !scaleH) return;
    var isExportCapture =
      rowEl.closest &&
      (rowEl.closest("#export-capture-layer") || rowEl.closest("[data-export-capture]"));
    var isPh = bracketTeamIsPlaceholder(text);
    var pt = isPh ? 8.5 : 12;
    rowEl.style.fontSize = bracketPtOnSlide(pt, scaleH) + "px";
    rowEl.classList.remove("font-tsl", "font-semibold", "font-normal");
    rowEl.classList.add("font-noto", bold ? "font-semibold" : "font-normal");
    rowEl.classList.remove(
      "justify-start",
      "justify-center",
      "text-left",
      "text-center",
      "overflow-visible",
      "overflow-hidden",
      "whitespace-nowrap"
    );
    spanEl.classList.remove("shrink-0", "whitespace-nowrap", "line-clamp-2", "break-words");
    if (isExportCapture) {
      if (isPh) {
        rowEl.classList.add("justify-start", "text-left", "overflow-visible", "whitespace-nowrap");
        spanEl.classList.add("shrink-0", "whitespace-nowrap");
      } else {
        rowEl.classList.add("justify-center", "text-center", "overflow-hidden");
      }
      return;
    }
    if (isPh) {
      rowEl.classList.add("justify-start", "text-left", "overflow-visible", "whitespace-nowrap");
      spanEl.classList.add("shrink-0");
    } else {
      rowEl.classList.add("justify-center", "text-center", "overflow-hidden");
      spanEl.classList.add("line-clamp-2", "break-words");
    }
  }

  function patchBracketSlides() {
    if (!isManagerRoute()) return;
    var liveData = loadLiveSessionData();
    if (!liveData) return;

    var matchesByCode = buildBracketMatchesByCode(liveData.matches);
    var matchResults = loadBracketMatchResults(liveData.live_token);
    var slides = document.querySelectorAll("[data-bracket-slide]");
    if (!slides.length) return;

    slides.forEach(function (slide) {
      if (slide.closest && slide.closest("#export-capture-layer")) return;
      if (slide.closest && slide.closest("[data-export-capture]")) return;
      var scaleH =
        parseInt(slide.getAttribute("data-capture-height") || "0", 10) ||
        slide.clientHeight ||
        720;
      slide.querySelectorAll(":scope > .absolute.z-10").forEach(function (box) {
        var header = box.querySelector(".rounded-t-lg.bg-template-blue");
        if (!header) return;
        var codeSpans = header.querySelectorAll("span.truncate.font-semibold");
        if (!codeSpans.length) return;
        var code = (codeSpans[0].textContent || "").trim();
        var match = lookupCaseMap(matchesByCode, code);
        if (!match) return;

        var col = box.querySelector(".flex.min-h-0.flex-1.flex-col");
        if (!col || col.children.length < 3) return;
        var team1Row = col.children[0];
        var team2Row = col.children[2];
        var team1Span = team1Row.querySelector("span");
        var team2Span = team2Row.querySelector("span");
        if (!team1Span || !team2Span) return;

        var next1 = resolveBracketTeamDisplay(
          match.equipe1,
          matchesByCode,
          matchResults
        );
        var next2 = resolveBracketTeamDisplay(
          match.equipe2,
          matchesByCode,
          matchResults
        );
        var result = lookupCaseMap(matchResults, code);
        var winnerSide = result && result.winner ? result.winner : null;
        team1Span.textContent = next1;
        team2Span.textContent = next2;
        applyBracketTeamRowStyle(team1Row, team1Span, next1, scaleH, winnerSide === 1);
        applyBracketTeamRowStyle(team2Row, team2Span, next2, scaleH, winnerSide === 2);
      });
    });
  }

  /** Propagation vainqueurs/perdants dans le planning (bundle legacy, comme bracket). */
  function isPlanningTableForPatch(table) {
    if (table.closest("#export-capture-layer")) return false;
    // Legacy : layout inject a deja marque le tableau planning V2.
    if (table.classList.contains("ev2-planning-layout")) return true;
    if (
      table.classList.contains("live-planning-v2-table") &&
      table.closest("[data-planning-layout]")
    ) {
      return true;
    }
    if (table.closest("[data-planning-layout]")) {
      var layoutThs = table.querySelectorAll("thead tr.bg-template-blue th");
      if (layoutThs.length === 6) {
        var layoutFirst = (layoutThs[0].textContent || "").trim().toLowerCase();
        var layoutFourth = (layoutThs[3].textContent || "").trim().toLowerCase();
        if (layoutFirst === "code" && layoutFourth.indexOf("quipe") !== -1) {
          return true;
        }
      }
    }
    // Meme heuristique que layoutPlanning (Code + Terrain, 6 colonnes).
    var ths = table.querySelectorAll("thead tr.bg-template-blue th");
    if (ths.length !== 6) return false;
    var first = (ths[0].textContent || "").trim().toLowerCase();
    var third = (ths[2].textContent || "").trim().toLowerCase();
    return first === "code" && third === "terrain";
  }

  function patchPlanningTables() {
    if (!isManagerRoute()) return;
    var liveData = loadLiveSessionData();
    if (!liveData) return;

    var matchesByCode = buildBracketMatchesByCode(liveData.matches);
    var matchResults = loadBracketMatchResults(liveData.live_token);

    document.querySelectorAll("#root table").forEach(function (table) {
      if (!isPlanningTableForPatch(table)) return;
      table.querySelectorAll("tbody tr").forEach(function (row) {
        var cells = row.querySelectorAll("td");
        if (cells.length < 5) return;
        var code = (cells[0].textContent || "").trim();
        if (!code) return;
        var match = lookupCaseMap(matchesByCode, code);
        if (!match) return;
        var next1 = resolveBracketTeamDisplay(
          match.equipe1,
          matchesByCode,
          matchResults
        );
        var next2 = resolveBracketTeamDisplay(
          match.equipe2,
          matchesByCode,
          matchResults
        );
        if ((cells[3].textContent || "").trim() !== next1) {
          cells[3].textContent = next1;
        }
        applyPlanningTeamCellStyle(cells[3], next1);
        if ((cells[4].textContent || "").trim() !== next2) {
          cells[4].textContent = next2;
        }
        applyPlanningTeamCellStyle(cells[4], next2);
      });
    });
  }

  function watchLiveProgressChanges() {
    if (!isManagerRoute()) return;
    var liveData = loadLiveSessionData();
    if (!liveData) return;
    var raw = "";
    try {
      raw = localStorage.getItem("live-progress-" + liveData.live_token) || "";
    } catch (e) {
      return;
    }
    if (raw !== lastProgressRaw) {
      lastProgressRaw = raw;
      scheduleBracketPatch();
    }
  }

  function scheduleBracketPatch() {
    if (bracketScheduled) return;
    bracketScheduled = true;
    requestAnimationFrame(function () {
      patchBracketSlides();
      patchPlanningTables();
      bracketScheduled = false;
    });
  }

  function boot() {
    layoutPlanning();
    scheduleBracketPatch();
    var root = document.getElementById("root");
    if (root) {
      new MutationObserver(function () {
        scheduleLayout();
        scheduleBracketPatch();
      }).observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(function () {
          scheduleLayout();
          scheduleBracketPatch();
        }).observe(root);
      }
    }
    window.addEventListener("resize", scheduleLayout);
    window.addEventListener("hashchange", function () {
      if ((location.hash || "").indexOf("/manager") === -1) resetPlanningRefHeight();
      scheduleLayout();
      scheduleBracketPatch();
    });
    window.addEventListener("storage", scheduleBracketPatch);
    window.setInterval(function () {
      if (!isManagerRoute()) return;
      watchLiveProgressChanges();
      scheduleBracketPatch();
    }, 250);
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



def strip_live_manager_inject(html: str) -> str:
    return _LIVE_INJECT_STRIP_RE.sub("", html)


def manager_inject_css() -> str:
    return _LIVE_MANAGER_INJECT_CSS


def manager_inject_js() -> str:
    return _LIVE_MANAGER_INJECT_JS


def inject_head_snippet() -> str:
    return _LIVE_MANAGER_INJECT_HEAD_SNIPPET


def inject_strip_html(html: str) -> str:
    return strip_live_manager_inject(html)

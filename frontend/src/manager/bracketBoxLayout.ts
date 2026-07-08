import {
  mapSizeToProjection,
  matchBoxPosition,
  type BoxRectPct,
} from "./bracketGeometry";
import { STANDARD_MATCH_BOX } from "./bracketTemplateMetrics";
import type { ParsedMatchSlot } from "./bracketSlideLayout";

const COLUMN_BUCKET_PCT = 6;
const TOP_MARGIN_PCT = 8;
const BOTTOM_MARGIN_PCT = 92;
const QUARTER_COUNT = 4;

const QUARTER_CODES = ["Q1", "Q2", "Q3", "Q4"] as const;

function columnKey(left: number): number {
  return Math.round(left / COLUMN_BUCKET_PCT) * COLUMN_BUCKET_PCT;
}

function hSortKey(code: string): number {
  const match = code.match(/^H(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Espacement x identique : haut–Q1–Q2–Q3–Q4–bas (n+1 intervalles). */
function equalGapX(slotCount: number, boxHeight: number): number {
  const available = BOTTOM_MARGIN_PCT - TOP_MARGIN_PCT;
  return (available - slotCount * boxHeight) / (slotCount + 1);
}

function topAtGridIndex(index: number, boxHeight: number, slotCount: number): number {
  const x = equalGapX(slotCount, boxHeight);
  return TOP_MARGIN_PCT + x + index * (boxHeight + x);
}

/** Grille fixe Q1–Q4 : source de vérité du tableau principal. */
function computeQuarterGrid(boxHeight: number): Map<string, number> {
  const grid = new Map<string, number>();
  QUARTER_CODES.forEach((code, index) => {
    grid.set(code, topAtGridIndex(index, boxHeight, QUARTER_COUNT));
  });
  return grid;
}

function boxCenterY(top: number, height: number): number {
  return top + height / 2;
}

function topForCenter(centerY: number, height: number): number {
  return centerY - height / 2;
}

function isMainBracketCode(code: string): boolean {
  return (
    /^[HQ]\d+$/.test(code) ||
    /^D\d+$/.test(code) ||
    code === "F" ||
    code === "PF"
  );
}

function isClassementCode(code: string): boolean {
  return /^C[\d_]+$/.test(code);
}

/**
 * Tableau principal — les Q imposent la grille, D/F en découlent.
 * D1 = milieu Q1/Q2, D2 = milieu Q3/Q4, F = milieu D1/D2, PF = top Q4.
 */
function applyMainBracketPositions(
  codes: Set<string>,
  tops: Map<string, number>,
  boxHeight: number
): void {
  const quarterGrid = computeQuarterGrid(boxHeight);

  for (const code of QUARTER_CODES) {
    if (codes.has(code)) {
      tops.set(code, quarterGrid.get(code)!);
    }
  }

  const qCenter = (code: (typeof QUARTER_CODES)[number]) =>
    boxCenterY(quarterGrid.get(code)!, boxHeight);

  const d1Center = (qCenter("Q1") + qCenter("Q2")) / 2;
  const d2Center = (qCenter("Q3") + qCenter("Q4")) / 2;

  if (codes.has("D1")) {
    tops.set("D1", topForCenter(d1Center, boxHeight));
  }
  if (codes.has("D2")) {
    tops.set("D2", topForCenter(d2Center, boxHeight));
  }
  if (codes.has("F")) {
    tops.set("F", topForCenter((d1Center + d2Center) / 2, boxHeight));
  }
  if (codes.has("PF")) {
    tops.set("PF", quarterGrid.get("Q4")!);
  }

  const hCodes = [...codes]
    .filter((code) => /^H\d+$/.test(code))
    .sort((a, b) => hSortKey(a) - hSortKey(b));

  const hBase = hCodes[0] ? Math.floor((hSortKey(hCodes[0]) - 1) / 4) * 4 : 0;

  hCodes.forEach((code) => {
    const index = hSortKey(code) - 1 - hBase;
    if (index >= 0 && index < QUARTER_COUNT) {
      tops.set(code, topAtGridIndex(index, boxHeight, QUARTER_COUNT));
    }
  });
}

/** Colonnes classement : espacement uniforme par colonne. */
function applyClassementColumnPositions(
  slots: ParsedMatchSlot[],
  tops: Map<string, number>,
  boxHeight: number
): void {
  const byColumn = new Map<number, Array<{ code: string; top: number }>>();

  for (const slot of slots) {
    if (!isClassementCode(slot.code)) continue;
    const pos = matchBoxPosition(slot);
    const key = columnKey(pos.x);
    const list = byColumn.get(key) ?? [];
    list.push({ code: slot.code, top: pos.y });
    byColumn.set(key, list);
  }

  for (const list of byColumn.values()) {
    list.sort((a, b) => a.top - b.top);
    const count = list.length;
    list.forEach((item, index) => {
      tops.set(item.code, topAtGridIndex(index, boxHeight, count));
    });
  }
}

export function resolveMatchBoxLayouts(
  slots: ParsedMatchSlot[]
): Map<string, BoxRectPct> {
  const dim = mapSizeToProjection(
    STANDARD_MATCH_BOX.widthPct,
    STANDARD_MATCH_BOX.heightPct
  );

  const codes = new Set(slots.map((slot) => slot.code));
  const hasMainBracket = [...codes].some(isMainBracketCode);
  const tops = new Map<string, number>();

  if (hasMainBracket) {
    applyMainBracketPositions(codes, tops, dim.height);
  }

  applyClassementColumnPositions(slots, tops, dim.height);

  const layouts = new Map<string, BoxRectPct>();
  for (const slot of slots) {
    const pos = matchBoxPosition(slot);
    layouts.set(slot.code, {
      left: pos.x,
      top: tops.get(slot.code) ?? pos.y,
      width: dim.width,
      height: dim.height,
    });
  }

  return layouts;
}

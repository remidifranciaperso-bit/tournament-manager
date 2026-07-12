import {
  mapSizeToProjection,
  matchBoxPosition,
  type BoxRectPct,
} from "./bracketGeometry";
import { STANDARD_MATCH_BOX } from "./bracketTemplateMetrics";
import type { ParsedMatchSlot } from "./bracketSlideLayout";

const COLUMN_BUCKET_PCT = 6;
const PAGE_SPAN_PCT = 100;

const QUARTER_CODES = ["Q1", "Q2", "Q3", "Q4"] as const;

function columnKey(left: number): number {
  return Math.round(left / COLUMN_BUCKET_PCT) * COLUMN_BUCKET_PCT;
}

function hSortKey(code: string): number {
  const match = code.match(/^H(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function quarterIndex(code: string): number | null {
  const match = code.match(/^Q(\d+)$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10) - 1;
}

export interface VerticalGrid {
  tops: number[];
  boxHeight: number;
  gap: number;
}

/**
 * n boîtes de hauteur h, (n+1) intervalles égaux x sur 100 % :
 *   (n+1)·x + n·h = 100  →  x = (100 − n·h) / (n+1)
 * haut — x — slot0 — x — … — slot(n−1) — x — bas
 */
export function buildEqualGapGrid(
  slotCount: number,
  preferredBoxHeight: number,
  span = PAGE_SPAN_PCT
): VerticalGrid {
  let boxHeight = preferredBoxHeight;
  let gap = (span - slotCount * boxHeight) / (slotCount + 1);

  if (gap < 0) {
    boxHeight = span / slotCount;
    gap = 0;
  }

  const tops = Array.from({ length: slotCount }, (_, index) =>
    gap + index * (boxHeight + gap)
  );

  return { tops, boxHeight, gap };
}

/** 4 quarts sur le tournoi (16 équipes) même si la slide n'en affiche que 2. */
export function inferQuarterSlotCount(matchCodes: Iterable<string>): number {
  const codes = new Set(matchCodes);
  if (codes.has("Q3") || codes.has("Q4")) return 4;
  return 2;
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

function isPrelimCode(code: string): boolean {
  return /^P\d+$/.test(code);
}

function isPrelimOnlySlide(codes: Set<string>): boolean {
  const list = [...codes];
  return list.length > 0 && list.every(isPrelimCode);
}

/**
 * Tour préliminaire seul (P1…Pn) : colonne(s) centrée(s) horizontalement.
 * Les tops template sont conservés ; décalage vertical minimal si débordement bas.
 */
function applyPrelimColumnPositions(
  slots: ParsedMatchSlot[],
  tops: Map<string, number>,
  lefts: Map<string, number>,
  boxWidth: number,
  boxHeight: number
): void {
  const MAX_BOTTOM_PCT = 100;
  const prelimSlots = slots.filter((slot) => isPrelimCode(slot.code));
  if (prelimSlots.length === 0) return;

  const byColumn = new Map<number, Array<{ code: string; top: number }>>();
  for (const slot of prelimSlots) {
    const pos = matchBoxPosition(slot);
    const key = columnKey(pos.x);
    const list = byColumn.get(key) ?? [];
    list.push({ code: slot.code, top: pos.y });
    byColumn.set(key, list);
  }

  const columnKeys = [...byColumn.keys()].sort((a, b) => a - b);

  columnKeys.forEach((key, columnIndex) => {
    const list = byColumn.get(key)!;
    list.sort((a, b) => a.top - b.top);

    const spanWidth = PAGE_SPAN_PCT / columnKeys.length;
    const spanStart = columnIndex * spanWidth;
    const centeredLeft = spanStart + (spanWidth - boxWidth) / 2;

    for (const item of list) {
      tops.set(item.code, item.top);
      lefts.set(item.code, centeredLeft);
    }

    const last = list[list.length - 1];
    const lastTop = tops.get(last.code) ?? last.top;
    const overflow = lastTop + boxHeight - MAX_BOTTOM_PCT;
    if (overflow > 0) {
      for (const item of list) {
        const currentTop = tops.get(item.code) ?? item.top;
        tops.set(item.code, Math.max(0, currentTop - overflow));
      }
    }
  });
}

/**
 * Tableau principal — les Q imposent la grille, D/F en découlent.
 * D1 = milieu Q1/Q2, D2 = milieu Q3/Q4, F = milieu D1/D2, PF = top Q4.
 */
function applyMainBracketPositions(
  codes: Set<string>,
  tops: Map<string, number>,
  quarterGrid: VerticalGrid
): void {
  const { tops: qTops, boxHeight } = quarterGrid;

  for (const code of QUARTER_CODES) {
    const index = quarterIndex(code);
    if (index == null || index >= qTops.length) continue;
    if (codes.has(code)) {
      tops.set(code, qTops[index]);
    }
  }

  const qTop = (index: number) => qTops[index] ?? qTops[qTops.length - 1];
  const qCenter = (index: number) => boxCenterY(qTop(index), boxHeight);

  const d1Center = (qCenter(0) + qCenter(1)) / 2;
  const d2Center = (qCenter(2) + qCenter(3)) / 2;

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
    tops.set("PF", qTop(3));
  }

  const hCodes = [...codes]
    .filter((code) => /^H\d+$/.test(code))
    .sort((a, b) => hSortKey(a) - hSortKey(b));

  const hBase = hCodes[0] ? Math.floor((hSortKey(hCodes[0]) - 1) / 4) * 4 : 0;

  hCodes.forEach((code) => {
    const index = hSortKey(code) - 1 - hBase;
    if (index >= 0 && index < qTops.length) {
      tops.set(code, qTops[index]);
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
    const grid = buildEqualGapGrid(list.length, boxHeight);
    list.forEach((item, index) => {
      tops.set(item.code, grid.tops[index]);
    });
  }
}

export function resolveMatchBoxLayouts(
  slots: ParsedMatchSlot[],
  options?: { matchCodes?: Iterable<string> }
): Map<string, BoxRectPct> {
  const dim = mapSizeToProjection(
    STANDARD_MATCH_BOX.widthPct,
    STANDARD_MATCH_BOX.heightPct
  );

  const codes = new Set(slots.map((slot) => slot.code));
  const hasMainBracket = [...codes].some(isMainBracketCode);
  const prelimOnly = isPrelimOnlySlide(codes);
  const tops = new Map<string, number>();
  const lefts = new Map<string, number>();

  const quarterSlotCount = inferQuarterSlotCount(
    options?.matchCodes ?? codes
  );
  const quarterGrid = buildEqualGapGrid(quarterSlotCount, dim.height);
  const boxHeight = hasMainBracket ? quarterGrid.boxHeight : dim.height;

  if (hasMainBracket) {
    applyMainBracketPositions(codes, tops, quarterGrid);
  }

  if (prelimOnly) {
    applyPrelimColumnPositions(slots, tops, lefts, dim.width, boxHeight);
  } else {
    applyClassementColumnPositions(slots, tops, boxHeight);
  }

  const layouts = new Map<string, BoxRectPct>();
  for (const slot of slots) {
    const pos = matchBoxPosition(slot);
    layouts.set(slot.code, {
      left: lefts.get(slot.code) ?? pos.x,
      top: tops.get(slot.code) ?? pos.y,
      width: dim.width,
      height: boxHeight,
    });
  }

  return layouts;
}

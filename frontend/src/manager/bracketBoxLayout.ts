import {
  mapSizeToProjection,
  matchBoxPosition,
  type BoxRectPct,
} from "./bracketGeometry";
import { STANDARD_MATCH_BOX } from "./bracketTemplateMetrics";
import type { ParsedMatchSlot } from "./bracketSlideLayout";

const COLUMN_BUCKET_PCT = 6;
/** Zone utile du slide — espacement x jusqu'aux bords. */
const PAGE_TOP_PCT = 4;
const PAGE_BOTTOM_PCT = 96;
const MIN_GAP_PCT = 1;

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
 * n boîtes avec (n+1) intervalles égaux x :
 * haut — x — slot0 — x — … — slot(n-1) — x — bas
 */
export function buildEqualGapGrid(
  slotCount: number,
  preferredBoxHeight: number,
  topMargin = PAGE_TOP_PCT,
  bottomMargin = PAGE_BOTTOM_PCT
): VerticalGrid {
  const span = bottomMargin - topMargin;
  let boxHeight = preferredBoxHeight;
  let gap = (span - slotCount * boxHeight) / (slotCount + 1);

  if (gap < MIN_GAP_PCT) {
    gap = MIN_GAP_PCT;
    boxHeight = (span - (slotCount + 1) * gap) / slotCount;
  }

  const tops = Array.from({ length: slotCount }, (_, index) =>
    topMargin + gap + index * (boxHeight + gap)
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
  const tops = new Map<string, number>();

  const quarterSlotCount = inferQuarterSlotCount(
    options?.matchCodes ?? codes
  );
  const quarterGrid = buildEqualGapGrid(quarterSlotCount, dim.height);
  const boxHeight = hasMainBracket ? quarterGrid.boxHeight : dim.height;

  if (hasMainBracket) {
    applyMainBracketPositions(codes, tops, quarterGrid);
  }

  applyClassementColumnPositions(slots, tops, boxHeight);

  const layouts = new Map<string, BoxRectPct>();
  for (const slot of slots) {
    const pos = matchBoxPosition(slot);
    layouts.set(slot.code, {
      left: pos.x,
      top: tops.get(slot.code) ?? pos.y,
      width: dim.width,
      height: boxHeight,
    });
  }

  return layouts;
}

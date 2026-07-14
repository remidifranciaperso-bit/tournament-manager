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

type EightTeamRow = "q0" | "q1" | "q2" | "q3" | "d1" | "d2" | "f" | "pf";

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

function eightTeamRowTop(row: EightTeamRow, grid: VerticalGrid): number {
  const { tops: qTops, boxHeight } = grid;
  const qTop = (index: number) => qTops[index] ?? qTops[qTops.length - 1];
  const qCenter = (index: number) => boxCenterY(qTop(index), boxHeight);
  const d1Center = (qCenter(0) + qCenter(1)) / 2;
  const d2Center = (qCenter(2) + qCenter(3)) / 2;
  const fCenter = (d1Center + d2Center) / 2;

  switch (row) {
    case "q0":
      return qTop(0);
    case "q1":
      return qTop(1);
    case "q2":
      return qTop(2);
    case "q3":
      return qTop(3);
    case "d1":
      return topForCenter(d1Center, boxHeight);
    case "d2":
      return topForCenter(d2Center, boxHeight);
    case "f":
      return topForCenter(fCenter, boxHeight);
    case "pf":
      return qTop(3);
  }
}

function setEightTeamRow(
  tops: Map<string, number>,
  code: string,
  row: EightTeamRow,
  grid: VerticalGrid
): void {
  tops.set(code, eightTeamRowTop(row, grid));
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

/** Tableau principal 16 équipes scindé en partie haute / basse. */
export function inferSplitMainBracketHalf(
  slideCodes: Set<string>,
  allMatchCodes: Set<string>
): "upper" | "lower" | null {
  const hasHRound = [...allMatchCodes].some((code) => /^H\d+$/.test(code));
  if (!hasHRound) return null;

  const hOnSlide = [...slideCodes]
    .filter((code) => /^H\d+$/.test(code))
    .map(hSortKey)
    .sort((a, b) => a - b);
  if (hOnSlide.length === 0) return null;

  const minH = hOnSlide[0];
  const maxH = hOnSlide[hOnSlide.length - 1];
  if (minH <= 4 && maxH > 4) return null;

  if (maxH <= 4) return "upper";
  if (minH >= 5) return "lower";
  return null;
}

type ClassementEightTeamStyle = "main" | "main1720" | "ranking" | "ranking2124";

function detectClassementEightTeamStyle(
  codes: Set<string>
): ClassementEightTeamStyle | null {
  if (codes.has("C9_16_1") || codes.has("C9_12_1")) return "main";
  if (codes.has("C17_24_1") || codes.has("C17_20_1")) return "main1720";
  if (codes.has("C21_24_1")) return "ranking2124";
  if (codes.has("C5_8_1") || codes.has("C13_16_1")) return "ranking";
  return null;
}

/**
 * Tour préliminaire seul (P1…Pn) : colonne(s) centrée(s) horizontalement
 * et verticalement (grille à espacement uniforme, même hauteur de boîte).
 */
function applyPrelimColumnPositions(
  slots: ParsedMatchSlot[],
  tops: Map<string, number>,
  lefts: Map<string, number>,
  boxWidth: number,
  boxHeight: number
): void {
  const prelimSlots = slots.filter((slot) => isPrelimCode(slot.code));
  if (prelimSlots.length === 0) return;

  const byColumn = new Map<number, ParsedMatchSlot[]>();
  for (const slot of prelimSlots) {
    const pos = matchBoxPosition(slot);
    const key = columnKey(pos.x);
    const list = byColumn.get(key) ?? [];
    list.push(slot);
    byColumn.set(key, list);
  }

  const columnKeys = [...byColumn.keys()].sort((a, b) => a - b);

  columnKeys.forEach((key, columnIndex) => {
    const colSlots = byColumn.get(key)!;
    colSlots.sort(
      (a, b) => matchBoxPosition(a).y - matchBoxPosition(b).y
    );

    const grid = buildEqualGapGrid(colSlots.length, boxHeight);
    const spanWidth = PAGE_SPAN_PCT / columnKeys.length;
    const spanStart = columnIndex * spanWidth;
    const centeredLeft = spanStart + (spanWidth - boxWidth) / 2;

    colSlots.forEach((slot, slotIndex) => {
      tops.set(slot.code, grid.tops[slotIndex]);
      lefts.set(slot.code, centeredLeft);
    });
  });
}

/**
 * Tableau principal 8 équipes sur une page — les Q imposent la grille, D/F en découlent.
 */
function applyMainBracketPositions(
  codes: Set<string>,
  tops: Map<string, number>,
  quarterGrid: VerticalGrid
): void {
  for (const code of QUARTER_CODES) {
    const index = quarterIndex(code);
    if (index == null || index >= quarterGrid.tops.length) continue;
    if (codes.has(code)) {
      setEightTeamRow(tops, code, `q${index}` as EightTeamRow, quarterGrid);
    }
  }

  if (codes.has("D1")) setEightTeamRow(tops, "D1", "d1", quarterGrid);
  if (codes.has("D2")) setEightTeamRow(tops, "D2", "d2", quarterGrid);
  if (codes.has("F")) setEightTeamRow(tops, "F", "f", quarterGrid);
  if (codes.has("PF")) setEightTeamRow(tops, "PF", "pf", quarterGrid);
}

/**
 * Tableau principal 16 équipes — chaque moitié reprend la géométrie d'un tableau 8 :
 * H1–H4 / H5–H8 = Q1–Q4 ; Q1–Q2 / Q3–Q4 = D1–D2 ; D1 / D2 = F ; F / PF = PF.
 */
function applySplitMainBracketHalf(
  codes: Set<string>,
  tops: Map<string, number>,
  quarterGrid: VerticalGrid,
  half: "upper" | "lower"
): void {
  const hBase = half === "upper" ? 0 : 4;

  for (const code of codes) {
    if (!/^H\d+$/.test(code)) continue;
    const index = hSortKey(code) - 1 - hBase;
    if (index >= 0 && index < 4) {
      setEightTeamRow(tops, code, `q${index}` as EightTeamRow, quarterGrid);
    }
  }

  if (half === "upper") {
    if (codes.has("Q1")) setEightTeamRow(tops, "Q1", "d1", quarterGrid);
    if (codes.has("Q2")) setEightTeamRow(tops, "Q2", "d2", quarterGrid);
    if (codes.has("D1")) setEightTeamRow(tops, "D1", "f", quarterGrid);
    if (codes.has("F")) setEightTeamRow(tops, "F", "pf", quarterGrid);
  } else {
    if (codes.has("Q3")) setEightTeamRow(tops, "Q3", "d1", quarterGrid);
    if (codes.has("Q4")) setEightTeamRow(tops, "Q4", "d2", quarterGrid);
    if (codes.has("D2")) setEightTeamRow(tops, "D2", "f", quarterGrid);
    if (codes.has("PF")) setEightTeamRow(tops, "PF", "pf", quarterGrid);
  }
}

/** Classement 9-12 : même mise en page qu'un tableau principal 8 équipes. */
function applyClassementMainEightTeam(
  codes: Set<string>,
  tops: Map<string, number>,
  quarterGrid: VerticalGrid
): void {
  const firstRound = ["C9_16_1", "C9_16_2", "C9_16_3", "C9_16_4"] as const;
  firstRound.forEach((code, index) => {
    if (codes.has(code)) {
      setEightTeamRow(tops, code, `q${index}` as EightTeamRow, quarterGrid);
    }
  });

  if (codes.has("C9_12_1")) setEightTeamRow(tops, "C9_12_1", "d1", quarterGrid);
  if (codes.has("C9_12_2")) setEightTeamRow(tops, "C9_12_2", "d2", quarterGrid);
  if (codes.has("C9_10")) setEightTeamRow(tops, "C9_10", "f", quarterGrid);
  if (codes.has("C11_12")) {
    // 12 équipes : tableau 9-12 « miroir » à 4 boîtes → C11_12 face à C9_10
    // (même hauteur, à gauche). 16 équipes : vraie petite finale (8 boîtes) en bas.
    const fourBoxMirror = codes.has("C9_12_1") && !codes.has("C9_16_1");
    setEightTeamRow(tops, "C11_12", fourBoxMirror ? "f" : "pf", quarterGrid);
  }
}

/** Classement 17-20 : même mise en page que 9-12. */
function applyClassement1720EightTeam(
  codes: Set<string>,
  tops: Map<string, number>,
  quarterGrid: VerticalGrid
): void {
  const firstRound = ["C17_24_1", "C17_24_2", "C17_24_3", "C17_24_4"] as const;
  firstRound.forEach((code, index) => {
    if (codes.has(code)) {
      setEightTeamRow(tops, code, `q${index}` as EightTeamRow, quarterGrid);
    }
  });

  if (codes.has("C17_20_1")) setEightTeamRow(tops, "C17_20_1", "d1", quarterGrid);
  if (codes.has("C17_20_2")) setEightTeamRow(tops, "C17_20_2", "d2", quarterGrid);
  if (codes.has("C17_18")) setEightTeamRow(tops, "C17_18", "f", quarterGrid);
  if (codes.has("C19_20")) {
    // 20 équipes : tableau 17-20 « miroir » à 4 boîtes → C19_20 face à C17_18.
    // 24 équipes : vraie petite finale (8 boîtes) en bas.
    const fourBoxMirror = codes.has("C17_20_1") && !codes.has("C17_24_1");
    setEightTeamRow(tops, "C19_20", fourBoxMirror ? "f" : "pf", quarterGrid);
  }
}

/** Classement 21-24 : même mise en page que 5-8 / 13-16. */
function applyClassement2124EightTeam(
  codes: Set<string>,
  tops: Map<string, number>,
  quarterGrid: VerticalGrid
): void {
  if (codes.has("C21_24_1")) setEightTeamRow(tops, "C21_24_1", "d1", quarterGrid);
  if (codes.has("C21_24_2")) setEightTeamRow(tops, "C21_24_2", "d2", quarterGrid);
  if (codes.has("C23_24")) setEightTeamRow(tops, "C23_24", "f", quarterGrid);
  if (codes.has("C21_22")) setEightTeamRow(tops, "C21_22", "f", quarterGrid);
}

/** Classements 5-8 et 13-16 : calqués sur le slide C5_8 de 8 équipes. */
function applyClassementRankingEightTeam(
  codes: Set<string>,
  tops: Map<string, number>,
  quarterGrid: VerticalGrid
): void {
  const semi1 = codes.has("C5_8_1")
    ? "C5_8_1"
    : codes.has("C13_16_1")
      ? "C13_16_1"
      : null;
  const semi2 = codes.has("C5_8_2")
    ? "C5_8_2"
    : codes.has("C13_16_2")
      ? "C13_16_2"
      : null;
  const finalLeft = codes.has("C7_8")
    ? "C7_8"
    : codes.has("C15_16")
      ? "C15_16"
      : null;
  const finalRight = codes.has("C5_6")
    ? "C5_6"
    : codes.has("C13_14")
      ? "C13_14"
      : null;

  if (semi1) setEightTeamRow(tops, semi1, "d1", quarterGrid);
  if (semi2) setEightTeamRow(tops, semi2, "d2", quarterGrid);
  if (finalLeft) setEightTeamRow(tops, finalLeft, "f", quarterGrid);
  if (finalRight) setEightTeamRow(tops, finalRight, "f", quarterGrid);
}

/** Colonnes classement générique : espacement uniforme par colonne. */
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
  const allMatchCodes = new Set(options?.matchCodes ?? codes);
  const hasMainBracket = [...codes].some(isMainBracketCode);
  const prelimOnly = isPrelimOnlySlide(codes);
  const splitHalf = inferSplitMainBracketHalf(codes, allMatchCodes);
  const classementStyle = detectClassementEightTeamStyle(codes);
  const tops = new Map<string, number>();
  const lefts = new Map<string, number>();

  const quarterSlotCount = inferQuarterSlotCount(allMatchCodes);
  const quarterGrid = buildEqualGapGrid(quarterSlotCount, dim.height);
  const useEightTeamGrid =
    hasMainBracket || classementStyle != null || prelimOnly;
  const boxHeight = useEightTeamGrid ? quarterGrid.boxHeight : dim.height;

  if (hasMainBracket) {
    if (splitHalf) {
      applySplitMainBracketHalf(codes, tops, quarterGrid, splitHalf);
    } else {
      applyMainBracketPositions(codes, tops, quarterGrid);
    }
  } else if (classementStyle === "main") {
    applyClassementMainEightTeam(codes, tops, quarterGrid);
  } else if (classementStyle === "main1720") {
    applyClassement1720EightTeam(codes, tops, quarterGrid);
  } else if (classementStyle === "ranking2124") {
    applyClassement2124EightTeam(codes, tops, quarterGrid);
  } else if (classementStyle === "ranking") {
    applyClassementRankingEightTeam(codes, tops, quarterGrid);
  } else if (!prelimOnly) {
    applyClassementColumnPositions(slots, tops, boxHeight);
  }

  if (prelimOnly) {
    applyPrelimColumnPositions(slots, tops, lefts, dim.width, boxHeight);
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

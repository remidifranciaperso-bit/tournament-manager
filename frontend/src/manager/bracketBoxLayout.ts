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

function columnKey(left: number): number {
  return Math.round(left / COLUMN_BUCKET_PCT) * COLUMN_BUCKET_PCT;
}

function qSortKey(code: string): number {
  const match = code.match(/^Q(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function hSortKey(code: string): number {
  const match = code.match(/^H(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Espacement identique entre boîtes ET entre haut/bas de page. */
function distributeEqualEdgeGaps(count: number, boxHeight: number): number[] {
  if (count === 0) return [];
  const available = BOTTOM_MARGIN_PCT - TOP_MARGIN_PCT;
  const gap = (available - count * boxHeight) / (count + 1);
  return Array.from(
    { length: count },
    (_, index) => TOP_MARGIN_PCT + gap + index * (boxHeight + gap)
  );
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
 * Règles tableau principal :
 * - Q : espacement uniforme (marges haut/bas = inter-lignes)
 * - D1 : milieu de Q1–Q2 ; D2 : milieu de Q3–Q4
 * - F : milieu de D1–D2 ; PF : même top que Q4
 */
function applyMainBracketPositions(
  codes: Set<string>,
  tops: Map<string, number>,
  boxHeight: number
): void {
  const qCodes = [...codes]
    .filter((code) => /^Q\d+$/.test(code))
    .sort((a, b) => qSortKey(a) - qSortKey(b));

  const qTops = distributeEqualEdgeGaps(qCodes.length, boxHeight);
  qCodes.forEach((code, index) => tops.set(code, qTops[index]));

  const centerOf = (code: string): number | undefined => {
    const top = tops.get(code);
    return top === undefined ? undefined : boxCenterY(top, boxHeight);
  };

  const q1 = centerOf("Q1");
  const q2 = centerOf("Q2");
  const q3 = centerOf("Q3");
  const q4 = centerOf("Q4");

  if (codes.has("D1") && q1 !== undefined && q2 !== undefined) {
    tops.set("D1", topForCenter((q1 + q2) / 2, boxHeight));
  }

  if (codes.has("D2") && q3 !== undefined && q4 !== undefined) {
    tops.set("D2", topForCenter((q3 + q4) / 2, boxHeight));
  }

  const d1 = centerOf("D1");
  const d2 = centerOf("D2");

  if (codes.has("F") && d1 !== undefined && d2 !== undefined) {
    tops.set("F", topForCenter((d1 + d2) / 2, boxHeight));
  } else if (codes.has("F") && d1 !== undefined && q1 !== undefined) {
    // Slide partielle (ex. 16 équipes) : prolonge la symétrie Q1→D1→F
    tops.set("F", topForCenter(d1 + (d1 - q1), boxHeight));
  }

  if (codes.has("PF") && tops.has("Q4")) {
    tops.set("PF", tops.get("Q4")!);
  }

  const hCodes = [...codes]
    .filter((code) => /^H\d+$/.test(code))
    .sort((a, b) => hSortKey(a) - hSortKey(b));

  const hTops = distributeEqualEdgeGaps(hCodes.length, boxHeight);
  hCodes.forEach((code, index) => tops.set(code, hTops[index]));
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
    const columnTops = distributeEqualEdgeGaps(list.length, boxHeight);
    list.forEach((item, index) => tops.set(item.code, columnTops[index]));
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

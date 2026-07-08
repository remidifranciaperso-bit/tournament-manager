import {
  mapSizeToProjection,
  matchBoxPosition,
  type BoxRectPct,
} from "./bracketGeometry";
import { STANDARD_MATCH_BOX } from "./bracketTemplateMetrics";
import type { ParsedMatchSlot } from "./bracketSlideLayout";

const COLUMN_BUCKET_PCT = 6;
const TOP_MARGIN_PCT = 9;
const BOTTOM_MARGIN_PCT = 96;
const MIN_GAP_PCT = 0.4;

function columnKey(left: number): number {
  return Math.round(left / COLUMN_BUCKET_PCT) * COLUMN_BUCKET_PCT;
}

/** Répartit les boîtes d'une colonne avec un espacement vertical identique. */
function distributeColumnEvenly(
  items: Array<{ code: string; top: number }>,
  boxHeight: number
): Map<string, number> {
  const tops = new Map<string, number>();
  const n = items.length;
  if (n === 0) return tops;

  if (n === 1) {
    tops.set(items[0].code, items[0].top);
    return tops;
  }

  const available = BOTTOM_MARGIN_PCT - TOP_MARGIN_PCT;
  const gap = Math.max(
    MIN_GAP_PCT,
    (available - n * boxHeight) / (n - 1)
  );

  let y = TOP_MARGIN_PCT;
  for (const item of items) {
    tops.set(item.code, y);
    y += boxHeight + gap;
  }

  return tops;
}

export function resolveMatchBoxLayouts(
  slots: ParsedMatchSlot[]
): Map<string, BoxRectPct> {
  const dim = mapSizeToProjection(
    STANDARD_MATCH_BOX.widthPct,
    STANDARD_MATCH_BOX.heightPct
  );

  const byColumn = new Map<number, Array<{ code: string; top: number }>>();

  for (const slot of slots) {
    const pos = matchBoxPosition(slot);
    const key = columnKey(pos.x);
    const list = byColumn.get(key) ?? [];
    list.push({ code: slot.code, top: pos.y });
    byColumn.set(key, list);
  }

  const resolvedTops = new Map<string, number>();

  for (const list of byColumn.values()) {
    list.sort((a, b) => a.top - b.top);
    const columnTops = distributeColumnEvenly(list, dim.height);
    for (const [code, top] of columnTops) {
      resolvedTops.set(code, top);
    }
  }

  const layouts = new Map<string, BoxRectPct>();
  for (const slot of slots) {
    const pos = matchBoxPosition(slot);
    layouts.set(slot.code, {
      left: pos.x,
      top: resolvedTops.get(slot.code) ?? pos.y,
      width: dim.width,
      height: dim.height,
    });
  }

  return layouts;
}

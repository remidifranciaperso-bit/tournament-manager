import {
  mapSizeToProjection,
  matchBoxPosition,
  type BoxRectPct,
} from "./bracketGeometry";
import { STANDARD_MATCH_BOX } from "./bracketTemplateMetrics";
import type { ParsedMatchSlot } from "./bracketSlideLayout";

const COLUMN_BUCKET_PCT = 6;
const MIN_GAP_PCT = 0.35;
const MAX_BOTTOM_PCT = 98.5;

function columnKey(left: number): number {
  return Math.round(left / COLUMN_BUCKET_PCT) * COLUMN_BUCKET_PCT;
}

/**
 * Repositionne les boîtes dans chaque colonne pour éviter les chevauchements
 * tout en conservant l'ordre vertical du template.
 */
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

    let prevBottom = -Infinity;
    for (const item of list) {
      let top = item.top;
      if (top < prevBottom + MIN_GAP_PCT) {
        top = prevBottom + MIN_GAP_PCT;
      }
      resolvedTops.set(item.code, top);
      prevBottom = top + dim.height;
    }

    const last = list[list.length - 1];
    const lastTop = resolvedTops.get(last.code) ?? last.top;
    const overflow = lastTop + dim.height - MAX_BOTTOM_PCT;
    if (overflow > 0) {
      for (const item of list) {
        const t = resolvedTops.get(item.code) ?? item.top;
        resolvedTops.set(item.code, Math.max(0, t - overflow));
      }
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

import { buildPlanningRows } from "./buildPlanningTable";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import { estimatePlanningTableHeight } from "./exportCapture";

/** Hauteur de référence (px) pour l’échelle uniforme — slide planning le plus chargé. */
export function computePlanningReferenceHeight(
  planningLayout: Record<string, LiveLayoutField[]>,
  matches: LiveMatch[],
  completed: Set<string>,
  matchResults: Record<string, StoredMatchResult>
): number {
  let maxRows = 0;
  for (const fields of Object.values(planningLayout)) {
    if (!fields?.length) continue;
    const rows = buildPlanningRows(fields, matches, completed, matchResults);
    maxRows = Math.max(maxRows, rows.length);
  }
  return estimatePlanningTableHeight(maxRows);
}

import type { LiveMatch, LivePageMap } from "./liveTypes";

export function matchesForPlanningPage(
  matches: LiveMatch[],
  pageMap: LivePageMap,
  planningPage: number
): LiveMatch[] {
  const multiPlanning =
    pageMap.planning_groups.length > 1 || pageMap.planning.length > 1;

  let filtered = matches;
  if (multiPlanning) {
    const jour = planningPage + 1;
    const dayMatches = matches.filter((match) => match.jour === jour);
    if (dayMatches.length > 0) filtered = dayMatches;
  }

  return [...filtered].sort(
    (a, b) => a.ordre_planning - b.ordre_planning || a.ordre - b.ordre
  );
}

import type { LivePageEntry, LivePageMap } from "./liveTypes";

export type LivePrimaryTab =
  | "live"
  | "upcoming"
  | "main"
  | "classement"
  | "planning"
  | "final";

export const LIVE_PRIMARY_TABS: { id: LivePrimaryTab; label: string }[] = [
  { id: "live", label: "Matchs en cours" },
  { id: "upcoming", label: "Prochains matchs" },
  { id: "main", label: "Tableau principal" },
  { id: "classement", label: "Tableaux de classement" },
  { id: "planning", label: "Planning" },
  { id: "final", label: "Classement final" },
];

export const LIVE_PRIMARY_TAB_COUNT = LIVE_PRIMARY_TABS.length;

export const LIVE_TAB_WIDTH_CLASS = `w-[calc((100%-1.25rem)/${LIVE_PRIMARY_TAB_COUNT})]`;

export function pageEntries(
  pageMap: LivePageMap,
  key: keyof LivePageMap
): LivePageEntry[] {
  const value = pageMap[key];
  if (!Array.isArray(value)) return [];
  return value as LivePageEntry[];
}

export function subTabLabels(entries: LivePageEntry[]): string[] {
  if (entries.length <= 1) return [];
  return entries.map((entry) => entry.label);
}

export function slideIndexAt(entries: LivePageEntry[], page: number): number | null {
  return entries[page]?.index ?? null;
}

export function planningIndicesForPage(
  pageMap: LivePageMap,
  planningPage: number
): number[] {
  const groups = pageMap.planning_groups;
  if (groups.length > 1 && groups[planningPage]) {
    return groups[planningPage];
  }
  const entry = pageMap.planning[planningPage];
  return entry ? [entry.index] : [];
}

export function allSlideIndices(pageMap: LivePageMap): number[] {
  const indices = new Set<number>();

  for (const key of ["main", "classement", "planning", "final"] as const) {
    for (const entry of pageEntries(pageMap, key)) {
      indices.add(entry.index);
    }
  }

  for (const group of pageMap.planning_groups) {
    for (const index of group) {
      indices.add(index);
    }
  }

  return [...indices].sort((a, b) => a - b);
}

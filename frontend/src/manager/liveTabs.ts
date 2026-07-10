import type { LivePageEntry, LivePageMap } from "./liveTypes";

export type LivePrimaryTab =
  | "avancement"
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
  { id: "classement", label: "Matchs de classement" },
  { id: "planning", label: "Planning" },
  { id: "final", label: "Classement final" },
  { id: "avancement", label: "Avancement" },
];

/** Libellé brush affiché en tête de page (ex. « Classement 5-8 »). */
export function formatPageBrushLabel(label: string | undefined): string | null {
  if (!label?.trim()) return null;
  const normalized = label.trim().replace(/\s+/g, " ");
  if (/^classement\b/i.test(normalized)) {
    const suffix = normalized.replace(/^classement\s*/i, "").trim();
    return suffix ? `Classement ${suffix}` : "Classement";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function activeTabBrushLabel(
  tab: LivePrimaryTab,
  pages: {
    main: LivePageEntry[];
    classement: LivePageEntry[];
    planning: LivePageEntry[];
    mainPage: number;
    classementPage: number;
    planningPage: number;
  }
): string {
  const primary =
    LIVE_PRIMARY_TABS.find((entry) => entry.id === tab)?.label ?? "";

  switch (tab) {
    case "main": {
      const label = formatPageBrushLabel(pages.main[pages.mainPage]?.label);
      return label ?? primary;
    }
    case "classement": {
      const label = formatPageBrushLabel(
        pages.classement[pages.classementPage]?.label
      );
      return label ?? primary;
    }
    case "planning": {
      const label = formatPageBrushLabel(
        pages.planning[pages.planningPage]?.label
      );
      return label ?? primary;
    }
    default:
      return primary;
  }
}

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

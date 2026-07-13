import type { BroadcastableTab } from "./liveRetransmission";
import type { LivePageEntry, LivePageMap } from "./liveTypes";

export type LivePrimaryTab =
  | "avancement"
  | "live"
  | "upcoming"
  | "main"
  | "classement"
  | "planning"
  | "final"
  | "retransmission";

export const LIVE_PRIMARY_TABS: { id: LivePrimaryTab; label: string }[] = [
  { id: "live", label: "Matchs en cours" },
  { id: "upcoming", label: "Prochains matchs" },
  { id: "main", label: "Tableau principal" },
  { id: "classement", label: "Tableaux de classement" },
  { id: "planning", label: "Planning" },
  { id: "final", label: "Classement final" },
  { id: "avancement", label: "Avancement" },
  { id: "retransmission", label: "Retransmission" },
];

/** Libellé onglet classement : singulier s'il n'y a qu'une page (ex. 5-8 seul). */
export function classementPrimaryTabLabel(entryCount: number): string {
  return entryCount <= 1 ? "Tableau de classement" : "Tableaux de classement";
}

export function primaryTabLabel(
  tab: LivePrimaryTab,
  classementPageCount = 0
): string {
  if (tab === "classement") {
    return classementPrimaryTabLabel(classementPageCount);
  }
  return LIVE_PRIMARY_TABS.find((entry) => entry.id === tab)?.label ?? "";
}

export function mainPageHiddenBrushReserveLabel(
  entry: LivePageEntry | undefined
): string | null {
  const raw = entry?.label?.trim();
  if (!raw || !/^partie basse$/i.test(raw)) return null;
  return raw;
}

/** Libellé brush affiché en tête de page (ex. « Classement 5-8 »). */
export function formatPageBrushLabel(label: string | undefined): string | null {
  if (!label?.trim()) return null;
  const normalized = label.trim().replace(/\s+/g, " ");
  if (/^partie basse$/i.test(normalized)) return null;
  if (/^partie haute$/i.test(normalized)) return "Tableau Principal";
  if (/^classement\b/i.test(normalized)) {
    const suffix = normalized.replace(/^classement\s*/i, "").trim();
    return suffix ? `Classement ${suffix}` : "Classement";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function broadcastTabBrushLabel(
  tab: BroadcastableTab,
  pages: {
    main: LivePageEntry[];
    classement: LivePageEntry[];
    planning: LivePageEntry[];
    mainPage: number;
    classementPage: number;
    planningPage: number;
  }
): string {
  if (tab === "cover") return "";
  return activeTabBrushLabel(tab, pages);
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
      if (label === null) return "";
      return label || primary;
    }
    case "classement": {
      const label = formatPageBrushLabel(
        pages.classement[pages.classementPage]?.label
      );
      return label ?? classementPrimaryTabLabel(pages.classement.length);
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

const PRELIM_LABEL_RE = /préliminaire|preliminaire/i;

/** Codes match tour préliminaire (P1, P2, …). */
export function prelimMatchCodes(matches: { code: string }[]): string[] {
  return matches
    .map((match) => match.code)
    .filter((code) => /^P\d+$/.test(code));
}

export function allPrelimMatchesDone(
  matches: { code: string }[],
  completed: Set<string> | string[]
): boolean {
  const codes = prelimMatchCodes(matches);
  if (codes.length === 0) return false;
  const done = completed instanceof Set ? completed : new Set(completed);
  return codes.every((code) => done.has(code));
}

/** Sous-onglet « Tableau principal » : préliminaire tant que P* en cours, sinon tableau. */
export function defaultMainSubPage(
  mainPages: LivePageEntry[],
  matches: { code: string }[],
  completed: Set<string> | string[]
): number {
  if (mainPages.length <= 1) return 0;
  if (!allPrelimMatchesDone(matches, completed)) return 0;

  const bracketPage = mainPages.findIndex(
    (entry) => !PRELIM_LABEL_RE.test(entry.label)
  );
  return bracketPage >= 0 ? bracketPage : 0;
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

import type { LivePrimaryTab } from "./liveTabs";
import { LIVE_PRIMARY_TABS, pageEntries, primaryTabLabel } from "./liveTabs";
import type { LivePageMap } from "./liveTypes";

/** Onglets du manager pouvant être retransmis (hors Retransmission). */
export type BroadcastableTab = Exclude<LivePrimaryTab, "retransmission"> | "cover";

/** Contexte poules pour l'expansion des frames de projection. */
export interface BroadcastPoolContext {
  /**
   * Lettres des poules présentes (A, B, …), déduites des matchs (toujours
   * disponible, contrairement au layout de template chargé en asynchrone).
   * Les slides de poules sont les premières pages du tableau principal
   * (Partie 1-4), le bracket suit ; on en déduit le découpage sans layout.
   */
  poolLetters: string[];
}

export type RetransmissionMode =
  | "fixed"
  | "rotation"
  | "mirror"
  | "multi";

export interface RetransmissionModeOption {
  id: RetransmissionMode;
  title: string;
  subtitle: string;
}

export const RETRANSMISSION_MODES: RetransmissionModeOption[] = [
  {
    id: "fixed",
    title: "Onglet fixe",
    subtitle: "Affiche en permanence un seul onglet sur l'écran choisi.",
  },
  {
    id: "rotation",
    title: "Défilement automatique",
    subtitle: "Fait défiler les onglets cochés à intervalle régulier.",
  },
  {
    id: "mirror",
    title: "Miroir plein écran",
    subtitle: "Duplique la vue projection en plein écran sur l'écran externe.",
  },
  {
    id: "multi",
    title: "Multi-écrans",
    subtitle: "Répartit un onglet différent sur chaque écran sélectionné.",
  },
];

export function broadcastTabLabel(
  tab: BroadcastableTab,
  classementPageCount = 0
): string {
  if (tab === "cover") return "Page de garde";
  return primaryTabLabel(tab, classementPageCount);
}

export function broadcastableTabs(
  classementPageCount = 0,
  isPoolFormat = false
): { id: BroadcastableTab; label: string }[] {
  const cover: { id: BroadcastableTab; label: string } = {
    id: "cover",
    label: broadcastTabLabel("cover"),
  };
  const tabs = LIVE_PRIMARY_TABS.filter(
    (tab): tab is { id: Exclude<BroadcastableTab, "cover">; label: string } =>
      tab.id !== "retransmission" && (tab.id !== "poules" || isPoolFormat)
  ).map((tab) => ({
    id: tab.id,
    label: primaryTabLabel(tab.id, classementPageCount),
  }));
  return [cover, ...tabs];
}

export const DEFAULT_BROADCAST_TABS: BroadcastableTab[] = [
  "live",
  "upcoming",
  "main",
];

export const DEFAULT_ROTATION_SECONDS = 10;

/** Une étape du défilement (onglet + sous-onglet éventuel). */
export interface BroadcastFrame {
  tab: BroadcastableTab;
  subPage?: number;
}

const SINGLE_FRAME_TABS = new Set<BroadcastableTab>([
  "cover",
  "live",
  "upcoming",
  "avancement",
  "final",
]);

export function expandBroadcastTab(
  tab: BroadcastableTab,
  pageMap: LivePageMap,
  ctx?: BroadcastPoolContext
): BroadcastFrame[] {
  if (tab === "poules") {
    const count = ctx?.poolLetters.length ?? 0;
    if (count === 0) return [];
    // Composition (subPage 0) + une page par poule.
    return Array.from({ length: count + 1 }, (_, subPage) => ({ tab, subPage }));
  }

  if (SINGLE_FRAME_TABS.has(tab)) {
    return [{ tab }];
  }

  const section =
    tab === "main" || tab === "classement" || tab === "planning" ? tab : null;
  if (!section) return [{ tab }];

  let pages = pageEntries(pageMap, section);
  const poolCount = ctx?.poolLetters.length ?? 0;
  if (section === "main" && poolCount > 0) {
    // Les slides de poules (les poolCount premières) sont projetées via
    // l'onglet Poules ; on ne garde que le bracket.
    pages = pages.slice(poolCount);
  }
  if (pages.length === 0) return [{ tab }];
  return pages.map((_, subPage) => ({ tab, subPage }));
}

export function expandBroadcastSchedule(
  tabs: BroadcastableTab[],
  pageMap: LivePageMap,
  ctx?: BroadcastPoolContext
): BroadcastFrame[] {
  let effectiveTabs = tabs;
  // Format à poules : si « Tableau principal » est retransmis mais pas encore
  // « Poules », on insère Poules juste avant (les anciennes pages blanches
  // « Partie 1-4 » deviennent les pages de poules avec leur contenu).
  if (
    ctx &&
    ctx.poolLetters.length > 0 &&
    tabs.includes("main") &&
    !tabs.includes("poules")
  ) {
    effectiveTabs = tabs.flatMap((tab) =>
      tab === "main" ? (["poules", "main"] as BroadcastableTab[]) : [tab]
    );
  }
  return effectiveTabs.flatMap((tab) => expandBroadcastTab(tab, pageMap, ctx));
}

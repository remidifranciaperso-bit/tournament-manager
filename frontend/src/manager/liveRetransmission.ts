import type { LivePrimaryTab } from "./liveTabs";
import { LIVE_PRIMARY_TABS, pageEntries, primaryTabLabel } from "./liveTabs";
import type { LivePageMap } from "./liveTypes";

/** Onglets du manager pouvant être retransmis (hors Retransmission / Poules). */
export type BroadcastableTab =
  | Exclude<LivePrimaryTab, "retransmission" | "poules">
  | "cover";

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
  classementPageCount = 0
): { id: BroadcastableTab; label: string }[] {
  const cover: { id: BroadcastableTab; label: string } = {
    id: "cover",
    label: broadcastTabLabel("cover"),
  };
  const tabs = LIVE_PRIMARY_TABS.filter(
    (tab): tab is { id: Exclude<BroadcastableTab, "cover">; label: string } =>
      tab.id !== "retransmission" && tab.id !== "poules"
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
  pageMap: LivePageMap
): BroadcastFrame[] {
  if (SINGLE_FRAME_TABS.has(tab)) {
    return [{ tab }];
  }

  const section =
    tab === "main" || tab === "classement" || tab === "planning" ? tab : null;
  if (!section) return [{ tab }];

  const pages = pageEntries(pageMap, section);
  if (pages.length === 0) return [{ tab }];
  return pages.map((_, subPage) => ({ tab, subPage }));
}

export function expandBroadcastSchedule(
  tabs: BroadcastableTab[],
  pageMap: LivePageMap
): BroadcastFrame[] {
  return tabs.flatMap((tab) => expandBroadcastTab(tab, pageMap));
}

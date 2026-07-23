/** Largeur fixe du bac hors-écran pour les captures PDF. */
export const EXPORT_CAPTURE_WIDTH = 1100;
/** Planning export : bac capture pleine largeur (composite PDF). */
export const PLANNING_EXPORT_CAPTURE_WIDTH = 1400;
/** Marge latérale planning — 5 mm @ 96 dpi, aligné ``TABLE_SIDE_MARGIN_MM`` (PDF Live). */
export const PLANNING_SIDE_MARGIN_PX = Math.round((5 * 96) / 25.4);
/** Largeur utile planning Live V2 — calée sur bac capture (réf. planning J3, 24 eq. poules). */
export const PLANNING_TABLE_LAYOUT_WIDTH =
  PLANNING_EXPORT_CAPTURE_WIDTH - 2 * PLANNING_SIDE_MARGIN_PX;
/** Live V1 — largeur de référence historique. */
export const PLANNING_LEGACY_LAYOUT_WIDTH = 1024;
/** Marqueur bundle Live V2 (``/api/v2/frontend-check``). */
export const PLANNING_V2_LAYOUT_MARKER = "live-planning-uniform-width-v2-20260723";
/** Classement final — ratio live 820/1024 (convocations calées dessus). */
export const NARROW_TABLE_RATIO = 820 / 1024;
export const FINAL_TABLE_WIDTH_PT = 820;
export const FINAL_EXPORT_CAPTURE_WIDTH = FINAL_TABLE_WIDTH_PT;

export type ExportPhase = "idle" | "capture" | "upload" | "download";

/** Vue de poule capturée pour l'export (composition ou une poule donnée). */
export type ExportPoolView = "composition" | { letter: string };

export interface ExportCaptureTarget {
  section: "main" | "classement" | "planning" | "final" | "pools";
  subPage: number;
  /** Vue à rendre pour ``section === "pools"`` (composition ou poule X). */
  poolView?: ExportPoolView;
}

/** Largeur fixe du bac hors-écran pour les captures PDF. */
export const EXPORT_CAPTURE_WIDTH = 1100;
/** Planning export : tableau pleine largeur (moins 5 mm au composite). */
export const PLANNING_EXPORT_CAPTURE_WIDTH = 1400;
/** Classement final — largeur de référence Live (820 pt). Convocations calées dessus. */
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

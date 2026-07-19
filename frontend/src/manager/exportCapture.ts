/** Largeur fixe du bac hors-écran pour les captures PDF. */
export const EXPORT_CAPTURE_WIDTH = 1100;
/** Planning export : tableau plus large pour une ligne par match. */
export const PLANNING_EXPORT_CAPTURE_WIDTH = 1400;
/** Largeur relative classement final / convocations (calée sur composite PDF 72 %). */
export const NARROW_TABLE_WIDTH_RATIO = 0.72;

export type ExportPhase = "idle" | "capture" | "upload" | "download";

/** Vue de poule capturée pour l'export (composition ou une poule donnée). */
export type ExportPoolView = "composition" | { letter: string };

export interface ExportCaptureTarget {
  section: "main" | "classement" | "planning" | "final" | "pools";
  subPage: number;
  /** Vue à rendre pour ``section === "pools"`` (composition ou poule X). */
  poolView?: ExportPoolView;
}

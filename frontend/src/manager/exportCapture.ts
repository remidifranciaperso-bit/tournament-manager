/** Largeur fixe du bac hors-écran pour les captures PDF. */
export const EXPORT_CAPTURE_WIDTH = 1100;
/** Planning export : tableau plus large pour une ligne par match. */
export const PLANNING_EXPORT_CAPTURE_WIDTH = 1400;

export type ExportPhase = "idle" | "capture" | "upload" | "download";

export interface ExportCaptureTarget {
  section: "main" | "classement" | "planning" | "final";
  subPage: number;
}

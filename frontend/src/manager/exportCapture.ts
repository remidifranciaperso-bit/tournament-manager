/** Largeur fixe du bac hors-écran pour les captures PDF. */
export const EXPORT_CAPTURE_WIDTH = 1100;

export type ExportPhase = "idle" | "capture" | "upload";

export interface ExportCaptureTarget {
  section: "main" | "classement" | "planning" | "final";
  subPage: number;
}

/** Largeur fixe du bac hors-écran pour les captures PDF. */
export const EXPORT_CAPTURE_WIDTH = 1100;
/** Marge latérale planning — 5 mm @ 96 dpi, aligné ``TABLE_SIDE_MARGIN_MM`` (PDF Live). */
export const PLANNING_SIDE_MARGIN_PX = Math.round((5 * 96) / 25.4);
/** Fractions colonnes planning à la largeur d’origine (Code, Heure, Terrain, Éq1, Éq2, Fait). */
export const PLANNING_COL_BASE_FRACS = [0.08, 0.08, 0.14, 0.32, 0.32, 0.06] as const;
/** Nombre de caractères visibles sans rognage (noms de terrains). */
export const PLANNING_TERRAIN_COL_MIN_CHARS = 16;
/** Calibré Noto bold ~16 px, majuscules + padding horizontal cellule. */
const PLANNING_TERRAIN_CHAR_PX = 14;
const PLANNING_TERRAIN_CELL_PAD_PX = 32;
const PLANNING_TERRAIN_COL_SAFETY_PX = 32;
export const PLANNING_TERRAIN_COL_MIN_PX =
  PLANNING_TERRAIN_COL_MIN_CHARS * PLANNING_TERRAIN_CHAR_PX +
  PLANNING_TERRAIN_CELL_PAD_PX +
  PLANNING_TERRAIN_COL_SAFETY_PX;
const PLANNING_TABLE_BASE_WIDTH_PX = 1400 - 2 * PLANNING_SIDE_MARGIN_PX;
/** Élargissement colonne Terrain — les autres colonnes gardent la même largeur px. */
export const PLANNING_COL_TERRAIN_BOOST = Math.max(
  1,
  PLANNING_TERRAIN_COL_MIN_PX /
    (PLANNING_TABLE_BASE_WIDTH_PX * PLANNING_COL_BASE_FRACS[2])
);
export const PLANNING_TABLE_WIDTH_TERRAIN_FACTOR =
  1 + PLANNING_COL_BASE_FRACS[2] * (PLANNING_COL_TERRAIN_BOOST - 1);
/** Pleine largeur utile tableau planning (live + capture). */
export const PLANNING_TABLE_LAYOUT_MAX_WIDTH = Math.round(
  PLANNING_TABLE_BASE_WIDTH_PX * PLANNING_TABLE_WIDTH_TERRAIN_FACTOR
);
/** Projection Live V2 — pleine largeur utile (marges 5 mm), zoom uniforme sans étirement. */
export const PLANNING_TABLE_LAYOUT_WIDTH = PLANNING_TABLE_LAYOUT_MAX_WIDTH;
/** Planning export : bac capture pleine largeur (composite PDF). */
export const PLANNING_EXPORT_CAPTURE_WIDTH =
  PLANNING_TABLE_LAYOUT_MAX_WIDTH + 2 * PLANNING_SIDE_MARGIN_PX;
/** Marge haut / bas projection Live V2 — 4 mm @ 96 dpi. */
export const PLANNING_VERTICAL_MARGIN_PX = Math.round((4 * 96) / 25.4);
/** Réserve verticale dans le calcul d’échelle (bordure carte, arrondi, arrondi px). */
export const PLANNING_VERTICAL_FIT_INSET_PX = 22;
/** Bordure / arrondi carte — marge de mesure pour l’échelle verticale. */
export const PLANNING_CARD_SHELL_EXTRA_PX = 8;
/** Tampon supplémentaire dans le dénominateur d’échelle (slide le plus chargé). */
export const PLANNING_SCALE_HEIGHT_BUFFER_PX = 12;
/** Live V1 — largeur de référence historique. */
export const PLANNING_LEGACY_LAYOUT_WIDTH = 1024;

/** Pourcentages ``colgroup`` — autres colonnes inchangées en px, table plus large. */
export function planningColWidthPercents(): string[] {
  const boost = PLANNING_TABLE_WIDTH_TERRAIN_FACTOR;
  return PLANNING_COL_BASE_FRACS.map((frac, index) => {
    const widthFrac =
      index === 2 ? frac * PLANNING_COL_TERRAIN_BOOST : frac;
    return `${((widthFrac / boost) * 100).toFixed(3)}%`;
  });
}
/** Hauteur estimée (px) — en-tête + lignes, calée sur le rendu live. */
export function estimatePlanningTableHeight(rowCount: number): number {
  const headerPx = 56;
  const rowPx = 42;
  const cardChromePx = 16;
  return headerPx + Math.max(rowCount, 1) * rowPx + cardChromePx;
}
/** Marqueur bundle Live V2 (``/api/v2/frontend-check``). */
export const PLANNING_V2_LAYOUT_MARKER = "live-planning-all-pages-v2-20260724c";
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

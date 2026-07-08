/** Métriques visuelles des templates bleus (source : TEMPLATES_24_BLEUS_SPEC.md). */
export const SLIDE_H_EMU = 6858000;
export const SLIDE_W_EMU = 9906000;

/** Tailles de police en points (fidèles au template). */
export const TEMPLATE_PT = {
  matchCode: 11,
  team: 8,
  vs: 9,
  score: 9,
  feedLabel: 8,
} as const;

/** Boîte match — hauteur augmentée pour noms + zone score (largeur inchangée). */
export const STANDARD_MATCH_BOX = {
  widthPct: 27.62,
  heightPct: 23.5,
} as const;

const SLIDE_H_IN = SLIDE_H_EMU / 914400;

/** Convertit une taille pt template en px à l'échelle du slide rendu. */
export function ptOnSlide(pt: number, slidePixelHeight: number): number {
  return Math.max(6, Math.round((pt / 72) * (slidePixelHeight / SLIDE_H_IN)));
}

export function projectionContentSize() {
  return { width: 100, height: 100 };
}

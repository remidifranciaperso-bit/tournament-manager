import type { LiveLayoutField } from "./liveTypes";
import { STANDARD_MATCH_BOX } from "./bracketTemplateMetrics";
import type { ParsedMatchSlot } from "./bracketSlideLayout";

export interface BoxRectPct {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PointPct {
  x: number;
  y: number;
}

export function matchBoxPosition(slot: ParsedMatchSlot) {
  const anchor = slot.codeField ?? slot.terrainField ?? slot.bounds;
  return {
    left: anchor.left,
    top: anchor.top,
  };
}

export function matchBoxRect(slot: ParsedMatchSlot): BoxRectPct {
  const pos = matchBoxPosition(slot);
  return {
    left: pos.left,
    top: pos.top,
    width: STANDARD_MATCH_BOX.widthPct,
    height: STANDARD_MATCH_BOX.heightPct,
  };
}

/** Sortie à droite du match parent (milieu vertical). */
export function parentOutlet(rect: BoxRectPct): PointPct {
  return {
    x: rect.left + rect.width,
    y: rect.top + rect.height * 0.5,
  };
}

/** Entrée à gauche du match enfant (équipe 1 ou 2). */
export function childInlet(rect: BoxRectPct, team: 1 | 2): PointPct {
  const yFrac = team === 1 ? 0.38 : 0.72;
  return {
    x: rect.left,
    y: rect.top + rect.height * yFrac,
  };
}

/** Point milieu d'un feed label (connecteur vers match sans parent sur la slide). */
export function feedAnchor(field: LiveLayoutField, side: "left" | "right"): PointPct {
  return {
    x: side === "left" ? field.left : field.left + field.width,
    y: field.top + field.height * 0.5,
  };
}

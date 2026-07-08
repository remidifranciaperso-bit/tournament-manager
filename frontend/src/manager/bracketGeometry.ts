import type { LiveLayoutField } from "./liveTypes";
import {
  projectionContentSize,
  STANDARD_MATCH_BOX,
} from "./bracketTemplateMetrics";
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

export function mapLayoutToProjection(left: number, top: number): PointPct {
  const size = projectionContentSize();
  return {
    x: (left / 100) * size.width,
    y: (top / 100) * size.height,
  };
}

export function mapSizeToProjection(widthPct: number, heightPct: number) {
  const size = projectionContentSize();
  return {
    width: (widthPct / 100) * size.width,
    height: (heightPct / 100) * size.height,
  };
}

export function mapFieldToProjection(field: LiveLayoutField): LiveLayoutField {
  const pos = mapLayoutToProjection(field.left, field.top);
  const dim = mapSizeToProjection(field.width, field.height);
  return {
    ...field,
    left: pos.x,
    top: pos.y,
    width: dim.width,
    height: dim.height,
  };
}

export function matchBoxPosition(slot: ParsedMatchSlot): PointPct {
  const anchor = slot.codeField ?? slot.terrainField ?? slot.bounds;
  return mapLayoutToProjection(anchor.left, anchor.top);
}

export function matchBoxRect(slot: ParsedMatchSlot): BoxRectPct {
  const pos = matchBoxPosition(slot);
  const dim = mapSizeToProjection(
    STANDARD_MATCH_BOX.widthPct,
    STANDARD_MATCH_BOX.heightPct
  );
  return {
    left: pos.x,
    top: pos.y,
    width: dim.width,
    height: dim.height,
  };
}

/** Sortie à droite du match parent (milieu vertical). */
export function parentOutlet(rect: BoxRectPct): PointPct {
  return {
    x: rect.left + rect.width,
    y: rect.top + rect.height * 0.48,
  };
}

/** Entrée à gauche du match enfant (équipe 1 ou 2). */
export function childInlet(rect: BoxRectPct, team: 1 | 2): PointPct {
  const yFrac = team === 1 ? 0.36 : 0.62;
  return {
    x: rect.left,
    y: rect.top + rect.height * yFrac,
  };
}

/** Point milieu d'un feed label. */
export function feedAnchor(
  field: LiveLayoutField,
  side: "left" | "right"
): PointPct {
  const mapped = mapFieldToProjection(field);
  return {
    x: side === "left" ? mapped.left : mapped.left + mapped.width,
    y: mapped.top + mapped.height * 0.5,
  };
}

import type { LiveLayoutField } from "./liveTypes";

export interface PlanningCheckboxOverlay {
  left: number;
  top: number;
  width: number;
  height: number;
  checked: boolean;
  onToggle: () => void;
}

export function buildPlanningCheckOverlays(
  layoutFields: LiveLayoutField[],
  fields: Record<string, string>,
  completed: Set<string>,
  onToggle: (code: string) => void
): PlanningCheckboxOverlay[] {
  const overlays: PlanningCheckboxOverlay[] = [];

  for (const field of layoutFields) {
    if (!field.key.endsWith("_DONE")) continue;

    const codeKey = field.key.replace("_DONE", "_CODE");
    const code = fields[codeKey]?.trim();
    if (!code) continue;

    overlays.push({
      left: field.left,
      top: field.top,
      width: field.width,
      height: field.height,
      checked: completed.has(code),
      onToggle: () => onToggle(code),
    });
  }

  return overlays;
}

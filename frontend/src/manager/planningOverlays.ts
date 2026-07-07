import type { LiveLayoutField, LiveMatch } from "./liveTypes";

export interface PlanningCheckboxOverlay {
  code: string;
  left: number;
  top: number;
  width: number;
  height: number;
  checked: boolean;
  onToggle: () => void;
}

function matchCodeForDoneField(
  fieldKey: string,
  fields: Record<string, string>,
  matches: LiveMatch[]
): string {
  const codeKey = fieldKey.replace("_DONE", "_CODE");
  const fromFields = fields[codeKey]?.trim();
  if (fromFields) return fromFields;

  const plMatch = fieldKey.match(/^(?:J\d+_)?PL(\d+)_DONE$/);
  if (!plMatch) return "";

  const index = Number(plMatch[1]) - 1;
  const sorted = [...matches].sort(
    (a, b) => a.ordre_planning - b.ordre_planning || a.ordre - b.ordre
  );
  return sorted[index]?.code?.trim() ?? "";
}

export function buildPlanningCheckOverlays(
  layoutFields: LiveLayoutField[],
  fields: Record<string, string>,
  matches: LiveMatch[],
  completed: Set<string>,
  onToggle: (code: string) => void
): PlanningCheckboxOverlay[] {
  const overlays: PlanningCheckboxOverlay[] = [];

  for (const field of layoutFields) {
    if (!field.key.endsWith("_DONE")) continue;

    const code =
      field.match_code?.trim() ||
      matchCodeForDoneField(field.key, fields, matches);
    if (!code) continue;

    overlays.push({
      code,
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

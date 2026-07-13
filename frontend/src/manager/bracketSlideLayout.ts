import type { LiveLayout, LiveLayoutField } from "./liveTypes";

export const SLIDE_ASPECT = 9906000 / 6858000;

const META_KEYS = new Set([
  "TYPE",
  "DATE",
  "HEURE",
  "LOGO",
  "CLUB",
  "PARTICIPANTS",
  "NB_EQUIPES",
  "NB_TERRAINS",
  "CONV_NOMS",
  "CONV_HORAIRE",
]);

const MATCH_PART_RE =
  /^(?<code>[A-Z][A-Z0-9_]*?)_(?<part>CODE|HEURE|TERRAIN|EQ1|EQ2)$/;
const FEED_RE = /^(WIN|LOSE|SECOND|THIRD)_(.+)$/;

export interface LayoutRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ParsedMatchSlot {
  code: string;
  bounds: LayoutRect;
  codeField?: LiveLayoutField;
  heureField?: LiveLayoutField;
  terrainField?: LiveLayoutField;
  eq1Field?: LiveLayoutField;
  eq2Field?: LiveLayoutField;
  hasTeams: boolean;
}

export interface ParsedBracketSlide {
  typeField?: LiveLayoutField;
  dateField?: LiveLayoutField;
  matches: ParsedMatchSlot[];
  feeds: LiveLayoutField[];
}

function isRenderableMatchCode(code: string): boolean {
  if (META_KEYS.has(code)) return false;
  if (code.startsWith("PL")) return false;
  if (code.startsWith("PTS")) return false;
  if (code.startsWith("POULE")) return false;
  if (code.startsWith("EXEMPT")) return false;
  if (code.startsWith("PA_") || code.startsWith("PB_") || code.startsWith("PC_") || code.startsWith("PD_")) {
    return false;
  }
  return true;
}

function unionRect(fields: LiveLayoutField[]): LayoutRect {
  const left = Math.min(...fields.map((f) => f.left));
  const top = Math.min(...fields.map((f) => f.top));
  const right = Math.max(...fields.map((f) => f.left + f.width));
  const bottom = Math.max(...fields.map((f) => f.top + f.height));
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export function parseBracketSlide(
  fields: LiveLayoutField[]
): ParsedBracketSlide {
  const typeField = fields.find((f) => f.key === "TYPE");
  const dateField = fields.find((f) => f.key === "DATE");

  const matchParts = new Map<string, Partial<Record<string, LiveLayoutField>>>();
  const feeds: LiveLayoutField[] = [];

  for (const field of fields) {
    const feedMatch = field.key.match(FEED_RE);
    if (feedMatch) {
      feeds.push(field);
      continue;
    }

    const partMatch = field.key.match(MATCH_PART_RE);
    if (!partMatch?.groups) continue;

    const code = partMatch.groups.code;
    const part = partMatch.groups.part;
    if (!isRenderableMatchCode(code)) continue;

    const bucket = matchParts.get(code) ?? {};
    bucket[part] = field;
    matchParts.set(code, bucket);
  }

  const matches: ParsedMatchSlot[] = [];

  for (const [code, parts] of matchParts) {
    const partFields = Object.values(parts).filter(Boolean) as LiveLayoutField[];
    if (partFields.length === 0) continue;

    const eq1Field = parts.EQ1;
    const eq2Field = parts.EQ2;

    matches.push({
      code,
      bounds: unionRect(partFields),
      codeField: parts.CODE,
      heureField: parts.HEURE,
      terrainField: parts.TERRAIN,
      eq1Field,
      eq2Field,
      hasTeams: Boolean(eq1Field || eq2Field),
    });
  }

  matches.sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left);

  return { typeField, dateField, matches, feeds };
}

const layoutCache = new Map<string, LiveLayout>();

export function getCachedTemplateLayout(templateId: string): LiveLayout | null {
  return layoutCache.get(templateId) ?? null;
}

export async function fetchTemplateLayout(templateId: string): Promise<LiveLayout> {
  const cached = layoutCache.get(templateId);
  if (cached) return cached;

  const res = await fetch(`/live-templates/${templateId}/layout.json`);
  if (!res.ok) {
    throw new Error(`Layout introuvable pour ${templateId}`);
  }

  const layout = (await res.json()) as LiveLayout;
  layoutCache.set(templateId, layout);
  return layout;
}

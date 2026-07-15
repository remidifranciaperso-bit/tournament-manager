import type { LiveLayoutField, LiveMatch } from "./liveTypes";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import { formatTeamWithInitials } from "./formatBracketLabel";
import type { StoredMatchResult } from "./useLiveProgress";
import { formatMatchDurationMinutes } from "./useLiveProgress";

export interface PlanningRow {
  code: string;
  heure: string;
  terrain: string;
  equipe1: string;
  equipe2: string;
  done: boolean;
  duration: string;
}

interface PlanningSlot {
  /** Jour (préfixe J{n}) pour les plannings multi-jours, sinon null. */
  day: number | null;
  /** Numéro PL{n} (recommence à 1 à chaque jour dans les templates multi-jours). */
  index: number;
}

function planningSlots(layoutFields: LiveLayoutField[]): PlanningSlot[] {
  const slots: PlanningSlot[] = [];
  const seen = new Set<string>();

  for (const field of layoutFields) {
    const match = field.key.match(/^(?:J(\d+)_)?PL(\d+)_CODE$/);
    if (!match) continue;
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    slots.push({
      day: match[1] !== undefined ? Number.parseInt(match[1], 10) : null,
      index: Number.parseInt(match[2], 10),
    });
  }

  slots.sort((a, b) => (a.day ?? 0) - (b.day ?? 0) || a.index - b.index);
  return slots;
}

function sortedPlanningMatches(matches: LiveMatch[]): LiveMatch[] {
  return [...matches].sort(
    (a, b) => a.ordre_planning - b.ordre_planning || a.ordre - b.ordre
  );
}

function resolvePlanningTeam(
  label: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>
): string {
  const resolved = resolveTeamLabelDeep(label, matchesByCode, matchResults).trim();
  return resolved ? formatTeamWithInitials(resolved) : "—";
}

export function buildPlanningRows(
  layoutFields: LiveLayoutField[],
  matches: LiveMatch[],
  completed: Set<string>,
  matchResults: Record<string, StoredMatchResult>
): PlanningRow[] {
  const matchesByCode = buildMatchesByCode(matches);
  const ordered = sortedPlanningMatches(matches);

  // Plannings multi-jours : les balises J{jour}_PL{n} recommencent à 1 chaque
  // jour. On regroupe les matchs par jour (ordre_planning continu → jours
  // contigus), à l'identique du découpage du moteur Engine (J{jour}_PL{n} =
  // n-ième match du jour). Les plannings 1 jour (PL{n} sans préfixe) gardent
  // l'indexation globale, inchangée.
  const byDay = new Map<number, LiveMatch[]>();
  for (const match of ordered) {
    const bucket = byDay.get(match.jour);
    if (bucket) bucket.push(match);
    else byDay.set(match.jour, [match]);
  }

  return planningSlots(layoutFields)
    .map((slot) => {
      const source = slot.day != null ? byDay.get(slot.day) ?? [] : ordered;
      const match = source[slot.index - 1];
      if (!match) return null;

      return {
        code: match.code,
        heure: match.heure ?? "",
        terrain: match.terrain ?? "",
        equipe1: resolvePlanningTeam(
          match.equipe1,
          matchesByCode,
          matchResults
        ),
        equipe2: resolvePlanningTeam(
          match.equipe2,
          matchesByCode,
          matchResults
        ),
        done: completed.has(match.code),
        duration: formatMatchDurationMinutes(
          matchResults[match.code]?.launchedAt,
          matchResults[match.code]?.validatedAt
        ),
      };
    })
    .filter((row): row is PlanningRow => row !== null);
}

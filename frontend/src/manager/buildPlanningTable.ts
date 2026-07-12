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

function planningIndices(layoutFields: LiveLayoutField[]): number[] {
  const numbers = new Set<number>();

  for (const field of layoutFields) {
    const match = field.key.match(/^(?:J\d+_)?PL(\d+)_CODE$/);
    if (match) numbers.add(Number.parseInt(match[1], 10));
  }

  return [...numbers].sort((a, b) => a - b);
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

  return planningIndices(layoutFields)
    .map((plIndex) => {
      const match = ordered[plIndex - 1];
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

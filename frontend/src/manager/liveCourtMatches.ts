import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import {
  feedKeyFromTeamLabel,
  formatCourtTeamSlot,
  isBracketPlaceholder,
} from "./formatBracketLabel";

export interface CourtMatchDisplay {
  code: string;
  tour: string;
  equipe1: string;
  equipe2: string;
  heure: string | null;
  equipe1Footnote?: string | null;
  equipe2Footnote?: string | null;
  equipe1IsPlaceholder?: boolean;
  equipe2IsPlaceholder?: boolean;
}

export function sortMatchesForTerrain(
  matches: LiveMatch[],
  terrain: string
): LiveMatch[] {
  return matches
    .filter((match) => match.terrain === terrain)
    .sort(
      (a, b) => a.ordre_planning - b.ordre_planning || a.ordre - b.ordre
    );
}

function parentCodeFromLabel(label: string): string | null {
  const key = feedKeyFromTeamLabel(label.trim());
  if (!key) return null;
  return key.replace(/^(WIN|LOSE|SECOND|THIRD)_/, "");
}

export function inProgressTerrainByMatchCode(
  matches: LiveMatch[],
  terrains: string[],
  completed: Set<string>,
  awaitingLaunch: Set<string>
): Map<string, string> {
  const result = new Map<string, string>();

  for (const terrain of terrains) {
    if (awaitingLaunch.has(terrain)) continue;

    const queue = sortMatchesForTerrain(matches, terrain).filter(
      (match) => !completed.has(match.code)
    );
    const current = queue[0];
    if (current) {
      result.set(current.code, terrain);
    }
  }

  return result;
}

function toDisplay(
  match: LiveMatch,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>,
  inProgressByCode: Map<string, string>
): CourtMatchDisplay {
  const rawEquipe1 = match.equipe1?.trim() || "—";
  const rawEquipe2 = match.equipe2?.trim() || "—";

  const resolved1 = resolveTeamLabelDeep(
    rawEquipe1,
    matchesByCode,
    matchResults
  );
  const resolved2 = resolveTeamLabelDeep(
    rawEquipe2,
    matchesByCode,
    matchResults
  );

  const isPlaceholder1 = isBracketPlaceholder(resolved1);
  const isPlaceholder2 = isBracketPlaceholder(resolved2);
  const parentCode1 = parentCodeFromLabel(rawEquipe1);
  const parentCode2 = parentCodeFromLabel(rawEquipe2);

  const inProgressTerrain1 =
    isPlaceholder1 && parentCode1
      ? inProgressByCode.get(parentCode1) ?? null
      : null;
  const inProgressTerrain2 =
    isPlaceholder2 && parentCode2
      ? inProgressByCode.get(parentCode2) ?? null
      : null;

  return {
    code: match.code,
    tour: match.tour,
    equipe1: formatCourtTeamSlot(resolved1),
    equipe2: formatCourtTeamSlot(resolved2),
    heure: match.heure?.trim() || null,
    equipe1IsPlaceholder: isPlaceholder1,
    equipe2IsPlaceholder: isPlaceholder2,
    equipe1Footnote: inProgressTerrain1
      ? `Match en cours ${inProgressTerrain1}`
      : null,
    equipe2Footnote: inProgressTerrain2
      ? `Match en cours ${inProgressTerrain2}`
      : null,
  };
}

export interface TerrainMatchQueues {
  current: Map<string, CourtMatchDisplay | null>;
  upcoming: Map<string, CourtMatchDisplay | null>;
}

export function matchQueuesByTerrain(
  matches: LiveMatch[],
  terrains: string[],
  completed: Set<string>,
  matchResults: Record<string, StoredMatchResult> = {},
  awaitingLaunch: Set<string> = new Set()
): TerrainMatchQueues {
  const matchesByCode = buildMatchesByCode(matches);
  const inProgressByCode = inProgressTerrainByMatchCode(
    matches,
    terrains,
    completed,
    awaitingLaunch
  );
  const current = new Map<string, CourtMatchDisplay | null>();
  const upcoming = new Map<string, CourtMatchDisplay | null>();

  for (const terrain of terrains) {
    const queue = sortMatchesForTerrain(matches, terrain).filter(
      (match) => !completed.has(match.code)
    );

    current.set(
      terrain,
      queue[0]
        ? toDisplay(queue[0], matchesByCode, matchResults, inProgressByCode)
        : null
    );
    upcoming.set(
      terrain,
      queue[1]
        ? toDisplay(queue[1], matchesByCode, matchResults, inProgressByCode)
        : null
    );
  }

  return { current, upcoming };
}

/**
 * Prochains matchs affichés par terrain :
 * - terrain en attente de lancement → le match retenu (file[0])
 * - sinon → le match d'après celui en cours (file[1])
 */
export function upcomingDisplayByTerrain(
  queues: TerrainMatchQueues,
  terrains: string[],
  awaitingLaunch: Set<string>
): Map<string, CourtMatchDisplay | null> {
  const result = new Map<string, CourtMatchDisplay | null>();

  for (const terrain of terrains) {
    result.set(
      terrain,
      awaitingLaunch.has(terrain)
        ? queues.current.get(terrain) ?? null
        : queues.upcoming.get(terrain) ?? null
    );
  }

  return result;
}

/** @deprecated Utiliser matchQueuesByTerrain */
export function firstMatchByTerrain(
  matches: LiveMatch[],
  terrains: string[]
): Map<string, CourtMatchDisplay | null> {
  return matchQueuesByTerrain(matches, terrains, new Set()).current;
}

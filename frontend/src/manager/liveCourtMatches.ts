import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import { formatTeamSlot } from "./formatBracketLabel";

export interface CourtMatchDisplay {
  code: string;
  tour: string;
  equipe1: string;
  equipe2: string;
  heure: string | null;
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

function toDisplay(
  match: LiveMatch,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>
): CourtMatchDisplay {
  const equipe1 = match.equipe1?.trim() || "—";
  const equipe2 = match.equipe2?.trim() || "—";

  return {
    code: match.code,
    tour: match.tour,
    equipe1: formatTeamSlot(
      resolveTeamLabelDeep(equipe1, matchesByCode, matchResults)
    ),
    equipe2: formatTeamSlot(
      resolveTeamLabelDeep(equipe2, matchesByCode, matchResults)
    ),
    heure: match.heure?.trim() || null,
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
  matchResults: Record<string, StoredMatchResult> = {}
): TerrainMatchQueues {
  const matchesByCode = buildMatchesByCode(matches);
  const current = new Map<string, CourtMatchDisplay | null>();
  const upcoming = new Map<string, CourtMatchDisplay | null>();

  for (const terrain of terrains) {
    const queue = sortMatchesForTerrain(matches, terrain).filter(
      (match) => !completed.has(match.code)
    );

    current.set(
      terrain,
      queue[0] ? toDisplay(queue[0], matchesByCode, matchResults) : null
    );
    upcoming.set(
      terrain,
      queue[1] ? toDisplay(queue[1], matchesByCode, matchResults) : null
    );
  }

  return { current, upcoming };
}

/** @deprecated Utiliser matchQueuesByTerrain */
export function firstMatchByTerrain(
  matches: LiveMatch[],
  terrains: string[]
): Map<string, CourtMatchDisplay | null> {
  return matchQueuesByTerrain(matches, terrains, new Set()).current;
}

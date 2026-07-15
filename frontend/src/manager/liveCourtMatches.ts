import { areCourtTeamsKnown } from "./courtTeamsReady";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import { buildPoolQualifierMap } from "./buildPoolStandings";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import {
  feedKeyFromTeamLabel,
  formatCourtTeamSlot,
  formatTeamSlot,
  formatTeamWithInitials,
  isBracketPlaceholder,
} from "./formatBracketLabel";

export type CourtTeamSlotFormat = "bracket" | "upcoming";

export interface CourtMatchDisplay {
  code: string;
  tour: string;
  equipe1: string;
  equipe2: string;
  heure: string | null;
  equipe1Footnote?: string | null;
  equipe2Footnote?: string | null;
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

function formatTeamForCourt(
  resolved: string,
  slotFormat: CourtTeamSlotFormat
): string {
  return slotFormat === "bracket"
    ? formatTeamSlot(resolved)
    : formatCourtTeamSlot(resolved);
}

function toDisplay(
  match: LiveMatch,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>,
  inProgressByCode: Map<string, string>,
  slotFormat: CourtTeamSlotFormat,
  poolQualifiers?: Map<string, string>
): CourtMatchDisplay {
  const rawEquipe1 = match.equipe1?.trim() || "—";
  const rawEquipe2 = match.equipe2?.trim() || "—";

  const resolved1 = resolveTeamLabelDeep(
    rawEquipe1,
    matchesByCode,
    matchResults,
    poolQualifiers
  );
  const resolved2 = resolveTeamLabelDeep(
    rawEquipe2,
    matchesByCode,
    matchResults,
    poolQualifiers
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
    equipe1: formatTeamForCourt(resolved1, slotFormat),
    equipe2: formatTeamForCourt(resolved2, slotFormat),
    heure: match.heure?.trim() || null,
    equipe1Footnote: inProgressTerrain1
      ? `Match en cours sur\n${inProgressTerrain1}`
      : null,
    equipe2Footnote: inProgressTerrain2
      ? `Match en cours sur\n${inProgressTerrain2}`
      : null,
  };
}

export function inProgressMatchCodes(
  matches: LiveMatch[],
  terrains: string[],
  completed: Set<string>,
  awaitingLaunch: Set<string>
): Set<string> {
  const result = new Set<string>();

  for (const terrain of terrains) {
    if (awaitingLaunch.has(terrain)) continue;

    const queue = sortMatchesForTerrain(matches, terrain).filter(
      (match) => !completed.has(match.code)
    );
    const current = queue[0];
    if (current) result.add(current.code);
  }

  return result;
}

function codesForcedOnOtherTerrains(
  forcedUpcomingByTerrain: Map<string, string> | undefined,
  terrain: string
): Set<string> {
  const result = new Set<string>();
  if (!forcedUpcomingByTerrain) return result;

  for (const [name, code] of forcedUpcomingByTerrain) {
    if (name !== terrain) result.add(code);
  }

  return result;
}

function naturalUpcomingInQueue(
  queue: LiveMatch[],
  forcedElsewhere: Set<string>
): LiveMatch | null {
  for (let index = 1; index < queue.length; index += 1) {
    if (!forcedElsewhere.has(queue[index].code)) {
      return queue[index];
    }
  }

  return null;
}

function resolveForcedMatch(
  terrain: string,
  forcedUpcomingByTerrain: Map<string, string> | undefined,
  matches: LiveMatch[],
  completed: Set<string>,
  inProgressCodes: Set<string>
): LiveMatch | null {
  const forcedCode = forcedUpcomingByTerrain?.get(terrain);
  if (!forcedCode) return null;
  if (completed.has(forcedCode)) return null;
  if (inProgressCodes.has(forcedCode)) return null;

  const match = matches.find((entry) => entry.code === forcedCode);
  return match ?? null;
}

export interface ForceMatchOption {
  code: string;
  label: string;
  selectable: boolean;
}

export function buildForceMatchOptions(
  matches: LiveMatch[],
  completed: Set<string>,
  inProgressCodes: Set<string>,
  matchResults: Record<string, StoredMatchResult>,
  /** Jour actif : on n'autorise pas à forcer un match des jours suivants. */
  maxDay?: number
): ForceMatchOption[] {
  const matchesByCode = buildMatchesByCode(matches);
  const poolQualifiers = buildPoolQualifierMap(matches, matchResults);

  return [...matches]
    .filter(
      (match) =>
        !completed.has(match.code) &&
        !inProgressCodes.has(match.code) &&
        (maxDay == null || (match.jour ?? 1) <= maxDay)
    )
    .sort(
      (a, b) => a.ordre_planning - b.ordre_planning || a.ordre - b.ordre
    )
    .map((match) => {
      const resolved1 = resolveTeamLabelDeep(
        match.equipe1,
        matchesByCode,
        matchResults,
        poolQualifiers
      );
      const resolved2 = resolveTeamLabelDeep(
        match.equipe2,
        matchesByCode,
        matchResults,
        poolQualifiers
      );
      const equipe1 = formatTeamWithInitials(resolved1);
      const equipe2 = formatTeamWithInitials(resolved2);

      return {
        code: match.code,
        label: `${match.code} — ${match.tour} - ${equipe1} vs ${equipe2}`,
        selectable: areCourtTeamsKnown(equipe1, equipe2),
      };
    });
}

export function computeForcedUpcomingAfterForce(
  targetTerrain: string,
  matchCode: string,
  terrains: string[],
  matches: LiveMatch[],
  completed: Set<string>,
  awaitingLaunch: Set<string>,
  forcedUpcomingByTerrain: Record<string, string>,
  /** Jour actif : un match déplacé ne peut pas être remplacé par un match
   * d'un jour suivant (formats multi-jours). */
  maxDay?: number
): Record<string, string> {
  const forcedMap = new Map(Object.entries(forcedUpcomingByTerrain));
  const next: Record<string, string> = { ...forcedUpcomingByTerrain };
  const withinDay = (match: LiveMatch) =>
    maxDay == null || (match.jour ?? 1) <= maxDay;

  for (const [terrain, code] of Object.entries(next)) {
    if (code === matchCode) delete next[terrain];
  }

  const targetQueue = sortMatchesForTerrain(matches, targetTerrain).filter(
    (match) => !completed.has(match.code) && withinDay(match)
  );
  const displaced = naturalUpcomingInQueue(
    targetQueue,
    codesForcedOnOtherTerrains(forcedMap, targetTerrain)
  );
  const displacedCode = displaced?.code ?? null;

  let sourceTerrain: string | null = null;
  for (const terrain of terrains) {
    if (terrain === targetTerrain || awaitingLaunch.has(terrain)) continue;

    const queue = sortMatchesForTerrain(matches, terrain).filter(
      (match) => !completed.has(match.code) && withinDay(match)
    );
    const naturalUpcoming = naturalUpcomingInQueue(
      queue,
      codesForcedOnOtherTerrains(forcedMap, terrain)
    );
    if (naturalUpcoming?.code === matchCode) {
      sourceTerrain = terrain;
      break;
    }
  }

  next[targetTerrain] = matchCode;

  if (displacedCode && displacedCode !== matchCode && sourceTerrain) {
    for (const [terrain, code] of Object.entries(next)) {
      if (code === displacedCode) delete next[terrain];
    }
    next[sourceTerrain] = displacedCode;
  }

  return next;
}

export interface TerrainMatchQueues {
  current: Map<string, CourtMatchDisplay | null>;
  upcoming: Map<string, CourtMatchDisplay | null>;
  /** Prochain lancement sur le terrain (forçage possible, pas le match en cours). */
  nextLaunch: Map<string, CourtMatchDisplay | null>;
}

export function matchQueuesByTerrain(
  matches: LiveMatch[],
  terrains: string[],
  completed: Set<string>,
  matchResults: Record<string, StoredMatchResult> = {},
  awaitingLaunch: Set<string> = new Set(),
  slotFormat: CourtTeamSlotFormat = "bracket",
  forcedUpcomingByTerrain?: Map<string, string>,
  /** Jour actif : les matchs des jours suivants sont exclus des files terrains. */
  maxDay?: number
): TerrainMatchQueues {
  const matchesByCode = buildMatchesByCode(matches);
  // Résout « Vainqueur/2e Poule X » vers l'équipe réelle dès qu'une poule est
  // terminée, pour débloquer les matchs alimentés par les poules.
  const poolQualifiers = buildPoolQualifierMap(matches, matchResults);
  const inProgressByCode = inProgressTerrainByMatchCode(
    matches,
    terrains,
    completed,
    awaitingLaunch
  );
  const inProgressCodes = inProgressMatchCodes(
    matches,
    terrains,
    completed,
    awaitingLaunch
  );
  const current = new Map<string, CourtMatchDisplay | null>();
  const upcoming = new Map<string, CourtMatchDisplay | null>();
  const nextLaunch = new Map<string, CourtMatchDisplay | null>();

  for (const terrain of terrains) {
    const queue = sortMatchesForTerrain(matches, terrain).filter(
      (match) =>
        !completed.has(match.code) &&
        (maxDay == null || (match.jour ?? 1) <= maxDay)
    );
    const forcedMatch = resolveForcedMatch(
      terrain,
      forcedUpcomingByTerrain,
      matches,
      completed,
      inProgressCodes
    );

    current.set(
      terrain,
      queue[0]
        ? toDisplay(
            queue[0],
            matchesByCode,
            matchResults,
            inProgressByCode,
            slotFormat,
            poolQualifiers
          )
        : null
    );

    const forcedElsewhere = codesForcedOnOtherTerrains(
      forcedUpcomingByTerrain,
      terrain
    );

    const launchMatch = forcedMatch ?? queue[0] ?? null;
    nextLaunch.set(
      terrain,
      launchMatch
        ? toDisplay(
            launchMatch,
            matchesByCode,
            matchResults,
            inProgressByCode,
            slotFormat,
            poolQualifiers
          )
        : null
    );

    const upcomingMatch =
      forcedMatch ?? naturalUpcomingInQueue(queue, forcedElsewhere);
    upcoming.set(
      terrain,
      upcomingMatch
        ? toDisplay(
            upcomingMatch,
            matchesByCode,
            matchResults,
            inProgressByCode,
            slotFormat,
            poolQualifiers
          )
        : null
    );
  }

  return { current, upcoming, nextLaunch };
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
        ? queues.nextLaunch.get(terrain) ?? queues.current.get(terrain) ?? null
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

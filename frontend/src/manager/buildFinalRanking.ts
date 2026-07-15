import type { LiveMatch } from "./liveTypes";
import { parsePlacementTour } from "./matchPlacementLabel";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import {
  buildPoolQualifierMap,
  buildPoolStandings,
  poolLetterFromCode,
  poolLetters,
  poolMatches,
  type PoolStandingRow,
} from "./buildPoolStandings";
import type { StoredMatchResult } from "./useLiveProgress";

export interface FinalRankingRow {
  place: number;
  team: string;
  points: string;
}

function formatFinalTeamName(
  label: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>,
  poolQualifiers: Map<string, string>
): string {
  const resolved = resolveTeamLabelDeep(
    label,
    matchesByCode,
    matchResults,
    poolQualifiers
  ).trim();
  if (!resolved || /^(Vainqueur|Perdant)\s+/i.test(resolved)) {
    return "";
  }
  return resolved;
}

function teamFromResult(
  match: LiveMatch,
  side: 1 | 2,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>,
  poolQualifiers: Map<string, string>
): string {
  const raw = side === 1 ? match.equipe1 : match.equipe2;
  return formatFinalTeamName(raw, matchesByCode, matchResults, poolQualifiers);
}

/** Position de qualification d'un libellé de poule (1=vainqueur, 2=2e, 3=3e). */
function poolQualifierPosition(label: string): number | null {
  const text = (label ?? "").trim();
  if (/^Vainqueur\s+Poule\s+/i.test(text)) return 1;
  if (/^(Deuxi[eè]me|Second)\s+Poule\s+/i.test(text)) return 2;
  if (/^Troisi[eè]me\s+Poule\s+/i.test(text)) return 3;
  return null;
}

/**
 * Remplit les places basses du classement final avec les équipes de poule non
 * qualifiées pour le tableau principal, une fois toutes les poules terminées.
 * Classement inter-poules : victoires, puis jeux gagnés, puis jeux perdus.
 * Ne touche à rien tant que les poules ne sont pas toutes finies.
 */
function fillNonQualifiedPoolPlaces(
  matches: LiveMatch[],
  matchResults: Record<string, StoredMatchResult>,
  nbEquipes: number,
  teamsByPlace: Map<number, string>
): void {
  const letters = poolLetters(matches);
  if (letters.length === 0) return;

  const pools = letters.map((letter) => poolMatches(matches, letter));
  const allComplete = pools.every(
    (pool) => pool.length > 0 && pool.every((m) => matchResults[m.code])
  );
  if (!allComplete) return;

  // Positions qualificatives (référencées dans les matchs hors poule du bracket).
  const qualifiedPositions = new Set<number>();
  for (const match of matches) {
    if (poolLetterFromCode(match.code)) continue;
    for (const raw of [match.equipe1, match.equipe2]) {
      const pos = poolQualifierPosition(raw);
      if (pos) qualifiedPositions.add(pos);
    }
  }
  if (qualifiedPositions.size === 0) return;

  const nonQualified: PoolStandingRow[] = [];
  for (const pool of pools) {
    const standings = buildPoolStandings(pool, matchResults);
    standings.forEach((row, index) => {
      if (!qualifiedPositions.has(index + 1)) nonQualified.push(row);
    });
  }
  if (nonQualified.length === 0) return;

  nonQualified.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.gamesFor - a.gamesFor ||
      a.gamesAgainst - b.gamesAgainst
  );

  const startPlace = nbEquipes - nonQualified.length + 1;
  nonQualified.forEach((row, index) => {
    const place = startPlace + index;
    if (place >= 1 && place <= nbEquipes && !teamsByPlace.has(place)) {
      teamsByPlace.set(place, row.team);
    }
  });
}

export function buildFinalRanking(
  matches: LiveMatch[],
  matchResults: Record<string, StoredMatchResult>,
  fields: Record<string, string>,
  nbEquipes: number
): FinalRankingRow[] {
  const matchesByCode = buildMatchesByCode(matches);
  const poolQualifiers = buildPoolQualifierMap(matches, matchResults);
  const teamsByPlace = new Map<number, string>();

  for (const match of matches) {
    const placement = parsePlacementTour(match.tour);
    const result = matchResults[match.code];
    if (!placement || !result) continue;

    const winner = teamFromResult(
      match,
      result.winner,
      matchesByCode,
      matchResults,
      poolQualifiers
    );
    const loser = teamFromResult(
      match,
      result.loser,
      matchesByCode,
      matchResults,
      poolQualifiers
    );

    if (winner) teamsByPlace.set(placement.winnerPlace, winner);
    if (loser) teamsByPlace.set(placement.loserPlace, loser);
  }

  fillNonQualifiedPoolPlaces(matches, matchResults, nbEquipes, teamsByPlace);

  return Array.from({ length: nbEquipes }, (_, index) => {
    const place = index + 1;
    return {
      place,
      team: teamsByPlace.get(place) ?? "",
      points: fields[`PTS${place}`]?.trim() ?? "",
    };
  });
}

export function formatPlaceLabel(place: number): string {
  if (place === 1) return "1 🥇";
  if (place === 2) return "2 🥈";
  if (place === 3) return "3 🥉";
  return String(place);
}

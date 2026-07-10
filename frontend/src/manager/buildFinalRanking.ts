import type { LiveMatch } from "./liveTypes";
import { parsePlacementTour } from "./matchPlacementLabel";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import type { StoredMatchResult } from "./useLiveProgress";

export interface FinalRankingRow {
  place: number;
  team: string;
  points: string;
}

function formatFinalTeamName(
  label: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>
): string {
  const resolved = resolveTeamLabelDeep(label, matchesByCode, matchResults).trim();
  if (!resolved || /^(Vainqueur|Perdant)\s+/i.test(resolved)) {
    return "";
  }
  return resolved;
}

function teamFromResult(
  match: LiveMatch,
  side: 1 | 2,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>
): string {
  const raw = side === 1 ? match.equipe1 : match.equipe2;
  return formatFinalTeamName(raw, matchesByCode, matchResults);
}

export function buildFinalRanking(
  matches: LiveMatch[],
  matchResults: Record<string, StoredMatchResult>,
  fields: Record<string, string>,
  nbEquipes: number
): FinalRankingRow[] {
  const matchesByCode = buildMatchesByCode(matches);
  const teamsByPlace = new Map<number, string>();

  for (const match of matches) {
    const placement = parsePlacementTour(match.tour);
    const result = matchResults[match.code];
    if (!placement || !result) continue;

    const winner = teamFromResult(
      match,
      result.winner,
      matchesByCode,
      matchResults
    );
    const loser = teamFromResult(
      match,
      result.loser,
      matchesByCode,
      matchResults
    );

    if (winner) teamsByPlace.set(placement.winnerPlace, winner);
    if (loser) teamsByPlace.set(placement.loserPlace, loser);
  }

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

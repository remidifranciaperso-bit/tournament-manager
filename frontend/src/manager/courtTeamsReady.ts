import { isBracketPlaceholder } from "./formatBracketLabel";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

export const TEAMS_UNAVAILABLE_MESSAGE =
  "Les équipes ne sont pas encore disponibles";

/** Les deux binômes sont connus (pas de Vainqueur/Perdant/placeholder). */
export function areCourtTeamsKnown(equipe1: string, equipe2: string): boolean {
  const team1 = equipe1.trim();
  const team2 = equipe2.trim();
  if (!team1 || !team2 || team1 === "—" || team2 === "—") return false;
  if (isBracketPlaceholder(team1) || isBracketPlaceholder(team2)) return false;
  return true;
}

/** Au moins une équipe affichable (connue ou placeholder). */
export function hasAnyCourtTeam(equipe1: string, equipe2: string): boolean {
  const team1 = equipe1.trim();
  const team2 = equipe2.trim();
  return Boolean(
    (team1 && team1 !== "—") || (team2 && team2 !== "—")
  );
}

/** Vrai si les matchs parents sont validés et les deux équipes sont connues. */
export function canLaunchNextMatch(
  equipe1: string,
  equipe2: string,
  liveMatch: LiveMatch | undefined,
  completed: Set<string>,
  matchResults: Record<string, StoredMatchResult>
): boolean {
  if (!liveMatch) return false;

  for (const parentCode of liveMatch.parents) {
    if (
      parentCode &&
      (!completed.has(parentCode) || !matchResults[parentCode])
    ) {
      return false;
    }
  }

  return areCourtTeamsKnown(equipe1, equipe2);
}

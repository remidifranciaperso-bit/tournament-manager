import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

export function buildMatchesByCode(
  matches: LiveMatch[]
): Map<string, LiveMatch> {
  const map = new Map<string, LiveMatch>();
  for (const match of matches) {
    map.set(match.code, match);
  }
  return map;
}

/**
 * Remplace « Vainqueur H1 » / « Perdant Q2 » par les noms du binôme
 * une fois le match parent terminé et scoré.
 */
export function resolveTeamLabel(
  label: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>
): string {
  const text = label.trim();
  if (!text) return label;

  let role: "winner" | "loser" | null = null;
  let parentCode: string | null = null;

  const winMatch = text.match(/^Vainqueur\s+(.+)$/i);
  const loseMatch = text.match(/^Perdant\s+(.+)$/i);

  if (winMatch) {
    role = "winner";
    parentCode = winMatch[1].trim();
  } else if (loseMatch) {
    role = "loser";
    parentCode = loseMatch[1].trim();
  } else {
    return label;
  }

  if (!parentCode) return label;

  const parent = matchesByCode.get(parentCode);
  const result = matchResults[parentCode];
  if (!parent || !result) return label;

  const side = role === "winner" ? result.winner : result.loser;
  const resolved =
    side === 1 ? parent.equipe1?.trim() : parent.equipe2?.trim();
  return resolved || label;
}

export function resolveTeamLabelDeep(
  label: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>,
  depth = 0
): string {
  if (depth > 8) return label;
  const resolved = resolveTeamLabel(label, matchesByCode, matchResults);
  if (resolved === label) return label;
  return resolveTeamLabelDeep(resolved, matchesByCode, matchResults, depth + 1);
}

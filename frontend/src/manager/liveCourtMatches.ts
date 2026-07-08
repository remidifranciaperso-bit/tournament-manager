import type { LiveMatch } from "./liveTypes";

export interface CourtMatchDisplay {
  code: string;
  equipe1: string;
  equipe2: string;
}

export function firstMatchByTerrain(
  matches: LiveMatch[],
  terrains: string[]
): Map<string, CourtMatchDisplay | null> {
  const result = new Map<string, CourtMatchDisplay | null>();

  for (const terrain of terrains) {
    const first = matches
      .filter((match) => match.terrain === terrain)
      .sort(
        (a, b) =>
          a.ordre_planning - b.ordre_planning || a.ordre - b.ordre
      )[0];

    result.set(
      terrain,
      first
        ? {
            code: first.code,
            equipe1: first.equipe1?.trim() || "—",
            equipe2: first.equipe2?.trim() || "—",
          }
        : null
    );
  }

  return result;
}

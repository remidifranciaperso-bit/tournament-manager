export interface ParsedTeam {
  player1: string;
  player2: string | null;
  seed: string | null;
}

export function parseTeamLabel(label: string): ParsedTeam {
  const raw = label.trim();
  if (!raw) {
    return { player1: "—", player2: null, seed: null };
  }

  let seed: string | null = null;
  let body = raw;

  const seedMatch = raw.match(/\((TS\d*)\)\s*$/i);
  if (seedMatch) {
    seed = seedMatch[1].toUpperCase();
    body = raw.slice(0, seedMatch.index).trim();
  }

  const slashParts = body.split(/\s*\/\s*/);
  if (slashParts.length >= 2) {
    return {
      player1: slashParts[0].trim(),
      player2: slashParts.slice(1).join(" / ").trim(),
      seed,
    };
  }

  return { player1: body, player2: null, seed };
}

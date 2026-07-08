import type { MatchFormatCode } from "./matchFormats";

export interface SetScore {
  team1: number;
  team2: number;
}

export interface ValidatedMatchScore {
  sets: SetScore[];
  winner: 1 | 2;
  loser: 1 | 2;
  display: string;
}

interface FormatRules {
  kind: "two_sets" | "two_sets_super_tb" | "one_set";
  gamesToWin: number;
  tiebreakAt: number | null;
  superTiebreakTo?: number;
}

const FORMAT_RULES: Record<MatchFormatCode, FormatRules> = {
  A1: { kind: "two_sets", gamesToWin: 6, tiebreakAt: 6 },
  A2: { kind: "two_sets", gamesToWin: 6, tiebreakAt: 6 },
  B1: { kind: "two_sets_super_tb", gamesToWin: 6, tiebreakAt: 6, superTiebreakTo: 10 },
  B2: { kind: "two_sets_super_tb", gamesToWin: 6, tiebreakAt: 6, superTiebreakTo: 10 },
  C1: { kind: "two_sets_super_tb", gamesToWin: 4, tiebreakAt: 4, superTiebreakTo: 10 },
  C2: { kind: "two_sets_super_tb", gamesToWin: 4, tiebreakAt: 4, superTiebreakTo: 10 },
  D1: { kind: "one_set", gamesToWin: 9, tiebreakAt: 8 },
  D2: { kind: "one_set", gamesToWin: 9, tiebreakAt: 8 },
  E1: { kind: "one_set", gamesToWin: 10, tiebreakAt: null },
};

function setWinner(set: SetScore): 1 | 2 | null {
  if (set.team1 === set.team2) return null;
  return set.team1 > set.team2 ? 1 : 2;
}

function isValidRegularSet(
  set: SetScore,
  gamesToWin: number,
  tiebreakAt: number | null
): boolean {
  const winner = setWinner(set);
  if (!winner) return false;

  const high = Math.max(set.team1, set.team2);
  const low = Math.min(set.team1, set.team2);

  if (high < gamesToWin) return false;
  if (high - low >= 2) return true;
  if (tiebreakAt !== null && high === tiebreakAt + 1 && low === tiebreakAt) {
    return true;
  }
  return false;
}

function isValidSuperTiebreak(set: SetScore, target: number): boolean {
  const winner = setWinner(set);
  if (!winner) return false;

  const high = Math.max(set.team1, set.team2);
  const low = Math.min(set.team1, set.team2);

  if (high < target) return false;
  return high - low >= 2;
}

function formatSet(set: SetScore): string {
  return `${set.team1}-${set.team2}`;
}

function setsWon(sets: SetScore[]): { team1: number; team2: number } {
  let team1 = 0;
  let team2 = 0;
  for (const set of sets) {
    const winner = setWinner(set);
    if (winner === 1) team1 += 1;
    if (winner === 2) team2 += 1;
  }
  return { team1, team2 };
}

export function expectedSetCount(format: MatchFormatCode): number {
  const rules = FORMAT_RULES[format];
  if (rules.kind === "one_set") return 1;
  if (rules.kind === "two_sets") return 2;
  return 3;
}

export function formatScoreLabel(format: MatchFormatCode): string {
  const rules = FORMAT_RULES[format];
  if (rules.kind === "one_set" && format === "E1") {
    return "1 set à 10 points";
  }
  if (rules.kind === "one_set") {
    return `1 set à ${rules.gamesToWin} jeux`;
  }
  if (rules.kind === "two_sets_super_tb") {
    return `2 sets à ${rules.gamesToWin} jeux + super TB`;
  }
  return `2 sets à ${rules.gamesToWin} jeux`;
}

export function validateMatchScore(
  format: MatchFormatCode,
  sets: SetScore[]
): { ok: true; result: ValidatedMatchScore } | { ok: false; error: string } {
  const rules = FORMAT_RULES[format];

  if (rules.kind === "one_set") {
    if (sets.length !== 1) {
      return { ok: false, error: "Saisissez le score du set." };
    }
    const set = sets[0];
    const valid =
      format === "E1"
        ? isValidSuperTiebreak(set, rules.gamesToWin)
        : isValidRegularSet(set, rules.gamesToWin, rules.tiebreakAt);
    if (!valid) {
      return { ok: false, error: "Score du set invalide pour ce format." };
    }
    const winner = setWinner(set)!;
    return {
      ok: true,
      result: {
        sets,
        winner,
        loser: winner === 1 ? 2 : 1,
        display: formatSet(set),
      },
    };
  }

  if (sets.length < 2) {
    return { ok: false, error: "Saisissez au moins 2 sets." };
  }

  const regularSets = sets.slice(0, 2);
  for (const set of regularSets) {
    if (!isValidRegularSet(set, rules.gamesToWin, rules.tiebreakAt)) {
      return { ok: false, error: "Score d'un set invalide pour ce format." };
    }
  }

  const won = setsWon(regularSets);
  if (won.team1 === 2 || won.team2 === 2) {
    const winner = won.team1 === 2 ? 1 : 2;
    return {
      ok: true,
      result: {
        sets: regularSets,
        winner,
        loser: winner === 1 ? 2 : 1,
        display: regularSets.map(formatSet).join(", "),
      },
    };
  }

  if (rules.kind === "two_sets") {
    return {
      ok: false,
      error: "Un joueur doit remporter 2 sets pour valider le match.",
    };
  }

  if (sets.length < 3) {
    return { ok: false, error: "Saisissez le super tie-break (3e set)." };
  }

  const superTb = sets[2];
  if (!isValidSuperTiebreak(superTb, rules.superTiebreakTo ?? 10)) {
    return { ok: false, error: "Super tie-break invalide (10 points, écart de 2)." };
  }

  const winner = setWinner(superTb)!;
  return {
    ok: true,
    result: {
      sets,
      winner,
      loser: winner === 1 ? 2 : 1,
      display: [...regularSets, superTb].map(formatSet).join(", "),
    },
  };
}

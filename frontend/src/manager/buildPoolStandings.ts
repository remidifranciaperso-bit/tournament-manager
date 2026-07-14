import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

/** Lettre de poule d'un code match (``PA_M3`` → ``A``), sinon ``null``. */
export function poolLetterFromCode(code: string): string | null {
  const m = code.match(/^P([A-Z])_M\d+$/);
  return m ? m[1] : null;
}

/** Numéro de match dans la poule (``PA_M3`` → ``3``), sinon ``0``. */
export function poolMatchNumber(code: string): number {
  const m = code.match(/^P[A-Z]_M(\d+)$/);
  return m ? Number.parseInt(m[1], 10) : 0;
}

/** Matchs d'une poule donnée, triés par numéro de match. */
export function poolMatches(matches: LiveMatch[], letter: string): LiveMatch[] {
  return matches
    .filter((match) => poolLetterFromCode(match.code) === letter)
    .sort((a, b) => poolMatchNumber(a.code) - poolMatchNumber(b.code));
}

/** Lettres de poules présentes dans le tournoi (ordre alphabétique). */
export function poolLetters(matches: LiveMatch[]): string[] {
  const set = new Set<string>();
  for (const match of matches) {
    const letter = poolLetterFromCode(match.code);
    if (letter) set.add(letter);
  }
  return [...set].sort();
}

export interface PoolStandingRow {
  team: string;
  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDiff: number;
  rank: number;
}

interface TeamStat {
  team: string;
  order: number;
  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
}

/**
 * Classement d'une poule à partir des matchs joués : victoires, défaites,
 * jeux (différence), rang. Rang par victoires puis différence de jeux puis
 * jeux marqués ; à égalité, ordre d'apparition (seeding).
 */
export function buildPoolStandings(
  matches: LiveMatch[],
  matchResults: Record<string, StoredMatchResult>
): PoolStandingRow[] {
  const stats = new Map<string, TeamStat>();

  const ensure = (team: string) => {
    let stat = stats.get(team);
    if (!stat) {
      stat = {
        team,
        order: stats.size,
        played: 0,
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
      };
      stats.set(team, stat);
    }
    return stat;
  };

  for (const match of matches) {
    const s1 = ensure(match.equipe1);
    const s2 = ensure(match.equipe2);

    const result = matchResults[match.code];
    if (!result) continue;

    let g1 = 0;
    let g2 = 0;
    for (const set of result.sets) {
      g1 += set.team1;
      g2 += set.team2;
    }

    s1.played += 1;
    s2.played += 1;
    s1.gamesFor += g1;
    s1.gamesAgainst += g2;
    s2.gamesFor += g2;
    s2.gamesAgainst += g1;

    if (result.winner === 1) {
      s1.wins += 1;
      s2.losses += 1;
    } else {
      s2.wins += 1;
      s1.losses += 1;
    }
  }

  const rows = [...stats.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const diffA = a.gamesFor - a.gamesAgainst;
    const diffB = b.gamesFor - b.gamesAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
    return a.order - b.order;
  });

  return rows.map((stat, index) => ({
    team: stat.team,
    played: stat.played,
    wins: stat.wins,
    losses: stat.losses,
    gamesFor: stat.gamesFor,
    gamesAgainst: stat.gamesAgainst,
    gameDiff: stat.gamesFor - stat.gamesAgainst,
    rank: index + 1,
  }));
}

/** Une poule est terminée quand tous ses matchs ont un résultat validé. */
function isPoolComplete(
  pool: LiveMatch[],
  matchResults: Record<string, StoredMatchResult>
): boolean {
  return pool.length > 0 && pool.every((match) => matchResults[match.code]);
}

/**
 * Table de résolution des qualifiés de poule (« Vainqueur/Deuxième/Troisième
 * Poule X » → équipe réelle), uniquement pour les poules terminées et donc au
 * classement définitif. Utilisée par le tableau principal pour remplir les
 * boîtes une fois les poules jouées.
 */
export function buildPoolQualifierMap(
  matches: LiveMatch[],
  matchResults: Record<string, StoredMatchResult>
): Map<string, string> {
  const map = new Map<string, string>();

  for (const letter of poolLetters(matches)) {
    const pool = poolMatches(matches, letter);
    if (!isPoolComplete(pool, matchResults)) continue;

    const standings = buildPoolStandings(pool, matchResults);
    if (standings[0]) {
      map.set(`Vainqueur Poule ${letter}`, standings[0].team);
    }
    if (standings[1]) {
      map.set(`Deuxième Poule ${letter}`, standings[1].team);
      map.set(`Second Poule ${letter}`, standings[1].team);
    }
    if (standings[2]) {
      map.set(`Troisième Poule ${letter}`, standings[2].team);
    }
  }

  return map;
}

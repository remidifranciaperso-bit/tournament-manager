import type { LiveMatch } from "../manager/liveTypes";

const TERRAINS = [
  "CENTRE",
  "COUVERT 1",
  "COUVERT 2",
  "CREDIT AGRICOLE",
  "EXT 1",
  "EXT 2",
  "EXT 3",
  "EXT 4",
] as const;

function pair(index: number): [string, string] {
  const a = index * 2 + 1;
  const b = a + 1;
  return [`Joueur ${a} / Joueur ${a + 1}`, `Joueur ${b + 2} / Joueur ${b + 3}`];
}

function base(
  ordre: number,
  code: string,
  tour: string,
  equipe1: string,
  equipe2: string,
  terrain: string,
  heure: string,
  parents: string[] = []
): LiveMatch {
  return {
    ordre,
    code,
    tour,
    equipe1,
    equipe2,
    terrain,
    heure,
    jour: 1,
    ordre_planning: ordre,
    parents,
  };
}

/** Jeu de données minimal pour prévisualiser le tableau principal 16 équipes. */
export function mockBracket16Matches(): LiveMatch[] {
  const h: LiveMatch[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const [eq1, eq2] = pair(i - 1);
    h.push(
      base(i, `H${i}`, "Huitième", eq1, eq2, TERRAINS[i - 1], `0${8 + i}:00`)
    );
  }

  return [
    ...h,
    base(9, "Q1", "Quart", "Vainqueur H1", "Vainqueur H2", "CENTRE", "11:00", [
      "H1",
      "H2",
    ]),
    base(10, "Q2", "Quart", "Vainqueur H3", "Vainqueur H4", "COUVERT 1", "11:00", [
      "H3",
      "H4",
    ]),
    base(11, "Q3", "Quart", "Vainqueur H5", "Vainqueur H6", "COUVERT 2", "11:30", [
      "H5",
      "H6",
    ]),
    base(12, "Q4", "Quart", "Vainqueur H7", "Vainqueur H8", "CREDIT AGRICOLE", "11:30", [
      "H7",
      "H8",
    ]),
    base(13, "D1", "Demi", "Vainqueur Q1", "Vainqueur Q2", "CENTRE", "13:00", [
      "Q1",
      "Q2",
    ]),
    base(14, "D2", "Demi", "Vainqueur Q3", "Vainqueur Q4", "COUVERT 1", "13:00", [
      "Q3",
      "Q4",
    ]),
    base(15, "PF", "Petite finale", "Perdant D1", "Perdant D2", "COUVERT 2", "15:00", [
      "D1",
      "D2",
    ]),
    base(16, "F", "Finale", "Vainqueur D1", "Vainqueur D2", "CENTRE", "16:00", [
      "D1",
      "D2",
    ]),
  ];
}

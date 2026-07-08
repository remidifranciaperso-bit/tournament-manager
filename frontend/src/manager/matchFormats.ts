import type { TournamentForm } from "../types";

export const MATCH_FORMAT_CODES = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "D1",
  "D2",
  "E1",
] as const;

export type MatchFormatCode = (typeof MATCH_FORMAT_CODES)[number];
export type MatchFormatChoice = MatchFormatCode | "identique";

export interface MatchFormatOption {
  code: MatchFormatCode;
  description: string;
}

export const MATCH_FORMAT_OPTIONS: MatchFormatOption[] = [
  {
    code: "A1",
    description: "Deux sets gagnants de 6 jeux, avec jeu décisif à 6-6",
  },
  {
    code: "A2",
    description:
      "2 sets gagnants de 6 jeux, avec jeu décisif à 6-6 ; point décisif à 40-40",
  },
  {
    code: "B1",
    description:
      "2 sets à 6 jeux, avec jeu décisif à 6-6 ; 3ème set = super jeu décisif à 10 points",
  },
  {
    code: "B2",
    description:
      "2 sets à 6 jeux, avec jeu décisif à 6-6 ; 3ème set = super jeu décisif à 10 points ; point décisif à 40-40",
  },
  {
    code: "C1",
    description:
      "2 sets à 4 jeux, jeu décisif à 4/4 ; 3ème set = super jeu décisif à 10 points",
  },
  {
    code: "C2",
    description:
      "2 sets à 4 jeux, jeu décisif à 4/4 ; 3ème set = super jeu décisif à 10 points ; point décisif à 40-40",
  },
  {
    code: "D1",
    description: "1 set à 9 jeux, jeu décisif à 8-8",
  },
  {
    code: "D2",
    description: "1 set à 9 jeux, jeu décisif à 8-8 ; point décisif à 40-40",
  },
  {
    code: "E1",
    description: "1 set à 10 points",
  },
];

export function resolveMatchFormat(
  choice: MatchFormatChoice,
  principal: MatchFormatCode
): MatchFormatCode {
  return choice === "identique" ? principal : choice;
}

export function formatChoiceLabel(
  choice: MatchFormatChoice,
  principal: MatchFormatCode | null
): string {
  if (choice === "identique") {
    return principal ? `Identique (${principal})` : "Identique";
  }
  return choice;
}

export function matchFormatsStepValid(form: TournamentForm): boolean {
  if (!form.formatMatchTableauPrincipal) return false;
  if (!form.formatMatchClassement) return false;
  if (!form.formatMatchFinale) return false;
  if (
    form.modeTournoi === "Poules + tableau final" &&
    !form.formatMatchPoule
  ) {
    return false;
  }
  return true;
}

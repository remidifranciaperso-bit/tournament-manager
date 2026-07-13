import type { TournamentForm } from "../types";
import { matchFormatCategory } from "./matchFormatResolver";
import type { LiveTournamentData, LiveTournamentMeta } from "./liveTypes";

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

export function buildMatchFormatSummaryRows(
  form: TournamentForm
): { label: string; value: string }[] {
  const principal = form.formatMatchTableauPrincipal;
  if (!principal) {
    return [{ label: "Formats de matchs", value: "—" }];
  }

  const hasPoules = form.modeTournoi === "Poules + tableau final";
  const autres: { label: string; code: MatchFormatCode }[] = [];

  const classement = resolveMatchFormat(form.formatMatchClassement, principal);
  if (classement !== principal) {
    autres.push({ label: "Classements", code: classement });
  }

  const finale = resolveMatchFormat(form.formatMatchFinale, principal);
  if (finale !== principal) {
    autres.push({ label: "Finale", code: finale });
  }

  if (hasPoules) {
    const poule = resolveMatchFormat(form.formatMatchPoule, principal);
    if (poule !== principal) {
      autres.push({ label: "Poules", code: poule });
    }
  }

  if (autres.length === 0) {
    return [{ label: "Formats de matchs", value: principal }];
  }

  return [
    { label: "Format tableau principal", value: principal },
    {
      label: "Autres formats",
      value: autres.map(({ label, code }) => `${label} ${code}`).join(" · "),
    },
  ];
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

export function packHasPoules(data: LiveTournamentData): boolean {
  if (data.meta.mode_tournoi === "Poules + tableau final") return true;
  return data.matches.some(
    (match) => matchFormatCategory(match.tour) === "poule"
  );
}

export function hydrateFormFromPackMeta(
  meta: LiveTournamentMeta,
  hasPoules: boolean
): Partial<TournamentForm> {
  return {
    club: meta.club,
    dateTournoi: meta.date_tournoi,
    typeTournoi: meta.type_tournoi as TournamentForm["typeTournoi"],
    genreTournoi: (meta.genre_tournoi ??
      "Hommes") as TournamentForm["genreTournoi"],
    modeTournoi: hasPoules ? "Poules + tableau final" : "Élimination directe",
    nbJours: meta.nb_jours,
    heuresDebutJours: [meta.heure_debut],
    dureeMatch: meta.duree_match,
    nbTerrains: meta.terrains.length,
    terrains: [...meta.terrains],
    terrainPrincipal: meta.terrain_principal,
    formatMatchTableauPrincipal: null,
    formatMatchClassement: "identique",
    formatMatchFinale: "identique",
    formatMatchPoule: "identique",
  };
}

export function applyFormFormatsToLiveData(
  data: LiveTournamentData,
  form: TournamentForm
): LiveTournamentData {
  const principal = form.formatMatchTableauPrincipal!;
  const classement = resolveMatchFormat(form.formatMatchClassement, principal);
  const finale = resolveMatchFormat(form.formatMatchFinale, principal);
  const hasPoules = form.modeTournoi === "Poules + tableau final";
  const poule = hasPoules
    ? resolveMatchFormat(form.formatMatchPoule, principal)
    : null;

  return {
    ...data,
    meta: {
      ...data.meta,
      format_match_tableau_principal: principal,
      format_match_classement: form.formatMatchClassement,
      format_match_finale: form.formatMatchFinale,
      format_match_poule: form.formatMatchPoule,
      formats_match: {
        tableau_principal: principal,
        classement,
        finale,
        poule,
      },
    },
  };
}

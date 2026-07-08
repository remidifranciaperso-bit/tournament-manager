export type Genre = "Hommes" | "Femmes" | "Mixte";
export type ModeTournoi = "Élimination directe" | "Poules + tableau final";
export type MethodePoules = "Méthode du serpentin" | "Tirage au sort par rang";

export type MatchFormatCode =
  | "A1"
  | "A2"
  | "B1"
  | "B2"
  | "C1"
  | "C2"
  | "D1"
  | "D2"
  | "E1";

export type MatchFormatChoice = MatchFormatCode | "identique";

export const TYPES_TOURNOI = [
  "P25",
  "P50",
  "P100",
  "P250",
  "P500",
  "P1000",
] as const;
export type TypeTournoi = (typeof TYPES_TOURNOI)[number];

export const FORMATS_SUPPORTES = [8, 12, 16, 20, 24];

export interface EquipePreview {
  equipe: number;
  joueur1: string;
  classement_j1: number;
  joueur2: string;
  classement_j2: number;
  poids_paire: number;
}

export interface PreviewResult {
  nb_equipes: number;
  supporte: boolean;
  formats_supportes: number[];
  equipes: EquipePreview[];
}

export interface TournamentForm {
  excelFile: File | null;
  logoFile: File | null;
  pasDeLogo: boolean;
  club: string;
  dateTournoi: string;
  typeTournoi: TypeTournoi;
  genreTournoi: Genre;
  modeTournoi: ModeTournoi;
  methodePoules: MethodePoules;
  nbJours: number;
  heuresDebutJours: string[];
  dureeMatch: number;
  nbTerrains: number;
  terrains: string[];
  terrainPrincipal: string;
  formatMatchTableauPrincipal: MatchFormatCode | null;
  formatMatchClassement: MatchFormatChoice;
  formatMatchFinale: MatchFormatChoice;
  formatMatchPoule: MatchFormatChoice;
}

export function defaultForm(): TournamentForm {
  return {
    excelFile: null,
    logoFile: null,
    pasDeLogo: false,
    club: "",
    dateTournoi: new Date().toISOString().slice(0, 10),
    typeTournoi: "P100",
    genreTournoi: "Hommes",
    modeTournoi: "Élimination directe",
    methodePoules: "Méthode du serpentin",
    nbJours: 1,
    heuresDebutJours: ["18:00"],
    dureeMatch: 40,
    nbTerrains: 4,
    terrains: ["Terrain 1", "Terrain 2", "Terrain 3", "Terrain 4"],
    terrainPrincipal: "Terrain 1",
    formatMatchTableauPrincipal: null,
    formatMatchClassement: "identique",
    formatMatchFinale: "identique",
    formatMatchPoule: "identique",
  };
}

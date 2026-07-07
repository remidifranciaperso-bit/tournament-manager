export interface LiveMatch {
  ordre: number;
  code: string;
  tour: string;
  equipe1: string;
  equipe2: string;
  terrain: string | null;
  heure: string | null;
  jour: number;
  ordre_planning: number;
  parents: string[];
}

export interface LivePageEntry {
  index: number;
  label: string;
}

export interface LivePageMap {
  main: LivePageEntry[];
  classement: LivePageEntry[];
  planning: LivePageEntry[];
  planning_groups: number[][];
  final: LivePageEntry[];
}

export interface LiveTournamentMeta {
  club: string;
  date_tournoi: string;
  type_tournoi: string;
  genre_tournoi: string | null;
  mode_tournoi: string;
  nb_equipes: number;
  nb_jours: number;
  terrains: string[];
  terrain_principal: string;
  heure_debut: string;
  duree_match: number;
}

export interface LiveTournamentData {
  meta: LiveTournamentMeta;
  matches: LiveMatch[];
  page_map: LivePageMap;
  fields: Record<string, string>;
  pdf_base64: string;
  pdf_filename: string;
  live_version?: string;
}

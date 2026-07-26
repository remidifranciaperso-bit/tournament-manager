export type MvpTournamentStatus = "generated" | "convocations_sent" | "live_active" | "finished";

export interface MvpTournamentSummary {
  id: string;
  name: string;
  club: string;
  genreLabel: string;
  dateLabel: string;
  formatLabel: string;
  teams: number;
  status: MvpTournamentStatus;
}

export interface MvpClubProfile {
  club: string;
  nbTerrains: number;
  terrains: string[];
  terrainPrincipal: string;
  hasLogo: boolean;
  logoPreviewUrl?: string | null;
}

export const MOCK_CLUB: MvpClubProfile = {
  club: "TC DZZD",
  nbTerrains: 4,
  terrains: ["CENTRAL", "TERRAIN 2", "TERRAIN 3", "TERRAIN 4"],
  terrainPrincipal: "CENTRAL",
  hasLogo: false,
  logoPreviewUrl: null,
};

export const MOCK_TOURNAMENTS: MvpTournamentSummary[] = [
  {
    id: "p100-jul-26",
    name: "P100 DZZD",
    club: "TC DZZD",
    genreLabel: "Hommes",
    dateLabel: "26 juillet 2026",
    formatLabel: "P100 · 8 équipes",
    teams: 8,
    status: "convocations_sent",
  },
  {
    id: "p500-sep-26",
    name: "P500 Club Test",
    club: "TC DZZD",
    genreLabel: "Hommes",
    dateLabel: "12 septembre 2026",
    formatLabel: "P500 · 16 équipes",
    teams: 16,
    status: "generated",
  },
  {
    id: "p250-jun-26",
    name: "P250 Été",
    club: "TC DZZD",
    genreLabel: "Femmes",
    dateLabel: "15 juin 2026",
    formatLabel: "P250 · 12 équipes",
    teams: 12,
    status: "finished",
  },
];

export const STATUS_LABELS: Record<MvpTournamentStatus, string> = {
  generated: "Généré",
  convocations_sent: "Convocations envoyées",
  live_active: "Live actif",
  finished: "Terminé",
};

/** Garde un terrain principal valide après renommage ou changement de liste. */
export function resolveTerrainPrincipal(
  terrains: string[],
  terrainPrincipal: string
): string {
  if (terrains.length === 0) return terrainPrincipal;
  const match = terrains.find(
    (terrain) => terrain.toUpperCase() === terrainPrincipal.toUpperCase()
  );
  return match ?? terrains[0];
}

export interface MvpRosterPlayer {
  id: string;
  label: string;
  nom: string;
  prenom: string;
  classement: string;
  teamId: string;
}

export interface MvpRosterTeam {
  id: string;
  label: string;
  ts: number;
  joueur1: { nom: string; prenom: string; classement: string };
  joueur2: { nom: string; prenom: string; classement: string };
}

const MOCK_ROSTER_POOL: Omit<MvpRosterTeam, "id" | "label" | "ts">[] = [
  {
    joueur1: { nom: "MARTIN", prenom: "Lucas", classement: "1200" },
    joueur2: { nom: "BERNARD", prenom: "Hugo", classement: "1630" },
  },
  {
    joueur1: { nom: "DUBOIS", prenom: "Nathan", classement: "2060" },
    joueur2: { nom: "THOMAS", prenom: "Louis", classement: "2490" },
  },
  {
    joueur1: { nom: "ROBERT", prenom: "Jules", classement: "2920" },
    joueur2: { nom: "RICHARD", prenom: "Gabriel", classement: "3180" },
  },
  {
    joueur1: { nom: "PETIT", prenom: "Arthur", classement: "3410" },
    joueur2: { nom: "DURAND", prenom: "Ethan", classement: "3750" },
  },
  {
    joueur1: { nom: "LEROY", prenom: "Adam", classement: "4020" },
    joueur2: { nom: "MOREAU", prenom: "Raphaël", classement: "4280" },
  },
  {
    joueur1: { nom: "SIMON", prenom: "Paul", classement: "4510" },
    joueur2: { nom: "LAURENT", prenom: "Emile", classement: "4790" },
  },
  {
    joueur1: { nom: "LEFEBVRE", prenom: "Tom", classement: "5020" },
    joueur2: { nom: "MICHEL", prenom: "Noah", classement: "5280" },
  },
  {
    joueur1: { nom: "GARCIA", prenom: "Théo", classement: "5510" },
    joueur2: { nom: "DAVID", prenom: "Maxime", classement: "5790" },
  },
  {
    joueur1: { nom: "VINCENT", prenom: "Maxime", classement: "6010" },
    joueur2: { nom: "FOURNIER", prenom: "Victor", classement: "6240" },
  },
  {
    joueur1: { nom: "MORIN", prenom: "Cédric", classement: "6480" },
    joueur2: { nom: "MATHIEU", prenom: "Yann", classement: "6720" },
  },
  {
    joueur1: { nom: "ANDRE", prenom: "Baptiste", classement: "6910" },
    joueur2: { nom: "MERCIER", prenom: "Clément", classement: "7150" },
  },
  {
    joueur1: { nom: "ROUSSEAU", prenom: "Romain", classement: "7380" },
    joueur2: { nom: "BLANC", prenom: "Florian", classement: "7620" },
  },
  {
    joueur1: { nom: "MARTINEZ", prenom: "Valentin", classement: "7810" },
    joueur2: { nom: "LEGRAND", prenom: "Kevin", classement: "8040" },
  },
  {
    joueur1: { nom: "CLEMENT", prenom: "Guillaume", classement: "8260" },
    joueur2: { nom: "GAUTHIER", prenom: "Matthieu", classement: "8490" },
  },
  {
    joueur1: { nom: "GARNIER", prenom: "Julien", classement: "8710" },
    joueur2: { nom: "FAURE", prenom: "Nicolas", classement: "8930" },
  },
  {
    joueur1: { nom: "DUMONT", prenom: "Benjamin", classement: "9120" },
    joueur2: { nom: "LOPEZ", prenom: "Rémi", classement: "9340" },
  },
];

export function mockRosterForTournament(tournament: MvpTournamentSummary): {
  teams: MvpRosterTeam[];
  players: MvpRosterPlayer[];
} {
  const count = Math.max(4, Math.min(tournament.teams || 8, MOCK_ROSTER_POOL.length));
  const teams: MvpRosterTeam[] = [];
  const players: MvpRosterPlayer[] = [];

  for (let index = 0; index < count; index += 1) {
    const ts = index + 1;
    const entry = MOCK_ROSTER_POOL[index];
    const teamId = `team-${ts}`;
    const label = `TS${ts} — ${entry.joueur1.nom} / ${entry.joueur2.nom}`;
    teams.push({ id: teamId, label, ts, ...entry });

    players.push(
      {
        id: `${teamId}-j1`,
        teamId,
        label: `${entry.joueur1.prenom} ${entry.joueur1.nom} (TS${ts})`,
        nom: entry.joueur1.nom,
        prenom: entry.joueur1.prenom,
        classement: entry.joueur1.classement,
      },
      {
        id: `${teamId}-j2`,
        teamId,
        label: `${entry.joueur2.prenom} ${entry.joueur2.nom} (TS${ts})`,
        nom: entry.joueur2.nom,
        prenom: entry.joueur2.prenom,
        classement: entry.joueur2.classement,
      }
    );
  }

  return { teams, players };
}

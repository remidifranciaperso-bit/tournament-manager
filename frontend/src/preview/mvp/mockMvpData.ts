export type MvpTournamentStatus = "generated" | "convocations_sent" | "live_active" | "finished";

export interface MvpTournamentSummary {
  id: string;
  name: string;
  club: string;
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
    dateLabel: "26 juillet 2026",
    formatLabel: "P100 · 8 équipes",
    teams: 8,
    status: "convocations_sent",
  },
  {
    id: "p500-sep-26",
    name: "P500 Club Test",
    club: "TC DZZD",
    dateLabel: "12 septembre 2026",
    formatLabel: "P500 · 16 équipes",
    teams: 16,
    status: "generated",
  },
  {
    id: "p250-jun-26",
    name: "P250 Été",
    club: "TC DZZD",
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

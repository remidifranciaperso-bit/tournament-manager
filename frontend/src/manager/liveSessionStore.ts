import type { TournamentForm } from "../types";
import { defaultForm } from "../types";
import type { LiveTournamentData } from "./liveTypes";
import { clearLiveProgress, readLiveProgressStats } from "./useLiveProgress";

const SESSION_STORAGE_KEY = "manager-live-session-v1";

export interface StoredFormSnapshot {
  pasDeLogo: boolean;
  club: string;
  dateTournoi: string;
  typeTournoi: TournamentForm["typeTournoi"];
  genreTournoi: TournamentForm["genreTournoi"];
  modeTournoi: TournamentForm["modeTournoi"];
  methodePoules: TournamentForm["methodePoules"];
  nbJours: number;
  heuresDebutJours: string[];
  dureeMatch: number;
  nbTerrains: number;
  terrains: string[];
  terrainPrincipal: string;
  formatMatchTableauPrincipal: TournamentForm["formatMatchTableauPrincipal"];
  formatMatchClassement: TournamentForm["formatMatchClassement"];
  formatMatchFinale: TournamentForm["formatMatchFinale"];
  formatMatchPoule: TournamentForm["formatMatchPoule"];
}

export interface StoredLiveSession {
  version: 1;
  liveData: LiveTournamentData;
  form: StoredFormSnapshot;
  nbEquipes: number;
  savedAt: number;
}

export interface LiveResumeSummary {
  club: string;
  dateTournoi: string;
  done: number;
  total: number;
  started: boolean;
  finished: boolean;
}

export function formToSnapshot(form: TournamentForm): StoredFormSnapshot {
  return {
    pasDeLogo: form.pasDeLogo,
    club: form.club,
    dateTournoi: form.dateTournoi,
    typeTournoi: form.typeTournoi,
    genreTournoi: form.genreTournoi,
    modeTournoi: form.modeTournoi,
    methodePoules: form.methodePoules,
    nbJours: form.nbJours,
    heuresDebutJours: [...form.heuresDebutJours],
    dureeMatch: form.dureeMatch,
    nbTerrains: form.nbTerrains,
    terrains: [...form.terrains],
    terrainPrincipal: form.terrainPrincipal,
    formatMatchTableauPrincipal: form.formatMatchTableauPrincipal,
    formatMatchClassement: form.formatMatchClassement,
    formatMatchFinale: form.formatMatchFinale,
    formatMatchPoule: form.formatMatchPoule,
  };
}

export function snapshotToForm(snapshot: StoredFormSnapshot): TournamentForm {
  return {
    ...defaultForm(),
    ...snapshot,
    excelFile: null,
    logoFile: null,
  };
}

function stripHeavyLiveFields(data: LiveTournamentData): LiveTournamentData {
  const { logo_png: _logoPng, ...rest } = data;
  return rest;
}

export function saveLiveSession(
  liveData: LiveTournamentData,
  form: TournamentForm,
  nbEquipes: number
): void {
  const session: StoredLiveSession = {
    version: 1,
    liveData: stripHeavyLiveFields(liveData),
    form: formToSnapshot(form),
    nbEquipes,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota dépassé — la progression par match reste disponible via live_token.
  }
}

export function loadLiveSession(): StoredLiveSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredLiveSession;
    if (parsed.version !== 1 || !parsed.liveData?.live_token) return null;
    if (!Array.isArray(parsed.liveData.matches)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function buildResumeSummary(session: StoredLiveSession): LiveResumeSummary {
  const total = session.liveData.matches.length;
  const stats = readLiveProgressStats(session.liveData.live_token, total);

  return {
    club: session.liveData.meta.club,
    dateTournoi: session.liveData.meta.date_tournoi,
    done: stats.done,
    total,
    started: stats.started,
    finished: stats.finished,
  };
}

export function clearLiveSession(liveToken: string): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  clearLiveProgress(liveToken);
}

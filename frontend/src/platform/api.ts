import type { MvpClubProfile, MvpTournamentSummary } from "../preview/mvp/mockMvpData";

const TOKEN_KEY = "platform_access_token";

export class PlatformAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformAuthError";
  }
}

interface ApiClubProfile {
  club: string;
  nb_terrains: number;
  terrains: string[];
  terrain_principal: string;
  has_logo: boolean;
  logo_url: string | null;
}

interface ApiMeResponse {
  email: string;
  club_profile: ApiClubProfile | null;
}

interface ApiTournament {
  id: string;
  name: string;
  club: string;
  date_label: string;
  format_label: string;
  teams: number;
  status: MvpTournamentSummary["status"];
  created_at: string;
}

function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = readToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string | { msg?: string }[] };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  } catch {
    /* ignore */
  }
  return "Requête impossible";
}

async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    platformLogout();
    throw new PlatformAuthError("Session expirée");
  }

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function hasPlatformSession(): boolean {
  return Boolean(readToken());
}

export function platformLogout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function platformLogin(email: string, password: string): Promise<void> {
  const res = await fetch("/api/platform/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { access_token: string };
  localStorage.setItem(TOKEN_KEY, data.access_token);
}

export function toMvpClubProfile(profile: ApiClubProfile | null): MvpClubProfile {
  if (!profile) {
    return {
      club: "",
      nbTerrains: 4,
      terrains: ["TERRAIN 1", "TERRAIN 2", "TERRAIN 3", "TERRAIN 4"],
      terrainPrincipal: "TERRAIN 1",
      hasLogo: false,
      logoPreviewUrl: null,
    };
  }

  return {
    club: profile.club,
    nbTerrains: profile.nb_terrains,
    terrains: profile.terrains,
    terrainPrincipal: profile.terrain_principal,
    hasLogo: profile.has_logo,
    logoPreviewUrl: profile.logo_url,
  };
}

function toMvpTournament(row: ApiTournament): MvpTournamentSummary {
  return {
    id: row.id,
    name: row.name,
    club: row.club,
    dateLabel: row.date_label,
    formatLabel: row.format_label,
    teams: row.teams,
    status: row.status,
  };
}

export async function platformFetchMe(): Promise<{ email: string; clubProfile: MvpClubProfile }> {
  const data = await platformFetch<ApiMeResponse>("/api/platform/me");
  return {
    email: data.email,
    clubProfile: toMvpClubProfile(data.club_profile),
  };
}

export async function platformFetchTournaments(): Promise<MvpTournamentSummary[]> {
  const rows = await platformFetch<ApiTournament[]>("/api/platform/tournaments");
  return rows.map(toMvpTournament);
}

export async function platformUpdateClubProfile(body: {
  club: string;
  nb_terrains: number;
  terrains: string[];
  terrain_principal: string;
}): Promise<MvpClubProfile> {
  const data = await platformFetch<ApiClubProfile>("/api/platform/club-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return toMvpClubProfile(data);
}

export async function platformUploadLogo(file: File): Promise<MvpClubProfile> {
  const form = new FormData();
  form.append("file", file);

  const data = await platformFetch<ApiClubProfile>("/api/platform/club/logo", {
    method: "POST",
    body: form,
  });
  return toMvpClubProfile(data);
}

export async function platformFetchEngineV2Url(): Promise<string> {
  const data = await platformFetch<{ url: string }>("/api/platform/engine-v2-url");
  return data.url;
}

export interface PlatformTestAccount {
  email: string;
  password: string;
}

export async function platformFetchTestAccounts(): Promise<PlatformTestAccount[]> {
  const res = await fetch("/api/platform/auth/test-accounts");
  if (!res.ok) return [];
  const data = (await res.json()) as { accounts: PlatformTestAccount[] };
  return data.accounts ?? [];
}

export async function platformFetchClubLogoFile(logoUrl: string | null): Promise<File | null> {
  if (!logoUrl) return null;
  const token = readToken();
  const res = await fetch(logoUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  const type = blob.type || "image/png";
  return new File([blob], "club-logo.png", { type });
}

export async function platformCreateTournament(input: {
  name: string;
  dateLabel: string;
  formatLabel: string;
  teams: number;
  liveSnapshot: Record<string, unknown>;
  pdf: Blob;
  pdfFilename: string;
}): Promise<{ id: string; name: string }> {
  const form = new FormData();
  form.append("name", input.name);
  form.append("date_label", input.dateLabel);
  form.append("format_label", input.formatLabel);
  form.append("teams", String(input.teams));
  form.append("live_snapshot_json", JSON.stringify(input.liveSnapshot));
  form.append("pdf", input.pdf, input.pdfFilename);
  return platformFetch<{ id: string; name: string }>("/api/platform/tournaments", {
    method: "POST",
    body: form,
  });
}

export function platformTournamentPdfUrl(id: string, inline = false): string {
  return `/api/platform/tournaments/${id}/pdf${inline ? "?inline=1" : ""}`;
}

export function platformTournamentConvocationsPdfUrl(id: string): string {
  return `/api/platform/tournaments/${id}/convocations-pdf`;
}

async function fetchTournamentPdfBlob(id: string, inline: boolean): Promise<{ blob: Blob; filename: string }> {
  const token = readToken();
  const res = await fetch(platformTournamentPdfUrl(id, inline), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    platformLogout();
    throw new PlatformAuthError("Session expirée");
  }
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return { blob, filename: match?.[1] ?? "tournoi.pdf" };
}

export async function platformViewTournamentPdf(id: string): Promise<void> {
  const { blob } = await fetchTournamentPdfBlob(id, true);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function platformDownloadTournamentPdf(id: string): Promise<void> {
  const { blob, filename } = await fetchTournamentPdfBlob(id, false);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function platformDownloadConvocationsPdf(id: string): Promise<void> {
  const token = readToken();
  const res = await fetch(platformTournamentConvocationsPdfUrl(id), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    platformLogout();
    throw new PlatformAuthError("Session expirée");
  }
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/i);
  const filename = match?.[1] ?? "convocations.pdf";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function platformInitLive(tournamentId: string): Promise<{ live_token: string; live_data: import("../manager/liveTypes").LiveTournamentData }> {
  return platformFetch<{ live_token: string; live_data: import("../manager/liveTypes").LiveTournamentData }>(
    `/api/platform/tournaments/${tournamentId}/live-init`,
    { method: "POST" }
  );
}

export async function platformLaunchManagerLive(
  tournamentId: string,
  form: import("../types").TournamentForm,
  nbEquipes: number
): Promise<void> {
  const { saveLiveSession } = await import("../manager/liveSessionStore");
  const { normalizeLiveTournamentData } = await import("../api");
  const result = await platformInitLive(tournamentId);
  saveLiveSession(normalizeLiveTournamentData(result.live_data), form, nbEquipes);
}

export interface PlatformRosterPlayer {
  id: string;
  teamId: string;
  label: string;
  nom: string;
  prenom: string;
  classement: string;
}

export interface PlatformRosterTeam {
  id: string;
  label: string;
  ts: number;
  joueur1: { nom: string; prenom: string; classement: string };
  joueur2: { nom: string; prenom: string; classement: string };
}

export interface TeamChangePayload {
  mode: "partner" | "replace";
  player_id?: string;
  team_id?: string;
  replacement?: Record<string, unknown>;
}

export interface TeamChangeCheckResult {
  result: "ok" | "adjust" | "blocked";
  message: string;
  convocations_changed: number;
}

function toMvpRoster(data: {
  teams: PlatformRosterTeam[];
  players: PlatformRosterPlayer[];
}) {
  return {
    teams: data.teams.map((team) => ({
      id: team.id,
      label: team.label,
      ts: team.ts,
      joueur1: team.joueur1,
      joueur2: team.joueur2,
    })),
    players: data.players.map((player) => ({
      id: player.id,
      teamId: player.team_id,
      label: player.label,
      nom: player.nom,
      prenom: player.prenom,
      classement: player.classement,
    })),
  };
}

export async function platformFetchTournamentRoster(tournamentId: string) {
  const data = await platformFetch<{ teams: PlatformRosterTeam[]; players: PlatformRosterPlayer[] }>(
    `/api/platform/tournaments/${tournamentId}/roster`
  );
  return toMvpRoster(data);
}

export async function platformCheckTeamChange(
  tournamentId: string,
  payload: TeamChangePayload
): Promise<TeamChangeCheckResult> {
  return platformFetch<TeamChangeCheckResult>(
    `/api/platform/tournaments/${tournamentId}/team-changes/check`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

export async function platformApplyTeamChange(
  tournamentId: string,
  payload: TeamChangePayload
): Promise<{ message: string }> {
  return platformFetch<{ message: string }>(
    `/api/platform/tournaments/${tournamentId}/team-changes/apply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

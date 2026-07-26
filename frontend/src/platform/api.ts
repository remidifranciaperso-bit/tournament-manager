import type { MvpClubProfile, MvpTournamentSummary } from "../preview/mvp/mockMvpData";

const TOKEN_KEY = "platform_access_token";
const ACT_AS_KEY = "platform_act_as_user_id";

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

interface ApiActingAs {
  user_id: string;
  email: string;
  club: string;
}

interface ApiMeResponse {
  email: string;
  role: string;
  club_profile: ApiClubProfile | null;
  acting_as: ApiActingAs | null;
}

interface ApiTournament {
  id: string;
  name: string;
  club: string;
  genre_label: string;
  type_label: string;
  heure_label: string;
  nb_jours: number;
  date_label: string;
  format_label: string;
  teams: number;
  status: MvpTournamentSummary["status"];
  created_at: string;
}

function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function platformGetActAsUser(): string | null {
  return sessionStorage.getItem(ACT_AS_KEY);
}

export function platformSetActAsUser(userId: string | null): void {
  if (userId) sessionStorage.setItem(ACT_AS_KEY, userId);
  else sessionStorage.removeItem(ACT_AS_KEY);
}

export function platformClearActAsUser(): void {
  sessionStorage.removeItem(ACT_AS_KEY);
}

function applyPlatformAuthHeaders(headers: Headers): void {
  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const actAs = platformGetActAsUser();
  if (actAs) headers.set("X-Platform-Act-As", actAs);
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  applyPlatformAuthHeaders(headers);
  return headers;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as {
      detail?: string | { msg?: string; loc?: unknown[] }[];
      message?: string;
    };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const first = data.detail[0];
      if (first && typeof first.msg === "string") return first.msg;
    }
    if (typeof data.message === "string") return data.message;
  } catch {
    /* ignore */
  }
  return `Requête impossible (${res.status}${res.statusText ? ` ${res.statusText}` : ""})`;
}

async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  applyPlatformAuthHeaders(headers);
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
  platformClearActAsUser();
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
    genreLabel: row.genre_label || "Hommes",
    typeLabel: row.type_label || row.format_label.split("·")[0]?.trim() || row.name.split(" ")[0] || "",
    heureLabel: row.heure_label || "",
    nbJours: row.nb_jours > 0 ? row.nb_jours : 1,
    dateLabel: row.date_label,
    formatLabel: row.format_label,
    teams: row.teams,
    status: row.status,
  };
}

export async function platformFetchMe(): Promise<{
  email: string;
  role: string;
  clubProfile: MvpClubProfile;
  actingAs: { userId: string; email: string; club: string } | null;
}> {
  const data = await platformFetch<ApiMeResponse>("/api/platform/me");
  return {
    email: data.email,
    role: data.role || "organizer",
    clubProfile: toMvpClubProfile(data.club_profile),
    actingAs: data.acting_as
      ? {
          userId: data.acting_as.user_id,
          email: data.acting_as.email,
          club: data.acting_as.club,
        }
      : null,
  };
}

export interface PlatformOwnerUser {
  id: string;
  email: string;
  club: string;
  tournamentCount: number;
  createdAt: string;
}

export async function platformFetchOwnerUsers(): Promise<PlatformOwnerUser[]> {
  const rows = await platformFetch<
    {
      id: string;
      email: string;
      club: string;
      tournament_count: number;
      created_at: string;
    }[]
  >("/api/platform/owner/users");
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    club: row.club,
    tournamentCount: row.tournament_count,
    createdAt: row.created_at,
  }));
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
  const res = await fetch(logoUrl, {
    headers: authHeaders(),
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
  const snapshotCore = { ...input.liveSnapshot };
  const exportCaptures = (snapshotCore.export_captures as Record<string, string> | undefined) ?? {};
  const crosspageStubs = (snapshotCore.crosspage_stubs as Record<string, unknown> | undefined) ?? {};
  delete snapshotCore.export_captures;
  delete snapshotCore.crosspage_stubs;

  const form = new FormData();
  form.append("name", input.name);
  form.append("date_label", input.dateLabel);
  form.append("format_label", input.formatLabel);
  form.append("teams", String(input.teams));
  form.append("live_snapshot_json", JSON.stringify(snapshotCore));
  form.append("export_captures_json", JSON.stringify(exportCaptures));
  form.append("crosspage_stubs_json", JSON.stringify(crosspageStubs));
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
  const res = await fetch(platformTournamentPdfUrl(id, inline), {
    headers: authHeaders(),
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
  const res = await fetch(platformTournamentConvocationsPdfUrl(id), {
    headers: authHeaders(),
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
  ts_modified: boolean;
  bracket_modified: boolean;
  convocations_modified: boolean;
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

export async function platformDeleteTournament(tournamentId: string): Promise<void> {
  await platformFetch<void>(`/api/platform/tournaments/${tournamentId}`, {
    method: "DELETE",
  });
}

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
  const res = await fetch(path, {
    ...init,
    headers: {
      ...authHeaders(init?.headers),
      ...(init?.headers ?? {}),
    },
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

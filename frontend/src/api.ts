import type { PreviewResult, TournamentForm } from "./types";
import type {
  LiveLayoutField,
  LiveMatch,
  LivePageMap,
  LiveTournamentData,
  LiveTournamentMeta,
} from "./manager/liveTypes";
import type { CrossPageStub, ManagerExportCapture } from "./manager/captureExportPages";
import { buildExportFormData } from "./manager/captureExportPages";

function normalizeLiveTournamentData(data: LiveTournamentData): LiveTournamentData {
  const meta = { ...data.meta };
  if (!meta.logo_url && data.logo_data_url) {
    meta.logo_url = data.logo_data_url;
  }
  if (!meta.logo_url && data.logo_png) {
    meta.logo_url = `data:image/png;base64,${data.logo_png}`;
  }
  if (!meta.logo_url && data.live_token) {
    meta.logo_url = `/api/live/${data.live_token}/logo`;
  }
  return { ...data, meta };
}

export interface TournamentResume {
  club: string;
  date: string;
  heures: string;
  type: string;
  nb_equipes: number | string;
  mode: string;
  jours: number;
  terrains: number;
  duree_match: string;
  pdf_filename: string;
}

let deployTargetCache: string | null | undefined;

/** Détecte le service déployé (engine vs engine-v2) via l'API health. */
export async function fetchDeployTarget(): Promise<string | null> {
  if (deployTargetCache !== undefined) {
    return deployTargetCache;
  }

  for (const path of ["/api/health", "/api/v2/health"]) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const data = (await res.json()) as { deploy?: string };
      if (data.deploy) {
        deployTargetCache = data.deploy;
        return deployTargetCache;
      }
    } catch {
      /* service indisponible */
    }
  }

  deployTargetCache = null;
  return null;
}

export function isEngineV2Deploy(target: string | null): boolean {
  return target === "engine-v2";
}

export interface EngineV2PrepareResult {
  token: string;
  pdf_filename: string;
  template_id: string;
  page_map: LivePageMap;
  matches: LiveMatch[];
  fields: Record<string, string>;
  planning_layout: Record<string, LiveLayoutField[]>;
  meta: LiveTournamentMeta;
  nb_equipes: number;
}

export type EngineV2GeneratePhase = "prepare" | "capture" | "export";

export async function prepareTournamentV2(
  form: TournamentForm
): Promise<EngineV2PrepareResult> {
  if (!form.excelFile) throw new Error("Fichier Excel manquant.");

  const body = new FormData();
  appendTournamentFormFields(body, form);

  const res = await fetch("/api/v2/prepare", { method: "POST", body });
  if (!res.ok) throw new Error(await readError(res));

  const data = (await res.json()) as EngineV2PrepareResult;
  if (!data.token || !data.page_map || !data.template_id) {
    throw new Error("Réponse prepare V2 incomplète.");
  }
  return data;
}

async function exportTournamentV2WithCaptures(
  token: string,
  payload: {
    page_map: LivePageMap;
    template_id: string;
    matches: LiveMatch[];
    fields: Record<string, string>;
    planning_layout: Record<string, LiveLayoutField[]>;
    nb_equipes: number;
    crosspage_stubs?: Record<string, CrossPageStub>;
  },
  captures: Record<string, string>
): Promise<Blob> {
  const form = buildExportFormData(
    {
      ...payload,
      match_results: {},
      completed: [],
      crosspage_stubs: payload.crosspage_stubs ?? {},
    },
    captures
  );

  const res = await fetch(`/api/v2/export/${token}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await readError(res));
  return res.blob();
}

export async function generateTournamentV2(
  form: TournamentForm,
  capturePages: (prepared: EngineV2PrepareResult) => Promise<ManagerExportCapture>,
  onPhase?: (phase: EngineV2GeneratePhase) => void
): Promise<{
  blob: Blob;
  filename: string;
  notifyToken: string | null;
  liveSnapshotAvailable: boolean;
  prepared: EngineV2PrepareResult;
}> {
  onPhase?.("prepare");
  const prepared = await prepareTournamentV2(form);

  onPhase?.("capture");
  const { captures, crosspageStubs } = await capturePages(prepared);
  if (Object.keys(captures).length === 0) {
    throw new Error("Aucune capture Live n'a pu être générée.");
  }

  onPhase?.("export");
  const blob = await exportTournamentV2WithCaptures(
    prepared.token,
    {
      page_map: prepared.page_map,
      template_id: prepared.template_id,
      matches: prepared.matches,
      fields: prepared.fields,
      planning_layout: prepared.planning_layout,
      nb_equipes: prepared.nb_equipes,
      crosspage_stubs: crosspageStubs,
    },
    captures
  );

  return {
    blob,
    filename: prepared.pdf_filename,
    notifyToken: prepared.token,
    liveSnapshotAvailable: true,
    prepared,
  };
}

export function buildTournamentResume(
  form: TournamentForm,
  preview: PreviewResult | null,
  pdfFilename: string
): TournamentResume {
  const heures =
    form.heuresDebutJours.length === 0
      ? "—"
      : form.nbJours === 1
        ? form.heuresDebutJours[0]
        : form.heuresDebutJours
            .map((h, i) => `Jour ${i + 1} : ${h}`)
            .join(" · ");

  const mode =
    form.modeTournoi === "Élimination directe"
      ? "Tableau principal"
      : form.modeTournoi === "Poules + tableau final"
        ? "Poules + Tableau final"
        : form.modeTournoi;

  const [y, m, d] = form.dateTournoi.split("-");

  return {
    club: form.club,
    date: `${d}/${m}/${y}`,
    heures,
    type: `${form.typeTournoi} ${form.genreTournoi}`,
    nb_equipes: preview?.nb_equipes ?? "—",
    mode,
    jours: form.nbJours,
    terrains: form.nbTerrains,
    duree_match: `${form.dureeMatch} min`,
    pdf_filename: pdfFilename,
  };
}

async function readError(res: Response): Promise<string> {
  if (res.status === 405) {
    return (
      "L'API locale n'est pas à jour (route generate-live absente). " +
      "Fermez tous les terminaux du projet puis relancez ./scripts/run-local.sh."
    );
  }

  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return `Erreur ${res.status}`;
  }
}

export const EXPECTED_LIVE_API = "engine-pdf";

export interface ApiHealth {
  status: string;
  version?: string;
  live?: string;
}

export async function fetchApiHealth(): Promise<ApiHealth> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`API injoignable (${res.status}).`);
  return res.json();
}

export async function assertLiveApiReady(): Promise<void> {
  const health = await fetchApiHealth();
  if (health.live !== EXPECTED_LIVE_API) {
    const hint =
      health.live == null
        ? "LibreOffice est requis côté serveur pour le Manager live."
        : `Version live=${health.live}.`;
    throw new Error(
      `API obsolète (live=${health.live ?? "absent"}). ${hint} Relancez ./scripts/run-local.sh.`
    );
  }
}

export async function previewExcel(file: File): Promise<PreviewResult> {
  const body = new FormData();
  body.append("excel", file);

  const res = await fetch("/api/preview", { method: "POST", body });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

function appendTournamentFormFields(body: FormData, form: TournamentForm): void {
  body.append("excel", form.excelFile!);
  if (form.logoFile && !form.pasDeLogo) {
    body.append("logo", form.logoFile);
  }
  body.append("club", form.club);
  body.append("date_tournoi", form.dateTournoi);
  body.append("type_tournoi", form.typeTournoi);
  body.append("genre_tournoi", form.genreTournoi);
  body.append("mode_tournoi", form.modeTournoi);
  body.append("methode_poules", form.methodePoules);
  body.append("nb_jours", String(form.nbJours));
  body.append("heures_debut_jours", JSON.stringify(form.heuresDebutJours));
  body.append("duree_match", String(form.dureeMatch));
  body.append("terrains", JSON.stringify(form.terrains));
  body.append("terrain_principal", form.terrainPrincipal);
  if (form.formatMatchTableauPrincipal) {
    body.append(
      "format_match_tableau_principal",
      form.formatMatchTableauPrincipal
    );
  }
  body.append("format_match_classement", form.formatMatchClassement);
  body.append("format_match_finale", form.formatMatchFinale);
  body.append("format_match_poule", form.formatMatchPoule);
}

async function assertLivePdfAvailable(liveToken: string): Promise<void> {
  const res = await fetch(`/api/live/${liveToken}/status`);
  if (res.ok) return;
  if (res.status === 404) {
    throw new Error(
      "PDF live introuvable sur le serveur. Relancez la génération Manager live."
    );
  }
  throw new Error(await readError(res));
}

export async function generateLiveTournament(
  form: TournamentForm
): Promise<LiveTournamentData> {
  if (!form.excelFile) throw new Error("Fichier Excel manquant.");

  await assertLiveApiReady();

  // Étape 1 — identique à Engine (POST /api/generate), libère la RAM avant le live.
  const { notifyToken, filename } = await generateTournament(form);
  if (!notifyToken) {
    throw new Error(
      "Génération PDF Engine sans jeton. Relancez l'API ou réessayez."
    );
  }

  // Étape 2 — session live légère (Excel + cache template, pas de LibreOffice).
  const body = new FormData();
  body.append("pdf_token", notifyToken);
  body.append("pdf_filename", filename);
  appendTournamentFormFields(body, form);

  const res = await fetch("/api/live/init", { method: "POST", body });
  if (!res.ok) throw new Error(await readError(res));

  const data = normalizeLiveTournamentData(
    (await res.json()) as LiveTournamentData
  );

  if (!data.live_token || !data.page_map || !data.page_sizes) {
    throw new Error(
      "Réponse live incomplète. Vérifiez l'API et relancez la génération."
    );
  }

  await assertLivePdfAvailable(data.live_token);

  return data;
}

export async function generateTournament(
  form: TournamentForm
): Promise<{
  blob: Blob;
  filename: string;
  notifyToken: string | null;
  liveSnapshotAvailable: boolean;
}> {
  if (!form.excelFile) throw new Error("Fichier Excel manquant.");

  const body = new FormData();
  appendTournamentFormFields(body, form);

  const res = await fetch("/api/generate", { method: "POST", body });
  if (!res.ok) throw new Error(await readError(res));

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "tournoi.pdf";
  const notifyToken = res.headers.get("X-Notify-Token");
  const liveSnapshotAvailable =
    res.headers.get("X-Live-Snapshot-Available") === "1";
  return { blob, filename, notifyToken, liveSnapshotAvailable };
}

export async function initLiveFromPack(packFile: File): Promise<LiveTournamentData> {
  const body = new FormData();
  body.append("pack", packFile);

  let res: Response;
  try {
    res = await fetch("/api/live/init-from-pack", { method: "POST", body });
  } catch {
    throw new Error(
      "Connexion interrompue pendant l'import du pack. " +
        "Patientez quelques secondes et réessayez."
    );
  }
  if (!res.ok) throw new Error(await readError(res));

  const data = normalizeLiveTournamentData(
    (await res.json()) as LiveTournamentData
  );

  if (!data.live_token || !data.page_map || !data.page_sizes) {
    throw new Error(
      "Réponse live incomplète. Vérifiez le pack ZIP et réessayez."
    );
  }

  return data;
}

export async function downloadManagerLiveBundle(
  token: string,
  filename: string
): Promise<void> {
  const res = await fetch(`/api/notify/${token}/manager-live`);
  if (!res.ok) throw new Error(await readError(res));

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function notifyOwnerAfterDownload(
  token: string,
  resume: TournamentResume
): void {
  const body = new FormData();
  body.append("token", token);
  body.append("resume", JSON.stringify(resume));

  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon("/api/notify-owner", body);
    if (ok) return;
  }

  void fetch("/api/notify-owner", {
    method: "POST",
    body,
    keepalive: true,
  }).catch(() => {
    /* silencieux */
  });
}

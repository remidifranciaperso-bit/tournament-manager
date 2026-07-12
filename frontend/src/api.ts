import type { PreviewResult, TournamentForm } from "./types";
import type { LiveTournamentData } from "./manager/liveTypes";

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
  await assertLiveApiReady();

  const body = new FormData();
  body.append("pack", packFile);

  const res = await fetch("/api/live/init-from-pack", { method: "POST", body });
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

import type { PreviewResult, TournamentForm } from "./types";

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return `Erreur ${res.status}`;
  }
}

export async function previewExcel(file: File): Promise<PreviewResult> {
  const body = new FormData();
  body.append("excel", file);

  const res = await fetch("/api/preview", { method: "POST", body });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function generateTournament(
  form: TournamentForm
): Promise<{ blob: Blob; filename: string }> {
  if (!form.excelFile) throw new Error("Fichier Excel manquant.");

  const body = new FormData();
  body.append("excel", form.excelFile);
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

  const res = await fetch("/api/generate", { method: "POST", body });
  if (!res.ok) throw new Error(await readError(res));

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "tournoi.pdf";
  return { blob, filename };
}

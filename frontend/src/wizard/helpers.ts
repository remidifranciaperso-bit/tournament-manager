import type { Genre, TournamentForm } from "../types";

export function formatDateFr(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Club / terrains — toujours en majuscules (Engine V2 + Manager). */
export function normalizeUppercaseFields(
  partial: Partial<TournamentForm>
): Partial<TournamentForm> {
  const next: Partial<TournamentForm> = { ...partial };
  if (typeof partial.club === "string") {
    next.club = partial.club.toUpperCase();
  }
  if (Array.isArray(partial.terrains)) {
    next.terrains = partial.terrains.map((terrain) => terrain.toUpperCase());
  }
  if (typeof partial.terrainPrincipal === "string") {
    next.terrainPrincipal = partial.terrainPrincipal.toUpperCase();
  }
  return next;
}

export function syncTerrains(form: TournamentForm, nb: number): TournamentForm {
  const terrains = [...form.terrains];
  while (terrains.length < nb) terrains.push(`TERRAIN ${terrains.length + 1}`);
  while (terrains.length > nb) terrains.pop();
  const upperTerrains = terrains.map((terrain) => terrain.toUpperCase());
  const terrainPrincipal = upperTerrains.includes(form.terrainPrincipal.toUpperCase())
    ? form.terrainPrincipal.toUpperCase()
    : upperTerrains[0] ?? "TERRAIN 1";
  return { ...form, nbTerrains: nb, terrains: upperTerrains, terrainPrincipal };
}

export function syncHeures(form: TournamentForm, nbJours: number): TournamentForm {
  const heures = [...form.heuresDebutJours];
  while (heures.length < nbJours) {
    heures.push(heures.length === 0 ? "18:00" : "09:00");
  }
  while (heures.length > nbJours) heures.pop();
  return { ...form, nbJours, heuresDebutJours: heures };
}

export function poulesDisponibleFrom(nb: number) {
  return nb === 20 || nb === 24;
}

export function formatModeTournoi(mode: string) {
  if (mode === "Élimination directe") return "Tableau principal";
  if (mode === "Poules + tableau final") return "Poules + Tableau final";
  return mode;
}

export function formatHeuresDebut(form: TournamentForm) {
  if (form.heuresDebutJours.length === 0) return "—";
  if (form.nbJours === 1) return form.heuresDebutJours[0];
  return form.heuresDebutJours
    .map((h, i) => `Jour ${i + 1} : ${h}`)
    .join(" · ");
}

export function generationTagline(genre: Genre): string {
  return genre === "Femmes"
    ? "QUE LES MEILLEURES GAGNENT"
    : "QUE LES MEILLEURS GAGNENT";
}

export function participantsLabel(genre: Genre): string {
  return genre === "Femmes" ? "Participantes" : "Participants";
}

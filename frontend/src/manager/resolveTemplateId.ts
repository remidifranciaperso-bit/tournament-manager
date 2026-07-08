import type { LiveTournamentMeta } from "./liveTypes";

/** Identifiant du template PPTX (dossier ``live-templates/{id}``). */
export function resolveTemplateId(meta: LiveTournamentMeta): string {
  if (meta.mode_tournoi === "Poules + tableau final") {
    return `Template_${meta.nb_equipes}_poules_${meta.nb_jours}J`;
  }
  return `Template_${meta.nb_equipes}_${meta.nb_jours}J`;
}

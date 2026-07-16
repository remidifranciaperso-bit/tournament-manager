import { FORMATS_SUPPORTES } from "../types";

export const ENGINE_WELCOME_LEFT = [
  "Dossier tournoi complet",
  "Tableau de convocations",
  "Composition des poules",
  "Paramètres personnalisables",
  "Barèmes de points FFT intégrés",
];

export const ENGINE_WELCOME_RIGHT = [
  "Choix du format",
  "Placement des équipes",
  "Tirage au sort automatisé",
  "Planning de matchs intelligent",
  "PDF prêt à imprimer",
];

export const MANAGER_WELCOME_LEFT = [
  "Gestion live des matchs",
  "Saisie des scores en direct",
  "Suivi du tableau principal",
  "Tableaux de classement",
  "Barèmes de points FFT intégrés",
];

export const MANAGER_WELCOME_RIGHT = [
  "Matchs en cours",
  "File d'attente des matchs",
  "Planning dynamique",
  "Classement final",
  "Interface sans distraction",
];

/** Highlights communs Hub (écran d'accueil plateforme). */
export const HUB_COMMON_LEFT = [
  "Liste des participants et TS",
  "8/12/16/20/24 équipes",
  "TMC ou Poules",
  "Tirages au sort automatisés",
  "Placement des équipes",
  "Composition automatique des poules",
];

export const HUB_COMMON_RIGHT = [
  "Choix du format",
  "Paramètres personnalisables",
  "Planning des matchs optimisé",
  "Moteur intuitif",
  "Barèmes des points FFT intégrés",
];

export const HUB_ENGINE_LEFT = [
  "Import simple d'un fichier Excel",
  "Dossier tournoi complet",
  "PDF prêt à imprimer",
];

export const HUB_ENGINE_RIGHT = [
  "Convocations des équipes",
  "Tableaux pré-remplis",
  "Planning des matchs",
];

export const HUB_LIVE_ITEMS = [
  "Visu des matchs en cours et à suivre",
  "Saisie des scores (tous formats)",
  "Remplissage automatique des tableaux",
  "Planning dynamique",
  "Mode projection possible",
  "PDF téléchargeable en fin de tournoi",
];

export const MANAGER_WIZARD_STEPS = [
  { key: "participants", label: "Participants" },
  { key: "club", label: "Club" },
  { key: "identity", label: "Paramètres" },
  { key: "format", label: "Format" },
  { key: "planning", label: "Planning" },
  { key: "terrains", label: "Terrains" },
  { key: "summary", label: "Résumé" },
  { key: "generate", label: "Tournoi live" },
];

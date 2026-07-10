const ICONE_VAINQUEUR = "🏆 ";
const ICONE_PERDANT = "❌ ";

/** Formate un libellé d'équipe comme le moteur PPTX (``equipe_label_court``). */
export function formatTeamSlot(label: string): string {
  const text = label.trim();
  if (!text) return "—";

  if (text.startsWith("Vainqueur Poule ")) {
    return `1er ${text.replace("Vainqueur ", "")}:`;
  }
  if (text.startsWith("Deuxième Poule ") || text.startsWith("Second Poule ")) {
    return `2e ${text.replace(/^(Deuxième|Second) /, "")}:`;
  }
  if (text.startsWith("Troisième Poule ")) {
    return `3 ${text.replace("Troisième ", "")}:`;
  }
  if (text.startsWith("Vainqueur ")) {
    return `${ICONE_VAINQUEUR}${text.replace("Vainqueur ", "")}:`;
  }
  if (text.startsWith("Perdant ")) {
    return `${ICONE_PERDANT}${text.replace("Perdant ", "")}:`;
  }

  return text;
}

/** Libellé statique d'une balise WIN_/LOSE_/SECOND_/THIRD_. */
export function formatFeedKey(key: string): string {
  if (key.startsWith("WIN_")) {
    return `${ICONE_VAINQUEUR}${key.slice(4)}:`;
  }
  if (key.startsWith("LOSE_")) {
    return `${ICONE_PERDANT}${key.slice(5)}:`;
  }
  if (key.startsWith("SECOND_")) {
    return `2e ${key.slice(7)}:`;
  }
  if (key.startsWith("THIRD_")) {
    return `3 ${key.slice(6)}:`;
  }
  return key;
}

/** Déduit la clé WIN_/LOSE_ d'un libellé « Vainqueur H1 » / « Perdant Q2 ». */
export function feedKeyFromTeamLabel(label: string): string | null {
  const text = label.trim();
  const win = text.match(/^Vainqueur\s+(.+)$/i);
  if (win) return `WIN_${win[1].trim()}`;
  const lose = text.match(/^Perdant\s+(.+)$/i);
  if (lose) return `LOSE_${lose[1].trim()}`;
  const second = text.match(/^(?:Deuxième|Second)\s+(.+)$/i);
  if (second) return `SECOND_${second[1].trim()}`;
  const third = text.match(/^Troisième\s+(.+)$/i);
  if (third) return `THIRD_${third[1].trim()}`;
  return null;
}

const PLACEHOLDER_PREFIX =
  /^(Vainqueur|Perdant|Deuxième|Second|Troisième|🏆|❌|1er|2e|3 )/i;

export function isBracketPlaceholder(text: string): boolean {
  return PLACEHOLDER_PREFIX.test(text.trim());
}

/** « Jean DUPONT » → « J. DUPONT » (aligné sur ``Team._nom_court_joueur``). */
function shortPlayerName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return trimmed;

  const prenom = trimmed.slice(0, spaceIdx);
  const nom = trimmed.slice(spaceIdx + 1).trim();
  const initial = prenom[0]?.toUpperCase() ?? "";
  return initial ? `${initial}. ${nom}` : nom;
}

/**
 * Affichage bracket : initiales + nom + TS.
 * Ex. « Jean DUPONT / Marie MARTIN (TS1) » → « J. DUPONT / M. MARTIN (TS1) »
 */
export function formatTeamWithInitials(label: string): string {
  const text = label.trim();
  if (!text) return "—";

  if (PLACEHOLDER_PREFIX.test(text)) {
    return formatTeamSlot(text);
  }

  let seed = "";
  let body = text;
  const seedMatch = text.match(/(\(TS\d*\))\s*$/i);
  if (seedMatch) {
    seed = ` ${seedMatch[1]}`;
    body = text.slice(0, seedMatch.index).trim();
  }

  const parts = body.split(/\s*\/\s*/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts.map(shortPlayerName).join(" / ")}${seed}`;
  }

  return `${shortPlayerName(body)}${seed}`;
}

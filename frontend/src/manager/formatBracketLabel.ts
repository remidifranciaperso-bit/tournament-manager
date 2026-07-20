/** Vérification déploiement bundle export (grep Docker / health). */
export const EXPORT_CAPTURE_BUILD_MARKER = "export-capture-v2-20260720-uppercase-emoji";

const EMOJI_GAP = "\u2009";
const ICONE_VAINQUEUR = `🏆${EMOJI_GAP}`;
const ICONE_PERDANT = `❌${EMOJI_GAP}`;
const ICONE_POULE_1 = `🥇${EMOJI_GAP}`;
const ICONE_POULE_2 = `🥈${EMOJI_GAP}`;
const ICONE_POULE_3 = `🥉${EMOJI_GAP}`;

function ensurePlaceholderColon(text: string, icon: string): string {
  const body = text.slice(icon.length).trim().replace(/:$/, "");
  return body ? `${icon}${body}:` : `${icon}:`;
}

/** Formate un libellé d'équipe comme le moteur PPTX (``equipe_label_court``). */
export function formatTeamSlot(label: string): string {
  const text = label.trim();
  if (!text) return "—";

  if (text.startsWith(ICONE_VAINQUEUR)) {
    return ensurePlaceholderColon(text, ICONE_VAINQUEUR);
  }
  if (text.startsWith(ICONE_PERDANT)) {
    return ensurePlaceholderColon(text, ICONE_PERDANT);
  }
  if (text.startsWith(ICONE_POULE_1)) {
    return ensurePlaceholderColon(text, ICONE_POULE_1);
  }
  if (text.startsWith(ICONE_POULE_2)) {
    return ensurePlaceholderColon(text, ICONE_POULE_2);
  }
  if (text.startsWith(ICONE_POULE_3)) {
    return ensurePlaceholderColon(text, ICONE_POULE_3);
  }

  if (text.startsWith("Vainqueur Poule ")) {
    return `${ICONE_POULE_1}${text.replace("Vainqueur ", "")}:`;
  }
  if (text.startsWith("Deuxième Poule ") || text.startsWith("Second Poule ")) {
    return `${ICONE_POULE_2}${text.replace(/^(Deuxième|Second) /, "")}:`;
  }
  if (text.startsWith("Troisième Poule ")) {
    return `${ICONE_POULE_3}${text.replace("Troisième ", "")}:`;
  }
  if (text.startsWith("Vainqueur ")) {
    return `${ICONE_VAINQUEUR}${text.replace("Vainqueur ", "")}:`;
  }
  if (text.startsWith("Perdant ")) {
    return `${ICONE_PERDANT}${text.replace("Perdant ", "")}:`;
  }

  return text;
}

/** Affichage prochains matchs : emojis sans « : ». */
export function formatCourtTeamSlot(label: string): string {
  const text = label.trim();
  if (!text) return "—";

  if (text.startsWith("Vainqueur Poule ")) {
    return `${ICONE_POULE_1}${text.replace("Vainqueur ", "")}`;
  }
  if (text.startsWith("Deuxième Poule ") || text.startsWith("Second Poule ")) {
    return `${ICONE_POULE_2}${text.replace(/^(Deuxième|Second) /, "")}`;
  }
  if (text.startsWith("Troisième Poule ")) {
    return `${ICONE_POULE_3}${text.replace("Troisième ", "")}`;
  }
  if (text.startsWith("Vainqueur ")) {
    return `${ICONE_VAINQUEUR}${text.replace("Vainqueur ", "")}`;
  }
  if (text.startsWith("Perdant ")) {
    return `${ICONE_PERDANT}${text.replace("Perdant ", "")}`;
  }

  return text.replace(/:$/, "");
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

/**
 * Normalise un code de balise vers la convention des templates (majuscules,
 * underscores). « H1 » → « H1 » ; « Poule A » → « POULE_A » (clé feed
 * ``WIN_POULE_A``/``SECOND_POULE_A`` des tableaux à poules).
 */
function normalizeFeedCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

/** Déduit la clé WIN_/LOSE_ d'un libellé « Vainqueur H1 » / « Perdant Q2 ». */
export function feedKeyFromTeamLabel(label: string): string | null {
  const text = label.trim();
  const win = text.match(/^Vainqueur\s+(.+)$/i);
  if (win) return `WIN_${normalizeFeedCode(win[1])}`;
  const lose = text.match(/^Perdant\s+(.+)$/i);
  if (lose) return `LOSE_${normalizeFeedCode(lose[1])}`;
  const second = text.match(/^(?:Deuxième|Second)\s+(.+)$/i);
  if (second) return `SECOND_${normalizeFeedCode(second[1])}`;
  const third = text.match(/^Troisième\s+(.+)$/i);
  if (third) return `THIRD_${normalizeFeedCode(third[1])}`;
  return null;
}

const PLACEHOLDER_PREFIX =
  /^(Vainqueur|Perdant|Deuxième|Second|Troisième|🏆|❌|🥇|🥈|🥉|1er|2e|3 )/i;

export function isBracketPlaceholder(text: string): boolean {
  return PLACEHOLDER_PREFIX.test(text.trim());
}

function isUnresolvedPlaceholder(text: string): boolean {
  const trimmed = text.trim();
  return (
    isBracketPlaceholder(trimmed) ||
    /^Vainqueur\s+/i.test(trimmed) ||
    /^Perdant\s+/i.test(trimmed)
  );
}

export function isUnresolvedTeamLabel(text: string): boolean {
  return isUnresolvedPlaceholder(text);
}

/** Affichage boîte match / planning — initiales ou placeholder V1 (🏆 H3:). */
export function formatBracketTeamDisplay(label: string, resolved: string): string {
  const raw = label.trim();
  if (!raw) return "—";
  if (
    resolved !== raw &&
    resolved.trim() &&
    !isUnresolvedPlaceholder(resolved)
  ) {
    return ensureTeamTsSuffix(formatTeamWithInitials(resolved), [
      raw,
      resolved,
    ]);
  }
  if (isUnresolvedPlaceholder(raw)) {
    return formatTeamSlot(raw);
  }
  return ensureTeamTsSuffix(formatTeamWithInitials(resolved.trim() || raw), [
    raw,
    resolved,
  ]);
}

/** Réinjecte (TSn) si le libellé source l'avait mais l'affichage boîte l'a perdu (truncate). */
export function ensureTeamTsSuffix(
  display: string,
  sourceLabels: string[]
): string {
  if (/\(TS\d+\)/i.test(display)) return display;
  for (const source of sourceLabels) {
    const match = source.trim().match(/(\(TS\d+\))/i);
    if (match) {
      return `${display} ${match[1]}`.trim();
    }
  }
  return display;
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

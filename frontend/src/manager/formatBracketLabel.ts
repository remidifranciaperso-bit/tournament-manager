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
    return `Gagnants ${text.replace("Vainqueur ", "")}:`;
  }
  if (text.startsWith("Perdant ")) {
    return `Perdants ${text.replace("Perdant ", "")}:`;
  }

  return text;
}

/** Libellé statique d'une balise WIN_/LOSE_/SECOND_/THIRD_. */
export function formatFeedKey(key: string): string {
  if (key.startsWith("WIN_")) {
    return `Gagnants ${key.slice(4)}:`;
  }
  if (key.startsWith("LOSE_")) {
    return `Perdants ${key.slice(5)}:`;
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

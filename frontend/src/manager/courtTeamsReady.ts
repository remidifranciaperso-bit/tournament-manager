import { isBracketPlaceholder } from "./formatBracketLabel";

/** Les deux binômes sont connus (pas de Vainqueur/Perdant/placeholder). */
export function areCourtTeamsKnown(equipe1: string, equipe2: string): boolean {
  const team1 = equipe1.trim();
  const team2 = equipe2.trim();
  if (!team1 || !team2 || team1 === "—" || team2 === "—") return false;
  if (isBracketPlaceholder(team1) || isBracketPlaceholder(team2)) return false;
  return true;
}

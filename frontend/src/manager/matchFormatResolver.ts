import type { MatchFormatCode } from "./matchFormats";
import type { LiveMatch, LiveTournamentMeta } from "./liveTypes";

export type MatchFormatCategory =
  | "tableau_principal"
  | "classement"
  | "finale"
  | "poule";

export function matchFormatCategory(tour: string): MatchFormatCategory {
  const normalized = tour.trim().toLowerCase();

  if (normalized.startsWith("poule")) return "poule";
  if (normalized.startsWith("classement")) return "classement";
  if (normalized === "finale") return "finale";
  return "tableau_principal";
}

export function resolveFormatForMatch(
  match: Pick<LiveMatch, "tour">,
  meta: LiveTournamentMeta
): MatchFormatCode {
  const formats = meta.formats_match;
  const fallback =
    (meta.format_match_tableau_principal as MatchFormatCode | null) ?? "A1";

  if (!formats) return fallback;

  const category = matchFormatCategory(match.tour);

  switch (category) {
    case "poule":
      return (formats.poule as MatchFormatCode | null) ?? fallback;
    case "classement":
      return formats.classement as MatchFormatCode;
    case "finale":
      return formats.finale as MatchFormatCode;
    default:
      return formats.tableau_principal as MatchFormatCode;
  }
}

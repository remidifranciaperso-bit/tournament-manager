/** Libellé brush des places en jeu (ex. 1-2, 5-6) depuis le champ tour. */
export function matchPlacementLabel(tour: string): string | null {
  const normalized = tour.trim().toLowerCase();

  if (normalized === "finale") return "1-2";
  if (normalized === "petite finale") return "3-4";

  const match = tour.match(/classement\s+(\d+)\s*-\s*(\d+)/i);
  if (!match) return null;

  const winnerPlace = Number.parseInt(match[1], 10);
  const loserPlace = Number.parseInt(match[2], 10);

  if (loserPlace - winnerPlace !== 1) return null;

  return `${winnerPlace}-${loserPlace}`;
}

export function parsePlacementTour(
  tour: string
): { winnerPlace: number; loserPlace: number } | null {
  const label = matchPlacementLabel(tour);
  if (!label) return null;

  const [winnerPlace, loserPlace] = label.split("-").map((value) =>
    Number.parseInt(value, 10)
  );

  return { winnerPlace, loserPlace };
}

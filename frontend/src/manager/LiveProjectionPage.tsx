import type { ReactNode } from "react";
import { LiveClubFooter } from "./LiveClubFooter";

/** Répartition verticale : contenu terrains (2) / bande logo (1). */
const PROJECTION_CONTENT_SHARE = 2;
const PROJECTION_LOGO_SHARE = 1;

interface LiveProjectionPageProps {
  children: ReactNode;
  club: string;
  logoUrl?: string | null;
}

/** Onglets projection (terrains, avancement) : contenu + pied de page club. */
export function LiveProjectionPage({
  children,
  club,
  logoUrl,
}: LiveProjectionPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        className="flex min-h-0 flex-col overflow-hidden"
        style={{ flex: PROJECTION_CONTENT_SHARE }}
      >
        {children}
      </div>
      <div
        className="flex min-h-0 flex-col items-center justify-end overflow-hidden"
        style={{ flex: PROJECTION_LOGO_SHARE }}
      >
        <LiveClubFooter club={club} logoUrl={logoUrl} />
      </div>
    </div>
  );
}

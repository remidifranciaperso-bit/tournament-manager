import type { ReactNode } from "react";
import { LiveClubFooter } from "./LiveClubFooter";

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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      <LiveClubFooter club={club} logoUrl={logoUrl} />
    </div>
  );
}

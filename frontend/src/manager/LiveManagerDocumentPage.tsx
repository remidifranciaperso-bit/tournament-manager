import type { ReactNode } from "react";
import { LiveClubFooter } from "./LiveClubFooter";

interface LiveManagerDocumentPageProps {
  children: ReactNode;
  club: string;
  logoUrl?: string | null;
  capture?: "bracket" | "final";
}

/** Page document Manager : contenu + pied de page club (tableaux, planning, classement final). */
export function LiveManagerDocumentPage({
  children,
  club,
  logoUrl,
  capture,
}: LiveManagerDocumentPageProps) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      {...(capture ? { "data-export-capture": capture } : {})}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      <LiveClubFooter club={club} logoUrl={logoUrl} />
    </div>
  );
}

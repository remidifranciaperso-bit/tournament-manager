import type { ReactNode } from "react";
import { LiveClubFooter } from "./LiveClubFooter";

interface LiveManagerDocumentPageProps {
  children: ReactNode;
  club: string;
  logoUrl?: string | null;
  capture?: "bracket" | "final" | "planning";
  showFooter?: boolean;
}

/** Page document Manager : contenu + pied de page club (tableaux, planning, classement final). */
export function LiveManagerDocumentPage({
  children,
  club,
  logoUrl,
  capture,
  showFooter = true,
}: LiveManagerDocumentPageProps) {
  const exportMode = Boolean(capture);

  return (
    <div
      className={
        exportMode
          ? "inline-flex w-full flex-col items-stretch bg-white"
          : "flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
      }
      {...(capture ? { "data-export-capture": capture } : {})}
    >
      <div
        className={
          exportMode
            ? "shrink-0"
            : "flex min-h-0 flex-1 flex-col overflow-hidden"
        }
      >
        {children}
      </div>
      {showFooter ? <LiveClubFooter club={club} logoUrl={logoUrl} /> : null}
    </div>
  );
}

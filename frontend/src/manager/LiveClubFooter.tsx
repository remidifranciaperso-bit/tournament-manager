import { useState } from "react";
import { LIVE_LOGO_HEIGHT_CLASS, LIVE_LOGO_MAX_WIDTH_CLASS } from "./LiveTabTitle";

interface LiveClubFooterProps {
  club: string;
  logoUrl?: string | null;
}

/** Pied de page club — aligné sur le footer Engine (logo ou nom du club). */
export function LiveClubFooter({ club, logoUrl }: LiveClubFooterProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const clubLabel = club.trim();
  const showLogo = Boolean(logoUrl) && !logoFailed;

  if (!clubLabel && !showLogo) return null;

  return (
    <div
      className="flex shrink-0 items-center justify-center bg-white px-4 py-2"
      style={{ minHeight: "2.9%" }}
      data-club-footer
    >
      {showLogo ? (
        <img
          src={logoUrl!}
          alt={clubLabel || "Logo club"}
          className={`${LIVE_LOGO_HEIGHT_CLASS} w-auto ${LIVE_LOGO_MAX_WIDTH_CLASS} object-contain object-center`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <p className="max-w-[34%] truncate text-center font-noto text-xs font-medium text-arena-700 sm:text-sm">
          {clubLabel}
        </p>
      )}
    </div>
  );
}

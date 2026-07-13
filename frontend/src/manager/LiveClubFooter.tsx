import { useEffect, useState } from "react";
import { LIVE_LOGO_HEIGHT_CLASS, LIVE_LOGO_MAX_WIDTH_CLASS } from "./LiveTabTitle";

interface LiveClubFooterProps {
  club: string;
  logoUrl?: string | null;
}

function ClubNameLabel({ label }: { label: string }) {
  return (
    <p className="max-w-[min(92vw,36rem)] px-2 text-center font-noto text-xs font-medium leading-snug text-arena-700 sm:text-sm">
      {label}
    </p>
  );
}

/** Pied de page club — aligné sur le footer Engine (logo ou nom du club). */
export function LiveClubFooter({ club, logoUrl }: LiveClubFooterProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const clubLabel = club.trim();
  const canTryLogo = Boolean(logoUrl) && !logoFailed;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  if (!clubLabel && !canTryLogo) return null;

  return (
    <div
      className="flex shrink-0 items-center justify-center bg-white px-4 py-2"
      style={{ minHeight: "2.9%" }}
      data-club-footer
    >
      {canTryLogo ? (
        <img
          src={logoUrl!}
          alt={clubLabel || "Logo club"}
          decoding="async"
          className={`${LIVE_LOGO_HEIGHT_CLASS} w-auto ${LIVE_LOGO_MAX_WIDTH_CLASS} object-contain object-center`}
          onError={() => setLogoFailed(true)}
        />
      ) : clubLabel ? (
        <ClubNameLabel label={clubLabel} />
      ) : null}
    </div>
  );
}

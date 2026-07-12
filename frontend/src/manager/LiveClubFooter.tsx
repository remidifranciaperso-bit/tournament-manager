import { LIVE_LOGO_HEIGHT_CLASS, LIVE_LOGO_MAX_WIDTH_CLASS } from "./LiveTabTitle";

interface LiveClubFooterProps {
  club: string;
  logoUrl?: string | null;
}

/** Pied de page club — aligné sur le footer Engine (logo ou nom du club). */
export function LiveClubFooter({ club, logoUrl }: LiveClubFooterProps) {
  if (!club.trim() && !logoUrl) return null;

  return (
    <div
      className="flex shrink-0 items-center justify-center bg-white px-4 py-2"
      style={{ minHeight: "2.9%" }}
      data-club-footer
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className={`${LIVE_LOGO_HEIGHT_CLASS} w-auto ${LIVE_LOGO_MAX_WIDTH_CLASS} object-contain object-center`}
        />
      ) : (
        <p className="max-w-[34%] truncate text-center font-noto text-xs font-medium text-arena-700 sm:text-sm">
          {club}
        </p>
      )}
    </div>
  );
}

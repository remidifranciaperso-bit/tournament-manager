interface LiveClubFooterProps {
  club: string;
  logoUrl?: string | null;
}

/** Pied de page club — aligné sur le footer Engine (logo ou nom du club). */
export function LiveClubFooter({ club, logoUrl }: LiveClubFooterProps) {
  if (!club.trim()) return null;

  return (
    <div
      className="flex shrink-0 items-center justify-center bg-white px-4 py-2"
      style={{ minHeight: "2.9%" }}
      data-club-footer
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={club}
          className="max-h-7 w-auto max-w-[24%] object-contain sm:max-h-8"
        />
      ) : (
        <p className="max-w-[34%] truncate text-center font-noto text-xs font-medium text-arena-700 sm:text-sm">
          {club}
        </p>
      )}
    </div>
  );
}

import { useMemo, useState, type ReactNode } from "react";
import { PadelCourtOutline } from "../components/CourtBackground";
import type { CourtMatchDisplay } from "./liveCourtMatches";
import { parseTeamLabel, type ParsedTeam } from "./parseTeamLabel";

export const COURT_WIDTH_PX = 280;
export const COURT_HEIGHT_PX = 560;

function TeamBadge({ team }: { team: ParsedTeam }) {
  return (
    <div className="max-w-[92%] rounded-lg border border-white/30 bg-arena-950/80 px-2.5 py-2 text-center shadow-sm">
      <p className="text-[14px] font-medium leading-snug text-white sm:text-[15px]">
        {team.player1}
      </p>
      {team.player2 && (
        <p className="mt-0.5 text-[14px] font-medium leading-snug text-white sm:text-[15px]">
          {team.player2}
        </p>
      )}
      {team.seed && (
        <p className="mt-1 text-[14px] font-semibold uppercase tracking-wide text-lime/90 sm:text-[15px]">
          {team.seed}
        </p>
      )}
    </div>
  );
}

interface LiveCourtCardProps {
  terrainName: string;
  match: CourtMatchDisplay | null;
  footer?: ReactNode;
  emptyLabel?: string;
}

export function LiveCourtCard({
  terrainName,
  match,
  footer,
  emptyLabel = "Aucun match",
}: LiveCourtCardProps) {
  const equipe1 = useMemo(
    () => (match ? parseTeamLabel(match.equipe1) : null),
    [match]
  );
  const equipe2 = useMemo(
    () => (match ? parseTeamLabel(match.equipe2) : null),
    [match]
  );

  return (
    <div className="flex shrink-0 flex-col items-center">
      <p className="field-label-section mb-3 max-w-[280px] truncate px-1 text-center">
        {terrainName}
      </p>
      <div
        className="relative shrink-0"
        style={{
          width: COURT_WIDTH_PX,
          height: COURT_HEIGHT_PX,
        }}
      >
        <PadelCourtOutline className="h-full w-full" />

        {match && equipe1 && equipe2 ? (
          <>
            <div className="absolute inset-x-0 top-0 z-10 flex h-1/2 items-center justify-center px-2">
              <TeamBadge team={equipe1} />
            </div>

            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <span className="rounded-full border border-lime/35 bg-arena-950/85 px-2.5 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-lime sm:text-base">
                vs
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 flex h-1/2 items-center justify-center px-2">
              <TeamBadge team={equipe2} />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <p className="text-center text-sm text-white/35">{emptyLabel}</p>
          </div>
        )}
      </div>
      {footer}
    </div>
  );
}

interface LiveCourtsRowProps {
  terrains: string[];
  matchByTerrain: Map<string, CourtMatchDisplay | null>;
  renderFooter?: (terrain: string, match: CourtMatchDisplay | null) => ReactNode;
  emptyLabel?: string;
}

export function LiveCourtsRow({
  terrains,
  matchByTerrain,
  renderFooter,
  emptyLabel,
}: LiveCourtsRowProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-x-auto overscroll-x-contain px-4 py-6 sm:px-8">
      <div className="flex shrink-0 items-start justify-center gap-8 sm:gap-12">
        {terrains.map((name) => {
          const match = matchByTerrain.get(name) ?? null;
          return (
            <LiveCourtCard
              key={name}
              terrainName={name}
              match={match}
              emptyLabel={emptyLabel}
              footer={renderFooter?.(name, match)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function useScoreFormToggle() {
  const [openTerrain, setOpenTerrain] = useState<string | null>(null);

  return {
    openTerrain,
    open: (terrain: string) => setOpenTerrain(terrain),
    close: () => setOpenTerrain(null),
    isOpen: (terrain: string) => openTerrain === terrain,
  };
}

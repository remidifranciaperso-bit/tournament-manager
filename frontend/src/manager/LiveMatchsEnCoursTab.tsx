import { useMemo } from "react";
import { PadelCourtOutline } from "../components/CourtBackground";
import { firstMatchByTerrain } from "./liveCourtMatches";
import type { LiveMatch } from "./liveTypes";

/** Taille fixe des terrains (10×20 m → ratio 1:2), indépendante du nombre. */
const COURT_WIDTH_PX = 280;
const COURT_HEIGHT_PX = 560;

interface LiveMatchsEnCoursTabProps {
  terrains: string[];
  matches: LiveMatch[];
  started: boolean;
  onStart: () => void;
}

function TeamBadge({ name }: { name: string }) {
  return (
    <div className="max-w-[92%] rounded-lg border border-white/30 bg-arena-950/80 px-2.5 py-1.5 text-center text-[10px] font-medium leading-snug text-white shadow-sm sm:text-[11px]">
      {name}
    </div>
  );
}

function LiveCourtCard({
  terrainName,
  match,
}: {
  terrainName: string;
  match: { equipe1: string; equipe2: string } | null;
}) {
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

        {match && (
          <>
            <div className="absolute left-1/2 top-[10%] z-10 flex w-full -translate-x-1/2 justify-center px-2">
              <TeamBadge name={match.equipe1} />
            </div>

            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <span className="rounded-full border border-lime/35 bg-arena-950/85 px-2.5 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-lime sm:text-base">
                vs
              </span>
            </div>

            <div className="absolute bottom-[10%] left-1/2 z-10 flex w-full -translate-x-1/2 justify-center px-2">
              <TeamBadge name={match.equipe2} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function LiveMatchsEnCoursTab({
  terrains,
  matches,
  started,
  onStart,
}: LiveMatchsEnCoursTabProps) {
  const matchByTerrain = useMemo(
    () => firstMatchByTerrain(matches, terrains),
    [matches, terrains]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {started ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-x-auto overscroll-x-contain px-4 py-6 sm:px-8">
          <div className="flex shrink-0 items-end justify-center gap-8 sm:gap-12">
            {terrains.map((name) => (
              <LiveCourtCard
                key={name}
                terrainName={name}
                match={matchByTerrain.get(name) ?? null}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1" aria-hidden />
      )}

      {!started && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-arena-950/55 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={onStart}
            className="rounded-2xl border border-lime/25 bg-arena-900/80 px-8 py-6 text-center transition hover:border-lime/45 hover:bg-arena-900/95 sm:px-12 sm:py-8"
          >
            <span
              className="font-brush text-[clamp(2rem,8vw,3.5rem)] leading-none text-lime"
              style={{ textShadow: "0 0 32px rgba(212,255,74,0.2)" }}
            >
              Commencer le tournoi
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

import { PadelCourtOutline } from "../components/CourtBackground";

/** Taille fixe des terrains (10×20 m → ratio 1:2), indépendante du nombre. */
const COURT_WIDTH_PX = 200;
const COURT_HEIGHT_PX = 400;

interface LiveMatchsEnCoursTabProps {
  terrains: string[];
  started: boolean;
  onStart: () => void;
}

export function LiveMatchsEnCoursTab({
  terrains,
  started,
  onStart,
}: LiveMatchsEnCoursTabProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {started ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-x-auto overscroll-x-contain px-4 py-6 sm:px-8">
          <div className="flex shrink-0 items-end justify-center gap-8 sm:gap-12">
            {terrains.map((name) => (
              <div
                key={name}
                className="flex shrink-0 flex-col items-center"
              >
                <p className="field-label-section mb-3 max-w-[200px] truncate px-1 text-center">
                  {name}
                </p>
                <div
                  className="shrink-0"
                  style={{
                    width: COURT_WIDTH_PX,
                    height: COURT_HEIGHT_PX,
                  }}
                >
                  <PadelCourtOutline className="h-full w-full" />
                </div>
              </div>
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

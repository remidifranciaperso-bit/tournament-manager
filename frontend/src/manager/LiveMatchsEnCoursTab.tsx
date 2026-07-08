import { PadelCourtOutline } from "../components/CourtBackground";

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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-8 sm:gap-y-8">
            {terrains.map((name) => (
              <div
                key={name}
                className="flex min-w-0 flex-col items-center justify-start"
              >
                <p className="field-label-section mb-2 max-w-full truncate px-1">
                  {name}
                </p>
                <div className="h-[min(30vh,200px)] w-full max-w-[140px] aspect-[1/2] sm:max-w-[160px]">
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

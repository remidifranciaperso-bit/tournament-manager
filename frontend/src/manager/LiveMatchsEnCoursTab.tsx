import { useMemo } from "react";
import { LiveCourtsRow, useScoreFormToggle } from "./LiveCourtCard";
import { MatchScoreForm } from "./MatchScoreForm";
import { matchQueuesByTerrain } from "./liveCourtMatches";
import { resolveFormatForMatch } from "./matchFormatResolver";
import type { LiveMatch, LiveTournamentMeta } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

interface LiveMatchsEnCoursTabProps {
  terrains: string[];
  matches: LiveMatch[];
  meta: LiveTournamentMeta;
  started: boolean;
  completed: Set<string>;
  onStart: () => void;
  onCompleteMatch: (
    code: string,
    score: Omit<StoredMatchResult, "code" | "validatedAt">
  ) => void;
}

export function LiveMatchsEnCoursTab({
  terrains,
  matches,
  meta,
  started,
  completed,
  onStart,
  onCompleteMatch,
}: LiveMatchsEnCoursTabProps) {
  const scoreForm = useScoreFormToggle();

  const { current: matchByTerrain } = useMemo(
    () => matchQueuesByTerrain(matches, terrains, completed),
    [matches, terrains, completed]
  );

  const matchLookup = useMemo(() => {
    const map = new Map<string, LiveMatch>();
    for (const match of matches) map.set(match.code, match);
    return map;
  }, [matches]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {started ? (
        <LiveCourtsRow
          terrains={terrains}
          matchByTerrain={matchByTerrain}
          emptyLabel="Terrain libre"
          renderFooter={(terrain, match) => {
            if (!match) return null;

            const liveMatch = matchLookup.get(match.code);
            const format = liveMatch
              ? resolveFormatForMatch(liveMatch, meta)
              : "A1";

            if (scoreForm.isOpen(terrain)) {
              return (
                <MatchScoreForm
                  format={format}
                  equipe1={match.equipe1}
                  equipe2={match.equipe2}
                  onCancel={scoreForm.close}
                  onSubmit={(score) => {
                    onCompleteMatch(match.code, score);
                    scoreForm.close();
                  }}
                />
              );
            }

            return (
              <button
                type="button"
                onClick={() => scoreForm.open(terrain)}
                className="mt-3 w-full max-w-[280px] rounded-xl border border-lime/30 bg-lime/10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-lime transition hover:bg-lime/20"
              >
                Saisir le score
              </button>
            );
          }}
        />
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

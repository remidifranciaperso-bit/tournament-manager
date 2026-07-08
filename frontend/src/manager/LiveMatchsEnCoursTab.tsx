import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchFormatCode } from "./matchFormats";
import {
  LiveCourtsRow,
  useScoreFormToggle,
  type CourtScoringState,
} from "./LiveCourtCard";
import { matchQueuesByTerrain } from "./liveCourtMatches";
import { resolveFormatForMatch } from "./matchFormatResolver";
import { parseTeamLabel } from "./parseTeamLabel";
import type { LiveMatch, LiveTournamentMeta } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import { useMatchScoreDraft } from "./useMatchScoreDraft";
import type { ValidatedMatchScore } from "./matchScoreRules";

interface ScoringBridgeProps {
  format: MatchFormatCode;
  equipe1: string;
  equipe2: string;
  onChange: (
    scoring: CourtScoringState,
    submit: () => ValidatedMatchScore | null
  ) => void;
}

function ScoringBridge({
  format,
  equipe1,
  equipe2,
  onChange,
}: ScoringBridgeProps) {
  const draft = useMatchScoreDraft(format);

  const winnerTeam = useMemo(() => {
    if (!draft.validatedScore) return null;
    const label =
      draft.validatedScore.winner === 1 ? equipe1 : equipe2;
    return parseTeamLabel(label);
  }, [draft.validatedScore, equipe1, equipe2]);

  useEffect(() => {
    onChange(
      {
        format,
        sets: draft.sets,
        activeSetIndex: draft.activeSetIndex,
        setCount: draft.setCount,
        winnerTeam,
        onSetChange: draft.setActiveSetIndex,
        onGamesChange: draft.updateGames,
      },
      draft.submit
    );
  }, [
    format,
    draft.sets,
    draft.activeSetIndex,
    draft.setCount,
    draft.setActiveSetIndex,
    draft.updateGames,
    draft.submit,
    winnerTeam,
    onChange,
  ]);

  return null;
}

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
  const [scoringState, setScoringState] = useState<CourtScoringState | null>(
    null
  );
  const [submitScore, setSubmitScore] = useState<
    (() => ValidatedMatchScore | null) | null
  >(null);

  const { current: matchByTerrain } = useMemo(
    () => matchQueuesByTerrain(matches, terrains, completed),
    [matches, terrains, completed]
  );

  const matchLookup = useMemo(() => {
    const map = new Map<string, LiveMatch>();
    for (const match of matches) map.set(match.code, match);
    return map;
  }, [matches]);

  const openTerrain = scoreForm.openTerrain;
  const openMatch = openTerrain
    ? matchByTerrain.get(openTerrain) ?? null
    : null;
  const openLiveMatch = openMatch
    ? matchLookup.get(openMatch.code)
    : undefined;
  const openFormat: MatchFormatCode = openLiveMatch
    ? resolveFormatForMatch(openLiveMatch, meta)
    : "A1";

  const closeScoring = () => {
    scoreForm.close();
    setScoringState(null);
    setSubmitScore(null);
  };

  const handleScoringChange = useCallback(
    (
      scoring: CourtScoringState,
      submit: () => ValidatedMatchScore | null
    ) => {
      setScoringState(scoring);
      setSubmitScore(() => submit);
    },
    []
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {openTerrain && openMatch && (
        <ScoringBridge
          key={`${openTerrain}-${openMatch.code}`}
          format={openFormat}
          equipe1={openMatch.equipe1}
          equipe2={openMatch.equipe2}
          onChange={handleScoringChange}
        />
      )}

      {started ? (
        <LiveCourtsRow
          terrains={terrains}
          matchByTerrain={matchByTerrain}
          emptyLabel="Terrain libre"
          getScoring={(terrain) =>
            scoreForm.isOpen(terrain) ? scoringState ?? undefined : undefined
          }
          renderFooter={(terrain, match) => {
            if (!match) return null;

            if (scoreForm.isOpen(terrain)) {
              const isValid = Boolean(scoringState?.winnerTeam);

              return (
                <div className="mt-3 flex w-full max-w-[280px] flex-col gap-1.5">
                  <button
                    type="button"
                    disabled={!isValid}
                    onClick={() => {
                      const result = submitScore?.();
                      if (!result) return;
                      onCompleteMatch(match.code, result);
                      closeScoring();
                    }}
                    className={[
                      "w-full rounded-xl border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition",
                      isValid
                        ? "border-lime/35 bg-lime/10 text-lime hover:bg-lime/20"
                        : "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/30",
                    ].join(" ")}
                  >
                    Valider le score
                  </button>
                  <button
                    type="button"
                    onClick={closeScoring}
                    className="text-center text-[10px] uppercase tracking-wide text-white/35 transition hover:text-white/55"
                  >
                    Annuler
                  </button>
                </div>
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

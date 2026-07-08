import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchFormatCode } from "./matchFormats";
import {
  CourtFooterSlot,
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
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
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
          theme="light"
          getScoring={(terrain) =>
            scoreForm.isOpen(terrain) ? scoringState ?? undefined : undefined
          }
          renderFooter={(terrain, match) => {
            if (!match) return <CourtFooterSlot />;

            if (scoreForm.isOpen(terrain)) {
              const isValid = Boolean(scoringState?.winnerTeam);

              return (
                <CourtFooterSlot>
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
                      "flex min-h-[41px] w-full items-center justify-center rounded-xl border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition",
                      isValid
                        ? "border-arena-600/35 bg-arena-600/10 text-arena-700 hover:bg-arena-600/15"
                        : "cursor-not-allowed border-arena-600/10 bg-arena-600/[0.03] text-arena-600/30",
                    ].join(" ")}
                  >
                    Valider le score
                  </button>
                  <button
                    type="button"
                    onClick={closeScoring}
                    className="text-center text-[10px] uppercase tracking-wide text-arena-600/45 transition hover:text-arena-700"
                  >
                    Annuler
                  </button>
                </CourtFooterSlot>
              );
            }

            return (
              <CourtFooterSlot>
                <button
                  type="button"
                  onClick={() => scoreForm.open(terrain)}
                  className="flex min-h-[41px] w-full items-center justify-center rounded-xl border border-arena-600/30 bg-arena-600/10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-arena-700 transition hover:bg-arena-600/15"
                >
                  Saisir le score
                </button>
              </CourtFooterSlot>
            );
          }}
        />
      ) : (
        <div className="min-h-0 flex-1" aria-hidden />
      )}

      {!started && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={onStart}
            className="rounded-2xl border border-arena-600/25 bg-white px-8 py-6 text-center shadow-md transition hover:border-arena-600/45 hover:shadow-lg sm:px-12 sm:py-8"
          >
            <span
              className="font-brush text-[clamp(2rem,8vw,3.5rem)] leading-none text-arena-700"
              style={{ textShadow: "0 0 24px rgba(26,58,92,0.12)" }}
            >
              Commencer le tournoi
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

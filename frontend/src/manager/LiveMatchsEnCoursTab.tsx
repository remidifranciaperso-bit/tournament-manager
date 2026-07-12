import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchFormatCode } from "./matchFormats";
import {
  CourtFooterSlot,
  LiveCourtsRow,
  useScoreFormToggle,
  type CourtScoringState,
} from "./LiveCourtCard";
import { matchQueuesByTerrain, type CourtMatchDisplay } from "./liveCourtMatches";
import { areCourtTeamsKnown, canLaunchNextMatch, TEAMS_UNAVAILABLE_MESSAGE } from "./courtTeamsReady";
import { resolveFormatForMatch } from "./matchFormatResolver";
import { parseTeamLabel } from "./parseTeamLabel";
import type { LiveMatch, LiveTournamentMeta } from "./liveTypes";
import { downloadTournamentExportPdf, type LivePdfExportPayload } from "./LivePdfViewer";
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
  matchResults: Record<string, StoredMatchResult>;
  liveToken: string;
  pdfFilename: string;
  exportPayload: LivePdfExportPayload;
  captureExportPages: () => Promise<Record<string, string>>;
  exportingPdf: boolean;
  onExportPhaseChange: (phase: ExportPhase) => void;
  onStart: () => void;
  onCompleteMatch: (
    code: string,
    score: Omit<StoredMatchResult, "code" | "validatedAt">
  ) => void;
  awaitingLaunch: Set<string>;
  setAwaitingLaunch: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function LiveMatchsEnCoursTab({
  terrains,
  matches,
  meta,
  started,
  completed,
  matchResults,
  liveToken,
  pdfFilename,
  exportPayload,
  captureExportPages,
  exportingPdf,
  onExportPhaseChange,
  onStart,
  onCompleteMatch,
  awaitingLaunch,
  setAwaitingLaunch,
}: LiveMatchsEnCoursTabProps) {
  const scoreForm = useScoreFormToggle();
  const [exportError, setExportError] = useState<string | null>(null);
  const [launchBlockedMessage, setLaunchBlockedMessage] = useState<
    Map<string, string>
  >(() => new Map());
  const [scoringState, setScoringState] = useState<CourtScoringState | null>(
    null
  );
  const [submitScore, setSubmitScore] = useState<
    (() => ValidatedMatchScore | null) | null
  >(null);

  const { current: matchByTerrain } = useMemo(
    () =>
      matchQueuesByTerrain(
        matches,
        terrains,
        completed,
        matchResults,
        awaitingLaunch,
        "bracket"
      ),
    [matches, terrains, completed, matchResults, awaitingLaunch]
  );

  const displayMatchByTerrain = useMemo(() => {
    const map = new Map<string, CourtMatchDisplay | null>();
    for (const terrain of terrains) {
      map.set(
        terrain,
        awaitingLaunch.has(terrain)
          ? null
          : matchByTerrain.get(terrain) ?? null
      );
    }
    return map;
  }, [terrains, awaitingLaunch, matchByTerrain]);

  const matchLookup = useMemo(() => {
    const map = new Map<string, LiveMatch>();
    for (const match of matches) map.set(match.code, match);
    return map;
  }, [matches]);

  const launchNextOnTerrain = useCallback((terrain: string) => {
    setAwaitingLaunch((prev) => {
      const next = new Set(prev);
      next.delete(terrain);
      return next;
    });
    setLaunchBlockedMessage((prev) => {
      if (!prev.has(terrain)) return prev;
      const next = new Map(prev);
      next.delete(terrain);
      return next;
    });
  }, []);

  const handleLaunchNextOnTerrain = useCallback(
    (terrain: string) => {
      const pending = matchByTerrain.get(terrain);
      const liveMatch = pending ? matchLookup.get(pending.code) : undefined;
      const ready = canLaunchNextMatch(
        pending?.equipe1 ?? "",
        pending?.equipe2 ?? "",
        liveMatch,
        completed,
        matchResults
      );

      if (!ready) {
        setLaunchBlockedMessage((prev) =>
          new Map(prev).set(terrain, TEAMS_UNAVAILABLE_MESSAGE)
        );
        return;
      }

      launchNextOnTerrain(terrain);
    },
    [
      matchByTerrain,
      matchLookup,
      completed,
      matchResults,
      launchNextOnTerrain,
    ]
  );

  useEffect(() => {
    setLaunchBlockedMessage((prev) => {
      let changed = false;
      const next = new Map(prev);

      for (const terrain of prev.keys()) {
        if (!awaitingLaunch.has(terrain)) {
          next.delete(terrain);
          changed = true;
          continue;
        }

        const pending = matchByTerrain.get(terrain);
        const liveMatch = pending ? matchLookup.get(pending.code) : undefined;
        if (
          canLaunchNextMatch(
            pending?.equipe1 ?? "",
            pending?.equipe2 ?? "",
            liveMatch,
            completed,
            matchResults
          )
        ) {
          next.delete(terrain);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    awaitingLaunch,
    matchByTerrain,
    matchLookup,
    completed,
    matchResults,
  ]);

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

  const finished =
    started && matches.length > 0 && completed.size >= matches.length;

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {openTerrain && openMatch && (
        <ScoringBridge
          key={`${openTerrain}-${openMatch.code}`}
          format={openFormat}
          equipe1={openMatch.equipe1}
          equipe2={openMatch.equipe2}
          onChange={handleScoringChange}
        />
      )}

      {started && !finished ? (
        <LiveCourtsRow
          terrains={terrains}
          matchByTerrain={displayMatchByTerrain}
          emptyLabel=""
          theme="light"
          compact
          getTerrainLibrePrompt={(terrain) =>
            awaitingLaunch.has(terrain)
              ? {
                  onLaunch: () => handleLaunchNextOnTerrain(terrain),
                  blockedMessage: launchBlockedMessage.get(terrain) ?? null,
                }
              : undefined
          }
          getScoring={(terrain) =>
            scoreForm.isOpen(terrain) ? scoringState ?? undefined : undefined
          }
          renderFooter={(terrain, match) => {
            if (awaitingLaunch.has(terrain)) {
              return <CourtFooterSlot compact />;
            }

            if (!match) return <CourtFooterSlot compact />;

            if (scoreForm.isOpen(terrain)) {
              const isValid = Boolean(scoringState?.winnerTeam);

              return (
                <CourtFooterSlot compact>
                  <div className="flex w-full items-stretch gap-2">
                    <button
                      type="button"
                      disabled={!isValid}
                      onClick={() => {
                        const result = submitScore?.();
                        if (!result) return;
                        onCompleteMatch(match.code, result);
                        setAwaitingLaunch((prev) => new Set(prev).add(terrain));
                        closeScoring();
                      }}
                      className={[
                        "flex min-h-[41px] flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition",
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
                      className="flex min-h-[41px] shrink-0 items-center justify-center rounded-xl border border-arena-600/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-arena-600/55 transition hover:border-arena-600/35 hover:text-arena-700"
                    >
                      Annuler
                    </button>
                  </div>
                </CourtFooterSlot>
              );
            }

            return (
              <CourtFooterSlot compact>
                <button
                  type="button"
                  disabled={!areCourtTeamsKnown(match.equipe1, match.equipe2)}
                  onClick={() => scoreForm.open(terrain)}
                  className={[
                    "flex min-h-[41px] w-full items-center justify-center rounded-xl border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition",
                    areCourtTeamsKnown(match.equipe1, match.equipe2)
                      ? "border-arena-600/30 bg-arena-600/10 text-arena-700 hover:bg-arena-600/15"
                      : "cursor-not-allowed border-arena-600/10 bg-arena-600/[0.03] text-arena-600/30",
                  ].join(" ")}
                >
                  Saisir le score
                </button>
              </CourtFooterSlot>
            );
          }}
        />
      ) : started ? (
        <div className="min-h-0 flex-1" aria-hidden />
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

      {finished && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-arena-600/25 bg-white px-8 py-6 text-center shadow-md sm:px-12 sm:py-8">
            <span
              className="font-brush text-[clamp(2rem,8vw,3.5rem)] leading-none text-arena-700"
              style={{ textShadow: "0 0 24px rgba(26,58,92,0.12)" }}
            >
              Tournoi terminé
            </span>
            <button
              type="button"
              disabled={exportingPdf}
              onClick={() => {
                setExportError(null);
                void (async () => {
                  try {
                    await downloadTournamentExportPdf(
                      liveToken,
                      pdfFilename,
                      exportPayload,
                      captureExportPages,
                      onExportPhaseChange
                    );
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Export PDF impossible.";
                    setExportError(message);
                  } finally {
                    onExportPhaseChange("idle");
                  }
                })();
              }}
              className="rounded-xl border border-arena-600/35 bg-arena-600/10 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-arena-700 transition hover:bg-arena-600/15 disabled:cursor-wait disabled:opacity-60"
            >
              {exportingPdf ? "Export en cours…" : "Exporter le PDF du tournoi"}
            </button>
            {exportError && (
              <p className="max-w-md text-sm text-red-600">{exportError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

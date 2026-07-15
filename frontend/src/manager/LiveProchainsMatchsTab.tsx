import { useMemo, useState } from "react";
import { CourtFooterSlot, LiveCourtsRow } from "./LiveCourtCard";
import {
  buildForceMatchOptions,
  computeForcedUpcomingAfterForce,
  inProgressMatchCodes,
  matchQueuesByTerrain,
  upcomingDisplayByTerrain,
} from "./liveCourtMatches";
import type { LiveMatch, LiveTournamentMeta } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import { LiveProjectionPage } from "./LiveProjectionPage";

interface LiveProchainsMatchsTabProps {
  terrains: string[];
  matches: LiveMatch[];
  meta: LiveTournamentMeta;
  completed: Set<string>;
  matchResults: Record<string, StoredMatchResult>;
  started: boolean;
  awaitingLaunch: Set<string>;
  forcedUpcomingByTerrain: Record<string, string>;
  applyForcedUpcoming: (next: Record<string, string>) => void;
  /** Jour actif : masque les matchs des jours suivants (formats multi-jours). */
  activeDay: number;
  /** Mode affichage public (retransmission) : sans actions organisateur. */
  broadcast?: boolean;
}

export function LiveProchainsMatchsTab({
  terrains,
  matches,
  meta,
  completed,
  matchResults,
  started,
  awaitingLaunch,
  forcedUpcomingByTerrain,
  applyForcedUpcoming,
  activeDay,
  broadcast = false,
}: LiveProchainsMatchsTabProps) {
  const [forcePickerTerrain, setForcePickerTerrain] = useState<string | null>(
    null
  );

  const forcedMap = useMemo(
    () => new Map(Object.entries(forcedUpcomingByTerrain)),
    [forcedUpcomingByTerrain]
  );

  const gateDay = meta.nb_jours > 1 ? activeDay : undefined;

  const matchByTerrain = useMemo(() => {
    const queues = matchQueuesByTerrain(
      matches,
      terrains,
      completed,
      matchResults,
      awaitingLaunch,
      "upcoming",
      forcedMap,
      gateDay
    );
    return upcomingDisplayByTerrain(queues, terrains, awaitingLaunch);
  }, [
    matches,
    terrains,
    completed,
    matchResults,
    awaitingLaunch,
    forcedMap,
    gateDay,
  ]);

  const forceMatchOptions = useMemo(() => {
    const inProgressCodes = inProgressMatchCodes(
      matches,
      terrains,
      completed,
      awaitingLaunch
    );
    return buildForceMatchOptions(
      matches,
      completed,
      inProgressCodes,
      matchResults,
      gateDay
    );
  }, [matches, terrains, completed, awaitingLaunch, matchResults, gateDay]);

  // Y a-t-il au moins un match sélectionnable à forcer ? (sinon inutile
  // d'afficher le bouton sur un terrain sans file d'attente).
  const hasForceOptions = useMemo(
    () => forceMatchOptions.some((option) => option.selectable),
    [forceMatchOptions]
  );

  const handleForceMatch = (terrain: string, matchCode: string) => {
    const next = computeForcedUpcomingAfterForce(
      terrain,
      matchCode,
      terrains,
      matches,
      completed,
      awaitingLaunch,
      forcedUpcomingByTerrain
    );
    applyForcedUpcoming(next);
    setForcePickerTerrain(null);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <LiveProjectionPage club={meta.club} logoUrl={meta.logo_url}>
        {!started ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <p className="max-w-md text-center text-sm text-arena-600/55">
              Démarrez le tournoi pour afficher les prochains matchs.
            </p>
          </div>
        ) : (
          <LiveCourtsRow
            terrains={terrains}
            matchByTerrain={matchByTerrain}
            emptyLabel=""
            theme="light"
            compact
            renderFooter={(terrain, match) => {
              if (broadcast) return <CourtFooterSlot compact />;
              // Terrain avec un prochain match : heure prévue + forçage.
              if (match) {
                return (
                  <CourtFooterSlot compact>
                    <div className="flex w-full items-stretch gap-2">
                      <div className="flex min-h-[41px] flex-1 items-center justify-center rounded-xl border border-arena-600/30 bg-arena-600/10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-arena-700">
                        {match.heure
                          ? `Prévu ${match.heure}`
                          : "Heure à confirmer"}
                      </div>
                      <button
                        type="button"
                        onClick={() => setForcePickerTerrain(terrain)}
                        className="flex min-h-[41px] shrink-0 items-center justify-center rounded-xl border border-arena-600/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-arena-600/55 transition hover:border-arena-600/35 hover:text-arena-700"
                      >
                        Forcer un match
                      </button>
                    </div>
                  </CourtFooterSlot>
                );
              }
              // Terrain sans file d'attente : permettre quand même de forcer un
              // match (ex. rattraper le retard d'un autre terrain).
              if (!hasForceOptions) return <CourtFooterSlot compact />;
              return (
                <CourtFooterSlot compact>
                  <div className="flex w-full items-stretch gap-2">
                    <div className="flex min-h-[41px] flex-1 items-center justify-center rounded-xl border border-arena-600/20 bg-arena-600/[0.04] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-arena-600/55">
                      Terrain libre
                    </div>
                    <button
                      type="button"
                      onClick={() => setForcePickerTerrain(terrain)}
                      className="flex min-h-[41px] shrink-0 items-center justify-center rounded-xl border border-arena-600/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-arena-600/55 transition hover:border-arena-600/35 hover:text-arena-700"
                    >
                      Forcer un match
                    </button>
                  </div>
                </CourtFooterSlot>
              );
            }}
          />
        )}
      </LiveProjectionPage>

      {!broadcast && forcePickerTerrain && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[min(80vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-arena-600/25 bg-white shadow-lg">
            <div className="border-b border-arena-600/15 px-4 py-3">
              <p className="text-sm font-semibold text-arena-800">
                Forcer un match — {forcePickerTerrain}
              </p>
              <p className="mt-0.5 text-xs text-arena-600/60">
                Choisissez un match du planning non terminé.
              </p>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto py-1">
              {forceMatchOptions.map((option) => (
                <li key={option.code}>
                  <button
                    type="button"
                    disabled={!option.selectable}
                    onClick={() =>
                      handleForceMatch(forcePickerTerrain, option.code)
                    }
                    className={[
                      "w-full px-4 py-2.5 text-left text-sm transition",
                      option.selectable
                        ? "text-arena-800 hover:bg-arena-600/8"
                        : "cursor-not-allowed text-arena-600/35",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-arena-600/15 px-4 py-3">
              <button
                type="button"
                onClick={() => setForcePickerTerrain(null)}
                className="flex min-h-[41px] w-full items-center justify-center rounded-xl border border-arena-600/20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-arena-600/55 transition hover:border-arena-600/35 hover:text-arena-700"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

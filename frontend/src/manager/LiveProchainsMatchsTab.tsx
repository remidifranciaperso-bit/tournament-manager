import { useMemo } from "react";
import { CourtFooterSlot, CourtScheduledTime, LiveCourtsRow } from "./LiveCourtCard";
import {
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
}

export function LiveProchainsMatchsTab({
  terrains,
  matches,
  meta,
  completed,
  matchResults,
  started,
  awaitingLaunch,
}: LiveProchainsMatchsTabProps) {
  const matchByTerrain = useMemo(() => {
    const queues = matchQueuesByTerrain(
      matches,
      terrains,
      completed,
      matchResults,
      awaitingLaunch,
      "upcoming"
    );
    return upcomingDisplayByTerrain(queues, terrains, awaitingLaunch);
  }, [matches, terrains, completed, matchResults, awaitingLaunch]);

  return (
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
          renderFooter={(_terrain, match) =>
            match ? (
              <CourtScheduledTime heure={match.heure} compact />
            ) : (
              <CourtFooterSlot compact />
            )
          }
        />
      )}
    </LiveProjectionPage>
  );
}

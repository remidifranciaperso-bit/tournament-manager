import { useMemo } from "react";
import { CourtFooterSlot, CourtScheduledTime, LiveCourtsRow } from "./LiveCourtCard";
import {
  matchQueuesByTerrain,
  upcomingDisplayByTerrain,
} from "./liveCourtMatches";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

interface LiveProchainsMatchsTabProps {
  terrains: string[];
  matches: LiveMatch[];
  completed: Set<string>;
  matchResults: Record<string, StoredMatchResult>;
  started: boolean;
  awaitingLaunch: Set<string>;
}

export function LiveProchainsMatchsTab({
  terrains,
  matches,
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
      awaitingLaunch
    );
    return upcomingDisplayByTerrain(queues, terrains, awaitingLaunch);
  }, [matches, terrains, completed, matchResults, awaitingLaunch]);

  if (!started) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white p-6">
        <p className="max-w-md text-center text-sm text-arena-600/55">
          Démarrez le tournoi pour afficher les prochains matchs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
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
    </div>
  );
}

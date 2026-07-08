import { useMemo } from "react";
import { CourtFooterSlot, CourtScheduledTime, LiveCourtsRow } from "./LiveCourtCard";
import { matchQueuesByTerrain } from "./liveCourtMatches";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

interface LiveProchainsMatchsTabProps {
  terrains: string[];
  matches: LiveMatch[];
  completed: Set<string>;
  matchResults: Record<string, StoredMatchResult>;
  started: boolean;
}

export function LiveProchainsMatchsTab({
  terrains,
  matches,
  completed,
  matchResults,
  started,
}: LiveProchainsMatchsTabProps) {
  const { upcoming: matchByTerrain } = useMemo(
    () => matchQueuesByTerrain(matches, terrains, completed, matchResults),
    [matches, terrains, completed, matchResults]
  );

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
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <LiveCourtsRow
        terrains={terrains}
        matchByTerrain={matchByTerrain}
        emptyLabel="Aucun match suivant"
        theme="light"
        renderFooter={(_terrain, match) =>
          match ? (
            <CourtScheduledTime heure={match.heure} />
          ) : (
            <CourtFooterSlot />
          )
        }
      />
    </div>
  );
}

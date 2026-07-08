import { useMemo } from "react";
import { LiveCourtsRow } from "./LiveCourtCard";
import { matchQueuesByTerrain } from "./liveCourtMatches";
import type { LiveMatch } from "./liveTypes";

interface LiveProchainsMatchsTabProps {
  terrains: string[];
  matches: LiveMatch[];
  completed: Set<string>;
  started: boolean;
}

export function LiveProchainsMatchsTab({
  terrains,
  matches,
  completed,
  started,
}: LiveProchainsMatchsTabProps) {
  const { upcoming: matchByTerrain } = useMemo(
    () => matchQueuesByTerrain(matches, terrains, completed),
    [matches, terrains, completed]
  );

  if (!started) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p className="max-w-md text-center text-sm text-white/40">
          Démarrez le tournoi pour afficher les prochains matchs.
        </p>
      </div>
    );
  }

  return (
    <LiveCourtsRow
      terrains={terrains}
      matchByTerrain={matchByTerrain}
      emptyLabel="Aucun match suivant"
    />
  );
}

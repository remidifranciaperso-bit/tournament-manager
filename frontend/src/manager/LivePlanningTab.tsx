import { useMemo } from "react";
import { buildPlanningRows } from "./buildPlanningTable";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import {
  LIVE_TABLE,
  LIVE_TABLE_CARD,
  LIVE_TABLE_CELL_NOTO,
  LIVE_TABLE_CELL_NOTO_BOLD,
  LIVE_TABLE_CELL_TSL,
  LIVE_TABLE_CELL_TSL_BOLD,
  LIVE_TABLE_HEAD,
  LIVE_TABLE_PAGE,
  LIVE_TABLE_PAGE_INNER,
  LIVE_TABLE_ROW,
  liveTeamTextClass,
} from "./liveDataTable";

interface LivePlanningTabProps {
  layoutFields: LiveLayoutField[];
  matches: LiveMatch[];
  completed: Set<string>;
  matchResults: Record<string, StoredMatchResult>;
  onToggleDone: (code: string) => void;
}

export function LivePlanningTab({
  layoutFields,
  matches,
  completed,
  matchResults,
  onToggleDone,
}: LivePlanningTabProps) {
  const rows = useMemo(
    () =>
      buildPlanningRows(
        layoutFields,
        matches,
        completed,
        matchResults
      ),
    [layoutFields, matches, completed, matchResults]
  );

  const matchByCode = useMemo(() => {
    const map = new Map<string, LiveMatch>();
    for (const match of matches) map.set(match.code, match);
    return map;
  }, [matches]);

  return (
    <div className={LIVE_TABLE_PAGE}>
      <div className={LIVE_TABLE_PAGE_INNER}>
        <div className={LIVE_TABLE_CARD}>
        <table className={LIVE_TABLE}>
          <thead>
            <tr className="bg-template-blue text-white">
              <th className={`w-[10%] ${LIVE_TABLE_HEAD}`}>Code</th>
              <th className={`w-[10%] ${LIVE_TABLE_HEAD}`}>Heure</th>
              <th className={`w-[10%] ${LIVE_TABLE_HEAD}`}>Terrain</th>
              <th className={LIVE_TABLE_HEAD}>Équipe 1</th>
              <th className={LIVE_TABLE_HEAD}>Équipe 2</th>
              <th className={`w-[8%] text-center ${LIVE_TABLE_HEAD}`}>Fait</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const match = matchByCode.get(row.code);
              const code = match?.code ?? row.code;

              return (
                <tr
                  key={`${row.code}-${row.heure}`}
                  className={LIVE_TABLE_ROW}
                >
                  <td className={LIVE_TABLE_CELL_TSL_BOLD}>{row.code}</td>
                  <td className={LIVE_TABLE_CELL_TSL}>
                    {row.heure || "—"}
                  </td>
                  <td className={LIVE_TABLE_CELL_NOTO_BOLD}>
                    {row.terrain || "—"}
                  </td>
                  <td
                    className={`${LIVE_TABLE_CELL_NOTO} ${liveTeamTextClass(row.equipe1)}`}
                  >
                    {row.equipe1}
                  </td>
                  <td
                    className={`${LIVE_TABLE_CELL_NOTO} ${liveTeamTextClass(row.equipe2)}`}
                  >
                    {row.equipe2}
                  </td>
                  <td className="px-2 py-2 text-center sm:px-3">
                    <input
                      type="checkbox"
                      checked={row.done}
                      onChange={() => onToggleDone(code)}
                      className="h-4 w-4 accent-template-blue"
                      aria-label={`Match ${row.code} terminé`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

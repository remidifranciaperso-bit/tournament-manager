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
  LIVE_TABLE_ROW_EXPORT,
  liveTeamTextClass,
} from "./liveDataTable";

interface LivePlanningTabProps {
  layoutFields: LiveLayoutField[];
  matches: LiveMatch[];
  completed: Set<string>;
  matchResults: Record<string, StoredMatchResult>;
  onToggleDone: (code: string) => void;
  exportMode?: boolean;
}

export function LivePlanningTab({
  layoutFields,
  matches,
  completed,
  matchResults,
  onToggleDone,
  exportMode = false,
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
    <div className={exportMode ? "bg-white px-3 py-4" : LIVE_TABLE_PAGE}>
      <div className={exportMode ? "w-full" : LIVE_TABLE_PAGE_INNER}>
        <div
          className={
            exportMode
              ? "mx-auto w-full max-w-none overflow-hidden rounded-xl border border-template-blue/35 shadow-sm"
              : LIVE_TABLE_CARD
          }
        >
        <table
          className={[
            LIVE_TABLE,
            "table-fixed",
            exportMode ? "w-full text-xs" : "",
          ].join(" ")}
        >
          <thead>
            <tr className="bg-template-blue text-white">
              <th className={`w-[7%] whitespace-nowrap ${LIVE_TABLE_HEAD}`}>Code</th>
              <th className={`w-[7%] whitespace-nowrap ${LIVE_TABLE_HEAD}`}>Heure</th>
              <th className={`w-[17%] whitespace-nowrap ${LIVE_TABLE_HEAD}`}>Terrain</th>
              <th className={`w-[27%] whitespace-nowrap ${LIVE_TABLE_HEAD}`}>Équipe 1</th>
              <th className={`w-[27%] whitespace-nowrap ${LIVE_TABLE_HEAD}`}>Équipe 2</th>
              <th className={`w-[7%] whitespace-nowrap text-center ${LIVE_TABLE_HEAD}`}>
                {exportMode ? "Temps" : "Fait"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const match = matchByCode.get(row.code);
              const code = match?.code ?? row.code;
              const nowrap = "whitespace-nowrap";

              return (
                <tr
                  key={`${row.code}-${row.heure}`}
                  className={exportMode ? LIVE_TABLE_ROW_EXPORT : LIVE_TABLE_ROW}
                >
                  <td className={`${LIVE_TABLE_CELL_TSL_BOLD} ${nowrap}`}>{row.code}</td>
                  <td className={`${LIVE_TABLE_CELL_TSL} ${nowrap}`}>
                    {row.heure || "—"}
                  </td>
                  <td className={`${LIVE_TABLE_CELL_NOTO_BOLD} ${nowrap}`}>
                    {row.terrain || "—"}
                  </td>
                  <td
                    className={`${LIVE_TABLE_CELL_NOTO} ${liveTeamTextClass(row.equipe1)} ${nowrap}`}
                  >
                    {row.equipe1}
                  </td>
                  <td
                    className={`${LIVE_TABLE_CELL_NOTO} ${liveTeamTextClass(row.equipe2)} ${nowrap}`}
                  >
                    {row.equipe2}
                  </td>
                  <td
                    className={`${LIVE_TABLE_CELL_TSL} text-center ${nowrap}`}
                  >
                    {exportMode ? (
                      row.duration
                    ) : (
                      <input
                        type="checkbox"
                        checked={row.done}
                        onChange={() => onToggleDone(code)}
                        className="h-4 w-4 accent-template-blue"
                        aria-label={`Match ${row.code} terminé`}
                      />
                    )}
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

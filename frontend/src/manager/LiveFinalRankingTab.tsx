import { useMemo } from "react";
import type { LiveTournamentMeta } from "./liveTypes";
import {
  buildFinalRanking,
  formatPlaceLabel,
} from "./buildFinalRanking";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import {
  LIVE_TABLE,
  LIVE_TABLE_CARD,
  LIVE_TABLE_CELL_NOTO,
  LIVE_TABLE_CELL_POINTS,
  LIVE_TABLE_CELL_TSL_BOLD,
  LIVE_TABLE_HEAD,
  LIVE_TABLE_PAGE,
  LIVE_TABLE_PAGE_INNER,
  LIVE_TABLE_ROW,
  liveTeamTextClass,
} from "./liveDataTable";

interface LiveFinalRankingTabProps {
  meta: LiveTournamentMeta;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  fields: Record<string, string>;
}

export function LiveFinalRankingTab({
  meta,
  matches,
  matchResults,
  fields,
}: LiveFinalRankingTabProps) {
  const rows = useMemo(
    () =>
      buildFinalRanking(
        matches,
        matchResults,
        fields,
        meta.nb_equipes
      ),
    [matches, matchResults, fields, meta.nb_equipes]
  );

  return (
    <div className={LIVE_TABLE_PAGE}>
      <div className={LIVE_TABLE_PAGE_INNER}>
        <div className={LIVE_TABLE_CARD}>
        <table className={LIVE_TABLE}>
          <thead>
            <tr className="bg-template-blue text-white">
              <th className={`w-[18%] ${LIVE_TABLE_HEAD}`}>Place</th>
              <th className={LIVE_TABLE_HEAD}>Équipe</th>
              <th className={`w-[22%] text-right ${LIVE_TABLE_HEAD}`}>
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.place} className={LIVE_TABLE_ROW}>
                <td className={LIVE_TABLE_CELL_TSL_BOLD}>
                  {formatPlaceLabel(row.place)}
                </td>
                <td
                  className={`${LIVE_TABLE_CELL_NOTO} ${liveTeamTextClass(row.team)}`}
                >
                  {row.team || (
                    <span className="text-arena-600/35">—</span>
                  )}
                </td>
                <td className={LIVE_TABLE_CELL_POINTS}>
                  {row.points || (
                    <span className="text-arena-600/35">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

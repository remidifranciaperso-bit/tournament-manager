import { useMemo } from "react";
import type { LiveTournamentMeta } from "./liveTypes";
import {
  buildFinalRanking,
  formatPlaceLabel,
} from "./buildFinalRanking";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-center font-brush text-2xl text-template-blue sm:text-3xl">
        Classement final
      </h2>

      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-template-blue/35 shadow-sm">
        <table className="w-full border-collapse text-sm sm:text-base">
          <thead>
            <tr className="bg-template-blue text-white">
              <th className="w-[22%] px-3 py-2.5 text-left font-tsl font-semibold uppercase tracking-wide">
                Place
              </th>
              <th className="px-3 py-2.5 text-left font-tsl font-semibold uppercase tracking-wide">
                Équipe
              </th>
              <th className="w-[24%] px-3 py-2.5 text-right font-tsl font-semibold uppercase tracking-wide">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.place}
                className="border-t border-template-blue/15 odd:bg-white even:bg-template-blue/[0.04]"
              >
                <td className="px-3 py-2 font-tsl font-semibold text-arena-800">
                  {formatPlaceLabel(row.place)}
                </td>
                <td className="px-3 py-2 font-noto text-arena-800">
                  {row.team || (
                    <span className="text-arena-600/35">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-tsl font-semibold text-template-blue">
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
  );
}

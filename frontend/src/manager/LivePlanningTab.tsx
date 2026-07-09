import { useMemo } from "react";
import { buildPlanningRows } from "./buildPlanningTable";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-template-blue/35 shadow-sm">
        <table className="w-full border-collapse text-sm sm:text-base">
          <thead>
            <tr className="bg-template-blue text-white">
              <th className="w-[10%] px-2 py-2.5 text-left font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                Code
              </th>
              <th className="w-[10%] px-2 py-2.5 text-left font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                Heure
              </th>
              <th className="w-[10%] px-2 py-2.5 text-left font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                Terrain
              </th>
              <th className="px-2 py-2.5 text-left font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                Équipe 1
              </th>
              <th className="px-2 py-2.5 text-left font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                Équipe 2
              </th>
              <th className="w-[8%] px-2 py-2.5 text-center font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm">
                Fait
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const match = matchByCode.get(row.code);
              const code = match?.code ?? row.code;

              return (
                <tr
                  key={`${row.code}-${row.heure}`}
                  className="border-t border-template-blue/15 odd:bg-white even:bg-template-blue/[0.04]"
                >
                  <td className="px-2 py-2 font-tsl font-semibold text-arena-800 sm:px-3">
                    {row.code}
                  </td>
                  <td className="px-2 py-2 font-tsl text-arena-800 sm:px-3">
                    {row.heure || "—"}
                  </td>
                  <td className="px-2 py-2 font-noto font-semibold text-arena-800 sm:px-3">
                    {row.terrain || "—"}
                  </td>
                  <td className="px-2 py-2 font-noto text-arena-800 sm:px-3">
                    {row.equipe1}
                  </td>
                  <td className="px-2 py-2 font-noto text-arena-800 sm:px-3">
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
  );
}

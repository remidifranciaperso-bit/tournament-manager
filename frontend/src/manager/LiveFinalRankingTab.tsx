import { useMemo } from "react";
import type { LiveTournamentMeta } from "./liveTypes";
import {
  buildFinalRanking,
  formatPlaceLabel,
} from "./buildFinalRanking";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

interface RankingTypography {
  bodySize: number;
  headerSize: number;
  rowPadY: number;
  headerPadY: number;
}

function rankingTypography(nbEquipes: number): RankingTypography {
  if (nbEquipes <= 16) {
    return { bodySize: 15, headerSize: 13, rowPadY: 8, headerPadY: 10 };
  }
  if (nbEquipes <= 20) {
    return { bodySize: 12, headerSize: 11, rowPadY: 5, headerPadY: 7 };
  }
  return { bodySize: 10, headerSize: 10, rowPadY: 3, headerPadY: 5 };
}

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
  const typography = useMemo(
    () => rankingTypography(meta.nb_equipes),
    [meta.nb_equipes]
  );

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-xl border border-template-blue/35 shadow-sm">
        <div
          className="grid shrink-0 bg-template-blue text-white"
          style={{
            gridTemplateColumns: "22% 1fr 24%",
            fontSize: typography.headerSize,
            padding: `${typography.headerPadY}px 0`,
          }}
        >
          <span className="px-2 font-tsl font-semibold uppercase tracking-wide sm:px-3">
            Place
          </span>
          <span className="px-2 font-tsl font-semibold uppercase tracking-wide sm:px-3">
            Équipe
          </span>
          <span className="px-2 text-right font-tsl font-semibold uppercase tracking-wide sm:px-3">
            Points
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {rows.map((row) => (
            <div
              key={row.place}
              className="grid min-h-0 flex-1 items-center border-t border-template-blue/15 odd:bg-white even:bg-template-blue/[0.04]"
              style={{
                gridTemplateColumns: "22% 1fr 24%",
                fontSize: typography.bodySize,
                padding: `${typography.rowPadY}px 0`,
              }}
            >
              <span className="truncate px-2 font-tsl font-semibold text-arena-800 sm:px-3">
                {formatPlaceLabel(row.place)}
              </span>
              <span className="truncate px-2 font-noto text-arena-800 sm:px-3">
                {row.team || (
                  <span className="text-arena-600/35">—</span>
                )}
              </span>
              <span className="truncate px-2 text-right font-tsl font-semibold text-template-blue sm:px-3">
                {row.points || (
                  <span className="text-arena-600/35">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

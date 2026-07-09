import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveTournamentMeta } from "./liveTypes";
import {
  buildFinalRanking,
  formatPlaceLabel,
} from "./buildFinalRanking";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

interface TableMetrics {
  fontSize: number;
  headerFontSize: number;
  titleSize: number;
  rowPadY: number;
  headerPadY: number;
}

function computeTableMetrics(
  containerHeight: number,
  nbEquipes: number
): TableMetrics {
  const titleSize = Math.max(18, Math.min(28, Math.round(containerHeight * 0.06)));
  const titleBlock = titleSize + 16;
  const headerPadY = nbEquipes >= 24 ? 4 : nbEquipes >= 20 ? 5 : 7;
  const headerFontSize = nbEquipes >= 24 ? 10 : nbEquipes >= 20 ? 11 : 12;
  const headerBlock = headerFontSize + headerPadY * 2 + 4;
  const verticalPadding = 20;
  const bodyHeight = Math.max(
    120,
    containerHeight - titleBlock - headerBlock - verticalPadding
  );
  const rowHeight = bodyHeight / nbEquipes;
  const fontSize = Math.max(9, Math.min(15, Math.floor(rowHeight * 0.52)));
  const rowPadY = Math.max(1, Math.floor((rowHeight - fontSize * 1.25) / 2));

  return {
    fontSize,
    headerFontSize,
    titleSize,
    rowPadY,
    headerPadY,
  };
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<TableMetrics>(() =>
    computeTableMetrics(600, meta.nb_equipes)
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

  const updateMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight <= 0) return;
    setMetrics(computeTableMetrics(el.clientHeight, meta.nb_equipes));
  }, [meta.nb_equipes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateMetrics();
    const observer = new ResizeObserver(() => updateMetrics());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateMetrics]);

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-hidden bg-white px-3 py-2 sm:px-5 sm:py-3"
    >
      <h2
        className="shrink-0 text-center font-brush leading-none text-template-blue"
        style={{ fontSize: metrics.titleSize }}
      >
        Classement final
      </h2>

      <div className="mx-auto mt-2 flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-xl border border-template-blue/35 shadow-sm">
        <div
          className="grid shrink-0 bg-template-blue text-white"
          style={{
            gridTemplateColumns: "22% 1fr 24%",
            fontSize: metrics.headerFontSize,
            padding: `${metrics.headerPadY}px 0`,
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
                fontSize: metrics.fontSize,
                padding: `${metrics.rowPadY}px 0`,
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

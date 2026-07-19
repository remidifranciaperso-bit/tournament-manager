import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LiveTournamentMeta } from "./liveTypes";
import {
  buildFinalRanking,
  formatPlaceLabel,
} from "./buildFinalRanking";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import {
  LIVE_TABLE,
  LIVE_TABLE_CAPTURE,
  LIVE_TABLE_CARD,
  LIVE_TABLE_CELL_NOTO,
  LIVE_TABLE_CELL_POINTS,
  LIVE_TABLE_CELL_TSL_BOLD,
  LIVE_TABLE_HEAD,
  LIVE_TABLE_HEAD_CELL_EXPORT,
  LIVE_TABLE_HEAD_EXPORT,
  LIVE_TABLE_ROW,
  liveTeamTextClass,
} from "./liveDataTable";
import { EXPORT_CAPTURE_WIDTH } from "./exportCapture";

interface LiveFinalRankingTabProps {
  meta: LiveTournamentMeta;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  fields: Record<string, string>;
  /** Rendu statique pleine largeur pour la capture PDF (pas de mise à l'échelle). */
  capture?: boolean;
  /** Plage de places (incluse) à afficher, pour la pagination export (1-16 / 17-32). */
  placeRange?: [number, number];
}

/** Largeur live classement final (820 pt − 1 cm, calé sur convocations). */
const FINAL_BASE_WIDTH = Math.round(EXPORT_CAPTURE_WIDTH * (791.65 / 1024));

export function LiveFinalRankingTab({
  meta,
  matches,
  matchResults,
  fields,
  capture = false,
  placeRange,
}: LiveFinalRankingTabProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  const rows = useMemo(() => {
    const all = buildFinalRanking(matches, matchResults, fields, meta.nb_equipes);
    if (!placeRange) return all;
    const [start, end] = placeRange;
    return all.filter((row) => row.place >= start && row.place <= end);
  }, [matches, matchResults, fields, meta.nb_equipes, placeRange]);

  useLayoutEffect(() => {
    if (capture) return;

    const page = pageRef.current;
    const card = cardRef.current;
    if (!page || !card) return;

    const apply = () => {
      const availW = page.clientWidth;
      const availH = page.clientHeight;
      const naturalH = card.offsetHeight;
      if (availW <= 0 || availH <= 0 || naturalH <= 0) return;

      const nextScale = Math.min(
        1,
        availW / FINAL_BASE_WIDTH,
        availH / naturalH
      );
      setScale((prev) => (prev === nextScale ? prev : nextScale));
      setNaturalHeight((prev) => (prev === naturalH ? prev : naturalH));
    };

    apply();
    const observer = new ResizeObserver(() => apply());
    observer.observe(page);
    observer.observe(card);
    return () => observer.disconnect();
  }, [capture, rows.length]);

  const headClass = capture ? LIVE_TABLE_HEAD_EXPORT : LIVE_TABLE_HEAD;
  const tableClass = capture ? LIVE_TABLE_CAPTURE : LIVE_TABLE;

  const table = (
    <table className={tableClass}>
      <thead>
        <tr className="bg-template-blue text-white">
          <th className={`w-[18%] ${headClass} ${capture ? LIVE_TABLE_HEAD_CELL_EXPORT : ""}`}>Place</th>
          <th className={`${headClass} ${capture ? LIVE_TABLE_HEAD_CELL_EXPORT : ""}`}>Équipe</th>
          <th className={`w-[22%] text-right ${headClass} ${capture ? LIVE_TABLE_HEAD_CELL_EXPORT : ""}`}>Points</th>
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
              {row.team || <span className="text-arena-600/35">—</span>}
            </td>
            <td className={LIVE_TABLE_CELL_POINTS}>
              {row.points || <span className="text-arena-600/35">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (capture) {
    return (
      <div className="w-full bg-white py-4">
        <div className="mx-auto w-full max-w-none overflow-hidden rounded-xl border border-template-blue/35 shadow-sm">
          {table}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6 sm:py-6"
    >
      <div
        className="relative shrink-0"
        style={{
          width: FINAL_BASE_WIDTH * scale,
          height: naturalHeight * scale || undefined,
        }}
      >
        <div
          ref={cardRef}
          className={`${LIVE_TABLE_CARD} absolute left-0 top-0`}
          style={{
            width: FINAL_BASE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {table}
        </div>
      </div>
    </div>
  );
}

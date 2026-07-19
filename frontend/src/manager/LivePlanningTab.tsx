import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  LIVE_TABLE_HEAD_EXPORT,
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
  /** Affiche la durée (lecture seule) au lieu de la case à cocher. */
  exportMode?: boolean;
  /** Rendu statique pleine largeur pour la capture PDF (pas de mise à l'échelle). */
  capture?: boolean;
}

/** Largeur de référence du tableau planning en live (avant mise à l'échelle). */
const PLANNING_BASE_WIDTH = 1024;

export function LivePlanningTab({
  layoutFields,
  matches,
  completed,
  matchResults,
  onToggleDone,
  exportMode = false,
  capture = false,
}: LivePlanningTabProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

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
        availW / PLANNING_BASE_WIDTH,
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

  const headClass = exportMode || capture ? LIVE_TABLE_HEAD_EXPORT : LIVE_TABLE_HEAD;

  const table = (
    <table
      className={[
        LIVE_TABLE,
        "table-fixed w-full",
        exportMode ? "text-sm" : "",
      ].join(" ")}
    >
      <thead>
        <tr className="bg-template-blue text-white">
          <th className={`w-[7%] whitespace-nowrap ${headClass}`}>Code</th>
          <th className={`w-[7%] whitespace-nowrap ${headClass}`}>Heure</th>
          <th className={`w-[13%] whitespace-nowrap ${headClass}`}>Terrain</th>
          <th className={`w-[28.5%] whitespace-nowrap ${headClass}`}>Équipe 1</th>
          <th className={`w-[28.5%] whitespace-nowrap ${headClass}`}>Équipe 2</th>
          <th className={`w-[7%] whitespace-nowrap text-center ${headClass}`}>
            {exportMode ? "Terminé" : "Fait"}
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
              <td className={`${LIVE_TABLE_CELL_TSL} text-center ${nowrap}`}>
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
          width: PLANNING_BASE_WIDTH * scale,
          height: naturalHeight * scale || undefined,
        }}
      >
        <div
          ref={cardRef}
          className={`${LIVE_TABLE_CARD} absolute left-0 top-0`}
          style={{
            width: PLANNING_BASE_WIDTH,
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

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
  const pageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

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
    if (exportMode) {
      setScale(1);
      setNaturalSize({ width: 0, height: 0 });
      return;
    }

    const page = pageRef.current;
    const card = cardRef.current;
    if (!page || !card) return;

    const apply = () => {
      const availW = page.clientWidth;
      const availH = page.clientHeight;
      const naturalW = card.offsetWidth;
      const naturalH = card.offsetHeight;
      if (availW <= 0 || availH <= 0 || naturalW <= 0 || naturalH <= 0) return;

      const nextScale = Math.min(1, availW / naturalW, availH / naturalH);
      setScale((prev) => (prev === nextScale ? prev : nextScale));
      setNaturalSize((prev) =>
        prev.width === naturalW && prev.height === naturalH
          ? prev
          : { width: naturalW, height: naturalH }
      );
    };

    apply();
    const observer = new ResizeObserver(() => apply());
    observer.observe(page);
    observer.observe(card);
    return () => observer.disconnect();
  }, [exportMode, rows.length]);

  const scaledWidth =
    naturalSize.width > 0 ? Math.ceil(naturalSize.width * scale) : undefined;
  const scaledHeight =
    naturalSize.height > 0 ? Math.ceil(naturalSize.height * scale) : undefined;

  return (
    <div
      ref={pageRef}
      className={
        exportMode
          ? "bg-white px-3 py-4"
          : "flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6 sm:py-6"
      }
    >
      <div
        className={exportMode ? "w-full" : "relative shrink-0"}
        style={
          exportMode
            ? undefined
            : {
                width: scaledWidth,
                height: scaledHeight,
              }
        }
      >
        <div
          ref={cardRef}
          className={
            exportMode
              ? "mx-auto w-full max-w-none overflow-hidden rounded-xl border border-template-blue/35 shadow-sm"
              : `${LIVE_TABLE_CARD} absolute left-0 top-0 w-max max-w-none`
          }
          style={
            exportMode
              ? undefined
              : {
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: naturalSize.width || undefined,
                }
          }
        >
          <table
            className={[
              LIVE_TABLE,
              "table-fixed",
              exportMode ? "w-full text-xs" : "min-w-[42rem]",
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

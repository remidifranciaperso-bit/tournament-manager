import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildPlanningRows } from "./buildPlanningTable";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import {
  LIVE_TABLE,
  LIVE_TABLE_CAPTURE,
  LIVE_TABLE_CAPTURE_SHELL,
  LIVE_TABLE_CARD,
  LIVE_TABLE_CARD_WIDE,
  LIVE_TABLE_CELL_NOTO,
  LIVE_TABLE_CELL_NOTO_BOLD,
  LIVE_TABLE_CELL_TSL,
  LIVE_TABLE_CELL_TSL_BOLD,
  LIVE_TABLE_HEAD_PLANNING_CAPTURE,
  LIVE_TABLE_ROW,
  LIVE_TABLE_ROW_EXPORT,
  liveTeamTextClass,
} from "./liveDataTable";
import {
  PLANNING_EXPORT_CAPTURE_WIDTH,
  PLANNING_LEGACY_LAYOUT_WIDTH,
  PLANNING_SIDE_MARGIN_PX,
  PLANNING_TABLE_LAYOUT_WIDTH,
  PLANNING_VERTICAL_FIT_INSET_PX,
  PLANNING_VERTICAL_MARGIN_PX,
  PLANNING_V2_LAYOUT_MARKER,
} from "./exportCapture";
import {
  useLiveTableHeadPresentation,
  LiveTableDisplayScaleProvider,
  useLiveTableShellClass,
} from "./liveTableTypography";

function planningLayoutMetrics(v2TableHeaders: boolean) {
  if (v2TableHeaders) {
    return {
      baseWidth: PLANNING_TABLE_LAYOUT_WIDTH,
      sideMargin: PLANNING_SIDE_MARGIN_PX,
      verticalMargin: PLANNING_VERTICAL_MARGIN_PX,
      captureShellWidth: PLANNING_EXPORT_CAPTURE_WIDTH,
    };
  }
  return {
    baseWidth: PLANNING_LEGACY_LAYOUT_WIDTH,
    sideMargin: 0,
    verticalMargin: 0,
    captureShellWidth: PLANNING_LEGACY_LAYOUT_WIDTH,
  };
}

interface LivePlanningTabProps {
  layoutFields: LiveLayoutField[];
  matches: LiveMatch[];
  completed: Set<string>;
  matchResults: Record<string, StoredMatchResult>;
  onToggleDone: (code: string) => void;
  /** Affiche la durée (lecture seule) au lieu de la case à cocher. */
  exportMode?: boolean;
  /** En-têtes colonnes 12 pt (Engine V2). */
  v2TableHeaders?: boolean;
  /** Rendu statique pleine largeur pour la capture PDF (pas de mise à l'échelle). */
  capture?: boolean;
  /** Hauteur de référence (slide le plus chargé) pour échelle uniforme Live V2. */
  planningReferenceHeight?: number;
}

const PLANNING_COLGROUP = (
  <colgroup>
    <col className="w-[8%]" />
    <col className="w-[8%]" />
    <col className="w-[14%]" />
    <col className="w-[32%]" />
    <col className="w-[32%]" />
    <col className="w-[6%]" />
  </colgroup>
);

function HandCheckboxSquare() {
  return (
    <span
      className="mx-auto box-border inline-block h-3.5 w-3.5 shrink-0 border-[1.5px] border-template-blue/70 bg-white"
      aria-hidden
    />
  );
}

export function LivePlanningTab({
  layoutFields,
  matches,
  completed,
  matchResults,
  onToggleDone,
  exportMode = false,
  v2TableHeaders = import.meta.env.VITE_DEPLOY_TARGET === "engine-v2",
  capture = false,
  planningReferenceHeight,
}: LivePlanningTabProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  const { baseWidth, sideMargin, verticalMargin, captureShellWidth } = useMemo(
    () => planningLayoutMetrics(v2TableHeaders),
    [v2TableHeaders]
  );
  const cardShellClass = v2TableHeaders ? LIVE_TABLE_CARD_WIDE : LIVE_TABLE_CARD;

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

      const widthScale = Math.min(1, availW / baseWidth);
      const refHeight = v2TableHeaders
        ? Math.max(naturalH, planningReferenceHeight ?? 0)
        : naturalH;
      const fitAvailH = v2TableHeaders
        ? Math.max(1, availH - PLANNING_VERTICAL_FIT_INSET_PX)
        : availH;
      const heightScale = Math.min(1, fitAvailH / refHeight);
      const uniform = Math.min(widthScale, heightScale);

      setScale((prev) => (prev === uniform ? prev : uniform));
      setNaturalHeight((prev) => (prev === naturalH ? prev : naturalH));
    };

    apply();
    const observer = new ResizeObserver(() => apply());
    observer.observe(page);
    observer.observe(card);
    return () => observer.disconnect();
  }, [capture, rows.length, baseWidth, planningReferenceHeight, v2TableHeaders]);

  const layoutScale = scale;

  const headPresentation = useLiveTableHeadPresentation(v2TableHeaders);
  const headClass = capture
    ? LIVE_TABLE_HEAD_PLANNING_CAPTURE
    : headPresentation.className;
  const headStyle = capture
    ? ({ fontSize: "12pt", fontWeight: 400 } as const)
    : headPresentation.style;
  const tableClass = useLiveTableShellClass(
    capture ? LIVE_TABLE_CAPTURE : LIVE_TABLE,
    v2TableHeaders
  );
  const doneLabel = exportMode ? "Terminé" : "Fait";
  const v2HeadOverflow = v2TableHeaders
    ? "!max-w-none overflow-visible [text-overflow:clip]"
    : "";

  const bodyRows = rows.map((row) => {
    const match = matchByCode.get(row.code);
    const code = match?.code ?? row.code;
    const nowrap = "whitespace-nowrap";

    return (
      <tr
        key={`${row.code}-${row.heure}`}
        className={exportMode ? LIVE_TABLE_ROW_EXPORT : LIVE_TABLE_ROW}
      >
        <td className={`${LIVE_TABLE_CELL_TSL_BOLD} ${nowrap} !px-2 sm:!px-3`}>{row.code}</td>
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
        <td className={`${LIVE_TABLE_CELL_TSL} ${nowrap} !px-2 sm:!px-3`}>
          {exportMode ? (
            <div className="flex w-full justify-center">
              <HandCheckboxSquare />
            </div>
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
  });

  const tableHead = (
    <thead>
      <tr className="bg-template-blue text-white">
        <th
          className={`whitespace-nowrap text-left !px-2 sm:!px-3 ${headClass} ${capture ? "font-normal [font-weight:400]" : ""} ${v2HeadOverflow}`}
          style={headStyle}
        >
          Code
        </th>
        <th
          className={`whitespace-nowrap ${headClass} ${capture ? "font-normal [font-weight:400]" : ""} ${v2HeadOverflow}`}
          style={headStyle}
        >
          Heure
        </th>
        <th
          className={`whitespace-nowrap ${headClass} ${capture ? "font-normal [font-weight:400]" : ""} ${v2HeadOverflow}`}
          style={headStyle}
        >
          Terrain
        </th>
        <th
          className={`whitespace-nowrap ${headClass} ${capture ? "font-normal [font-weight:400]" : ""} ${v2HeadOverflow}`}
          style={headStyle}
        >
          Équipe 1
        </th>
        <th
          className={`whitespace-nowrap ${headClass} ${capture ? "font-normal [font-weight:400]" : ""} ${v2HeadOverflow}`}
          style={headStyle}
        >
          Équipe 2
        </th>
        <th
          className={`whitespace-nowrap text-right !px-2 sm:!px-3 ${headClass} ${capture ? "font-normal [font-weight:400]" : ""} ${v2HeadOverflow}`}
          style={headStyle}
        >
          {doneLabel}
        </th>
      </tr>
    </thead>
  );

  const table = (
    <table
      className={[
        tableClass,
        "table-fixed w-full",
        exportMode && !capture ? "text-sm" : "",
      ].join(" ")}
    >
      {PLANNING_COLGROUP}
      {tableHead}
      <tbody className={capture ? "bg-white" : undefined}>{bodyRows}</tbody>
    </table>
  );

  if (capture) {
    return (
      <div
        className="flex w-full items-center justify-center bg-white"
        style={{
          width: captureShellWidth,
          boxSizing: "border-box",
          paddingLeft: sideMargin,
          paddingRight: sideMargin,
          ["--live-display-scale" as string]: 1,
        }}
      >
        <div className={`${LIVE_TABLE_CAPTURE_SHELL} mx-auto bg-template-blue`} style={{ width: baseWidth, maxWidth: "100%" }}>
          {table}
        </div>
      </div>
    );
  }

  const pagePaddingClass = v2TableHeaders
    ? ""
    : "px-4 py-4 sm:px-6 sm:py-6";

  const pageStyle =
    sideMargin > 0 || verticalMargin > 0
      ? {
          paddingLeft: sideMargin,
          paddingRight: sideMargin,
          paddingTop: verticalMargin,
          paddingBottom: verticalMargin,
        }
      : undefined;

  const pageAlignClass = v2TableHeaders
    ? "items-start justify-center"
    : "items-center justify-center";

  return (
    <div
      ref={pageRef}
      className={`flex min-h-0 flex-1 overflow-hidden bg-white ${pagePaddingClass} ${pageAlignClass}`}
      data-planning-layout={v2TableHeaders ? PLANNING_V2_LAYOUT_MARKER : undefined}
      style={pageStyle}
    >
      <div
        className="relative shrink-0"
        style={{
          width: baseWidth * layoutScale,
          height: naturalHeight * layoutScale || undefined,
        }}
      >
        <LiveTableDisplayScaleProvider scale={layoutScale}>
        <div
          ref={cardRef}
          className={`${cardShellClass} absolute left-0 top-0`}
          style={{
            width: baseWidth,
            transform: `scale(${layoutScale})`,
            transformOrigin: "top left",
            ["--live-display-scale" as string]: layoutScale,
          }}
        >
          {table}
        </div>
        </LiveTableDisplayScaleProvider>
      </div>
    </div>
  );
}

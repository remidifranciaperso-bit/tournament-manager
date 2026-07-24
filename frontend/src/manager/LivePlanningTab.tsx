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
  PLANNING_CARD_SHELL_EXTRA_PX,
  PLANNING_EXPORT_CAPTURE_WIDTH,
  PLANNING_LEGACY_LAYOUT_WIDTH,
  PLANNING_SCALE_HEIGHT_BUFFER_PX,
  PLANNING_SIDE_MARGIN_PX,
  PLANNING_TABLE_LAYOUT_WIDTH,
  PLANNING_TERRAIN_COL_MIN_PX,
  PLANNING_VERTICAL_FIT_INSET_PX,
  PLANNING_VERTICAL_MARGIN_PX,
  PLANNING_V2_LAYOUT_MARKER,
  planningColWidthPercents,
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
  /** Clé de slide (ex. index) — force remise à l’échelle à chaque sous-onglet planning. */
  planningSlideKey?: string | number;
}

const PLANNING_COL_WIDTHS = planningColWidthPercents();

const PLANNING_COLGROUP = (
  <colgroup>
    <col style={{ width: PLANNING_COL_WIDTHS[0] }} />
    <col style={{ width: PLANNING_COL_WIDTHS[1] }} />
    <col style={{ width: `${PLANNING_TERRAIN_COL_MIN_PX}px` }} />
    <col style={{ width: PLANNING_COL_WIDTHS[3] }} />
    <col style={{ width: PLANNING_COL_WIDTHS[4] }} />
    <col style={{ width: PLANNING_COL_WIDTHS[5] }} />
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
  planningSlideKey = 0,
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

    let raf2 = 0;

    const apply = () => {
      const availW = page.clientWidth;
      const availH = page.clientHeight;
      const naturalH = Math.max(card.scrollHeight, card.offsetHeight);
      if (availW <= 0 || availH <= 0 || naturalH <= 0) return;

      const widthScale = Math.min(1, availW / baseWidth);
      const shellExtra = v2TableHeaders ? PLANNING_CARD_SHELL_EXTRA_PX : 0;
      const measuredH = naturalH + shellExtra;
      const refHeight = v2TableHeaders
        ? Math.max(
            measuredH,
            (planningReferenceHeight ?? 0) + shellExtra + PLANNING_SCALE_HEIGHT_BUFFER_PX
          )
        : measuredH;
      const fitAvailH = v2TableHeaders
        ? Math.max(1, availH - PLANNING_VERTICAL_FIT_INSET_PX)
        : availH;
      const heightScale = Math.min(
        1,
        fitAvailH / (refHeight + (v2TableHeaders ? PLANNING_SCALE_HEIGHT_BUFFER_PX : 0))
      );
      const uniform = Math.min(widthScale, heightScale);

      if (v2TableHeaders) {
        page.classList.add("engine-v2-planning-page");
      }

      setScale((prev) => (prev === uniform ? prev : uniform));
      setNaturalHeight((prev) => (prev === naturalH ? prev : naturalH));
    };

    apply();
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(apply);
    });
    const observer = new ResizeObserver(() => apply());
    observer.observe(page);
    observer.observe(card);
    const tbody = card.querySelector("tbody");
    if (tbody) observer.observe(tbody);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer.disconnect();
    };
  }, [
    capture,
    rows.length,
    baseWidth,
    planningReferenceHeight,
    v2TableHeaders,
    layoutFields.length,
    planningSlideKey,
  ]);

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
        <td className={`${LIVE_TABLE_CELL_NOTO_BOLD} ${nowrap} overflow-visible [text-overflow:clip]`}>
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

  const shellExtra = v2TableHeaders ? PLANNING_CARD_SHELL_EXTRA_PX : 0;
  const scaledShellHeight = (naturalHeight + shellExtra) * layoutScale;

  const pageStyle = {
    ...(sideMargin > 0 || verticalMargin > 0
      ? {
          paddingLeft: sideMargin,
          paddingRight: sideMargin,
          paddingTop: verticalMargin,
          paddingBottom: verticalMargin,
        }
      : {}),
    ...(v2TableHeaders
      ? {
          ["--ev2-planning-s" as string]: String(layoutScale),
          ["--live-display-scale" as string]: String(layoutScale),
        }
      : {}),
  };

  const pageAlignClass = v2TableHeaders
    ? "items-start justify-center"
    : "items-center justify-center";

  return (
    <div
      ref={pageRef}
      className={`flex min-h-0 flex-1 overflow-hidden bg-white ${pagePaddingClass} ${pageAlignClass}`}
      data-planning-layout={v2TableHeaders ? PLANNING_V2_LAYOUT_MARKER : undefined}
      style={Object.keys(pageStyle).length ? pageStyle : undefined}
    >
      <div
        className="relative shrink-0"
        style={{
          width: baseWidth * layoutScale,
          height: scaledShellHeight || undefined,
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
            ["--ev2-planning-s" as string]: String(layoutScale),
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

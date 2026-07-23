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
  LIVE_TABLE_CAPTURE_SHELL,
  LIVE_TABLE_CARD,
  LIVE_TABLE_CELL_POINTS,
  FINAL_TABLE_BODY_NOTO,
  FINAL_TABLE_BODY_TSL_BOLD,
  LIVE_TABLE_ROW,
} from "./liveDataTable";
import {
  useLiveTableHeadPresentation,
  LiveTableDisplayScaleProvider,
  useLiveTableShellClass,
} from "./liveTableTypography";
import { FINAL_EXPORT_CAPTURE_WIDTH } from "./exportCapture";

interface LiveFinalRankingTabProps {
  meta: LiveTournamentMeta;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  fields: Record<string, string>;
  /** En-têtes colonnes 12 pt (Engine V2). */
  v2TableHeaders?: boolean;
  /** Rendu statique pleine largeur pour la capture PDF (pas de mise à l'échelle). */
  capture?: boolean;
  /** Plage de places (incluse) à afficher, pour la pagination export (1-16 / 17-32). */
  placeRange?: [number, number];
}

/** Largeur live classement final (référence — convocations calées dessus). */
const FINAL_BASE_WIDTH = FINAL_EXPORT_CAPTURE_WIDTH;

const FINAL_COLGROUP = (
  <colgroup>
    <col className="w-[18%]" />
    <col />
    <col className="w-[22%]" />
  </colgroup>
);

export function LiveFinalRankingTab({
  meta,
  matches,
  matchResults,
  fields,
  v2TableHeaders = import.meta.env.VITE_DEPLOY_TARGET === "engine-v2",
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

  const headPresentation = useLiveTableHeadPresentation(v2TableHeaders);
  const tableClass = useLiveTableShellClass(
    capture ? LIVE_TABLE_CAPTURE : LIVE_TABLE,
    v2TableHeaders
  );

  const displayTeam = (team: string) => {
    const value = (team || "").trim();
    return value === "—" ? "" : value;
  };

  const bodyRows = rows.map((row) => (
    <tr key={row.place} className={LIVE_TABLE_ROW}>
      <td className={FINAL_TABLE_BODY_TSL_BOLD}>
        {formatPlaceLabel(row.place)}
      </td>
      <td className={FINAL_TABLE_BODY_NOTO}>
        {displayTeam(row.team)}
      </td>
      <td className={LIVE_TABLE_CELL_POINTS}>
        {row.points || <span className="text-arena-600/35">—</span>}
      </td>
    </tr>
  ));

  const table = (
    <table className={[tableClass, "table-fixed w-full"].join(" ")}>
      {FINAL_COLGROUP}
      <thead>
        <tr className="bg-template-blue text-white">
          <th className={headPresentation.className} style={headPresentation.style}>
            Place
          </th>
          <th className={headPresentation.className} style={headPresentation.style}>
            Équipe
          </th>
          <th
            className={`text-right ${headPresentation.className}`}
            style={headPresentation.style}
          >
            Points
          </th>
        </tr>
      </thead>
      <tbody className={capture ? "bg-white" : undefined}>{bodyRows}</tbody>
    </table>
  );

  if (capture) {
    return (
      <div
        className="flex w-full items-center justify-center bg-white"
        style={{ ["--live-display-scale" as string]: 1 }}
      >
        <div
          className="w-full"
          style={{ maxWidth: FINAL_EXPORT_CAPTURE_WIDTH }}
        >
          <div className={`${LIVE_TABLE_CAPTURE_SHELL} bg-template-blue`}>
            {table}
          </div>
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
        <LiveTableDisplayScaleProvider scale={scale}>
        <div
          ref={cardRef}
          className={`${LIVE_TABLE_CARD} absolute left-0 top-0`}
          style={{
            width: FINAL_BASE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            ["--live-display-scale" as string]: scale,
          }}
        >
          {table}
        </div>
        </LiveTableDisplayScaleProvider>
      </div>
    </div>
  );
}

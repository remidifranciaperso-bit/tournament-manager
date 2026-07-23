import { EXPORT_CAPTURE_WIDTH, FINAL_EXPORT_CAPTURE_WIDTH, PLANNING_EXPORT_CAPTURE_WIDTH, type ExportCaptureTarget } from "./exportCapture";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LiveManagerDocumentPage } from "./LiveManagerDocumentPage";
import { LivePlanningTab } from "./LivePlanningTab";
import { LivePoolsTab } from "./LivePoolsTab";
import { pageEntries, planningIndicesForPage, slideIndexAt } from "./liveTabs";
import type {
  LiveLayoutField,
  LivePageMap,
  LiveTournamentMeta,
  LiveMatch,
} from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import { LiveTableTypographyProvider } from "./liveTableTypography";

interface ExportCaptureLayerProps {
  target: ExportCaptureTarget | null;
  templateId: string;
  pageMap: LivePageMap;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  completed: Set<string>;
  planningLayout: Record<string, LiveLayoutField[]>;
  meta: LiveTournamentMeta;
  fields: Record<string, string>;
  packVersion?: string | null;
}

export function ExportCaptureLayer({
  target,
  templateId,
  pageMap,
  matches,
  matchResults,
  completed,
  planningLayout,
  meta,
  fields,
  packVersion = null,
}: ExportCaptureLayerProps) {
  if (!target) return null;

  const { section, subPage } = target;

  if (section === "pools") {
    const view = target.poolView ?? "composition";
    return (
      <div
        id="export-capture-layer"
        className="pointer-events-none fixed -left-[120vw] top-0 z-0 inline-block bg-white"
        style={{ width: EXPORT_CAPTURE_WIDTH }}
        aria-hidden
      >
        <LiveTableTypographyProvider meta={meta} packVersion={packVersion}>
        <LiveManagerDocumentPage
          club={meta.club}
          logoUrl={meta.logo_url}
          capture="pools"
          showFooter={false}
        >
          <LivePoolsTab
            view={view}
            matches={matches}
            matchResults={matchResults}
            fields={fields}
            capture
          />
        </LiveManagerDocumentPage>
        </LiveTableTypographyProvider>
      </div>
    );
  }

  if (section === "final") {
    const finalPages = pageEntries(pageMap, "final");
    const finalPageCount = Math.max(1, finalPages.length);
    const chunk = Math.ceil(meta.nb_equipes / finalPageCount);
    const placeRange: [number, number] = [
      subPage * chunk + 1,
      Math.min(meta.nb_equipes, (subPage + 1) * chunk),
    ];

    return (
      <div
        id="export-capture-layer"
        className="pointer-events-none fixed -left-[120vw] top-0 z-0 inline-block bg-white"
        style={{ width: FINAL_EXPORT_CAPTURE_WIDTH }}
        aria-hidden
      >
        <LiveTableTypographyProvider meta={meta} packVersion={packVersion}>
        <LiveManagerDocumentPage
          club={meta.club}
          logoUrl={meta.logo_url}
          capture="final"
          showFooter={false}
        >
          <LiveFinalRankingTab
            meta={meta}
            matches={matches}
            matchResults={matchResults}
            fields={fields}
            capture
            placeRange={finalPageCount > 1 ? placeRange : undefined}
          />
        </LiveManagerDocumentPage>
        </LiveTableTypographyProvider>
      </div>
    );
  }

  if (section === "planning") {
    const pages = pageEntries(pageMap, "planning");
    const slideIndex =
      pages.length > 1
        ? slideIndexAt(pages, subPage)
        : planningIndicesForPage(pageMap, subPage)[0] ?? null;
    if (slideIndex === null) return null;

    const layoutFields = planningLayout[String(slideIndex)] ?? [];

    return (
      <div
        id="export-capture-layer"
        className="pointer-events-none fixed -left-[120vw] top-0 z-0 inline-block bg-white"
        style={{ width: PLANNING_EXPORT_CAPTURE_WIDTH }}
        aria-hidden
      >
        <LiveTableTypographyProvider meta={meta} packVersion={packVersion}>
        <LiveManagerDocumentPage
          club={meta.club}
          logoUrl={meta.logo_url}
          capture="planning"
          showFooter={false}
        >
          <LivePlanningTab
            layoutFields={layoutFields}
            matches={matches}
            completed={completed}
            matchResults={matchResults}
            onToggleDone={() => {}}
            exportMode
            capture
          />
        </LiveManagerDocumentPage>
        </LiveTableTypographyProvider>
      </div>
    );
  }

  const pages = pageEntries(pageMap, section);
  const slideIndex = slideIndexAt(pages, subPage);
  if (slideIndex === null) return null;

  return (
    <div
      id="export-capture-layer"
      className="pointer-events-none fixed -left-[120vw] top-0 z-0 inline-block bg-white"
      style={{ width: EXPORT_CAPTURE_WIDTH }}
      aria-hidden
    >
      <LiveManagerDocumentPage
        club={meta.club}
        logoUrl={meta.logo_url}
        capture="bracket"
        showFooter={false}
      >
        <LiveBracketViewer
          templateId={templateId}
          slideIndex={slideIndex}
          matches={matches}
          matchResults={matchResults}
          fixedRenderWidth={EXPORT_CAPTURE_WIDTH}
          capture
        />
      </LiveManagerDocumentPage>
    </div>
  );
}

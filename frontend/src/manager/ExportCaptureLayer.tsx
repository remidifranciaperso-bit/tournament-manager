import { EXPORT_CAPTURE_WIDTH, PLANNING_EXPORT_CAPTURE_WIDTH, type ExportCaptureTarget } from "./exportCapture";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LiveManagerDocumentPage } from "./LiveManagerDocumentPage";
import { LivePlanningTab } from "./LivePlanningTab";
import { pageEntries, planningIndicesForPage, slideIndexAt } from "./liveTabs";
import type {
  LiveLayoutField,
  LivePageMap,
  LiveTournamentMeta,
  LiveMatch,
} from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";

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
}: ExportCaptureLayerProps) {
  if (!target) return null;

  const { section, subPage } = target;

  if (section === "final") {
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
          capture="final"
        >
          <LiveFinalRankingTab
            meta={meta}
            matches={matches}
            matchResults={matchResults}
            fields={fields}
            exportMode
          />
        </LiveManagerDocumentPage>
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
        <LiveManagerDocumentPage
          club={meta.club}
          logoUrl={meta.logo_url}
          capture="planning"
        >
          <LivePlanningTab
            layoutFields={layoutFields}
            matches={matches}
            completed={completed}
            matchResults={matchResults}
            onToggleDone={() => {}}
            exportMode
          />
        </LiveManagerDocumentPage>
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
      >
        <LiveBracketViewer
          templateId={templateId}
          slideIndex={slideIndex}
          matches={matches}
          matchResults={matchResults}
          fixedRenderWidth={EXPORT_CAPTURE_WIDTH}
        />
      </LiveManagerDocumentPage>
    </div>
  );
}

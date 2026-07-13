import { useEffect, useMemo, useState } from "react";
import { fetchTemplateLayout } from "./bracketSlideLayout";
import { LiveAvancementTab } from "./LiveAvancementTab";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LiveMatchsEnCoursTab } from "./LiveMatchsEnCoursTab";
import { LivePlanningTab } from "./LivePlanningTab";
import { LiveProchainsMatchsTab } from "./LiveProchainsMatchsTab";
import { LiveManagerDocumentPage } from "./LiveManagerDocumentPage";
import { LivePdfPage, livePagePngUrl } from "./LivePdfViewer";
import { LiveTabTitle } from "./LiveTabTitle";
import { resolveTemplateId } from "./resolveTemplateId";
import type { BroadcastableTab } from "./liveRetransmission";
import type { LiveTournamentData } from "./liveTypes";
import {
  broadcastTabBrushLabel,
  defaultMainSubPage,
  mainPageHiddenBrushReserveLabel,
  pageEntries,
  slideIndexAt,
} from "./liveTabs";
import { useLiveProgress } from "./useLiveProgress";

interface LiveBroadcastContentProps {
  liveData: LiveTournamentData;
  activeTab: BroadcastableTab;
  activeSubPage?: number;
}

function broadcastPanelClass(active: boolean) {
  return [
    "absolute inset-0 flex min-h-0 flex-col overflow-hidden transition-none",
    active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
  ].join(" ");
}

export function LiveBroadcastContent({
  liveData,
  activeTab,
  activeSubPage,
}: LiveBroadcastContentProps) {
  const {
    meta,
    matches,
    live_token,
    page_map,
    fields,
    planning_layout = {},
  } = liveData;

  const progress = useLiveProgress(live_token, matches.length, meta, {
    pollMs: 1500,
  });
  const templateId = useMemo(() => resolveTemplateId(meta), [meta]);

  const coverPageUrl = useMemo(
    () => livePagePngUrl(live_token, 0, 240),
    [live_token]
  );

  useEffect(() => {
    void fetchTemplateLayout(templateId);
    const coverPage = new Image();
    coverPage.decoding = "async";
    coverPage.src = coverPageUrl;
  }, [templateId, coverPageUrl]);

  const mainPages = useMemo(() => pageEntries(page_map, "main"), [page_map]);
  const classementPages = useMemo(
    () => pageEntries(page_map, "classement"),
    [page_map]
  );
  const planningPages = useMemo(
    () => pageEntries(page_map, "planning"),
    [page_map]
  );

  const mainPage =
    activeTab === "main" && activeSubPage !== undefined
      ? activeSubPage
      : defaultMainSubPage(mainPages, matches, progress.completed);
  const classementPage =
    activeTab === "classement" && activeSubPage !== undefined
      ? activeSubPage
      : 0;
  const planningPage =
    activeTab === "planning" && activeSubPage !== undefined
      ? activeSubPage
      : 0;

  const mainSlideIndex = slideIndexAt(mainPages, mainPage);
  const classementSlideIndex = slideIndexAt(classementPages, classementPage);
  const planningSlideIndex = slideIndexAt(planningPages, planningPage);

  const tabLabel = useMemo(
    () =>
      broadcastTabBrushLabel(activeTab, {
        main: mainPages,
        classement: classementPages,
        planning: planningPages,
        mainPage,
        classementPage,
        planningPage,
      }),
    [
      activeTab,
      mainPages,
      classementPages,
      planningPages,
      mainPage,
      classementPage,
      planningPage,
    ]
  );

  const tabTitleReserveLabel = useMemo(() => {
    if (activeTab !== "main") return null;
    return mainPageHiddenBrushReserveLabel(mainPages[mainPage]);
  }, [activeTab, mainPages, mainPage]);

  const [awaitingLaunch] = useState(() => new Set<string>());

  return (
    <div className="pointer-events-none flex h-dvh w-full flex-col overflow-hidden bg-white select-none">
      {activeTab !== "cover" ? (
        <div className="flex shrink-0 items-end justify-center px-4 pb-2 pt-1 min-h-[clamp(2.75rem,6vw,3.75rem)] sm:px-6 sm:pb-3">
          <LiveTabTitle label={tabLabel} reserveLabel={tabTitleReserveLabel} />
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className={[
            broadcastPanelClass(activeTab === "cover"),
            activeTab === "cover" ? "flex min-h-0 flex-1 flex-col" : "",
          ].join(" ")}
        >
          <LivePdfPage pageUrl={coverPageUrl} />
        </div>

        <div className={broadcastPanelClass(activeTab === "live")}>
          <LiveMatchsEnCoursTab
            broadcast
            terrains={meta.terrains}
            matches={matches}
            meta={meta}
            started={progress.started}
            completed={progress.completed}
            matchResults={progress.matchResults}
            liveToken={live_token}
            pdfFilename={liveData.pdf_filename}
            exportPayload={{
              page_map,
              template_id: templateId,
              matches,
              match_results: {},
              completed: [],
              fields,
              planning_layout,
              nb_equipes: meta.nb_equipes,
            }}
            captureExportPages={async () => ({})}
            exportingPdf={false}
            onExportPhaseChange={() => {}}
            onStart={() => {}}
            onCompleteMatch={() => {}}
            onRecordMatchLaunch={() => {}}
            awaitingLaunch={awaitingLaunch}
            setAwaitingLaunch={() => undefined}
            forcedUpcomingByTerrain={progress.forcedUpcomingByTerrain}
            clearForcedForTerrain={() => {}}
          />
        </div>

        <div className={broadcastPanelClass(activeTab === "upcoming")}>
          <LiveProchainsMatchsTab
            broadcast
            terrains={meta.terrains}
            matches={matches}
            meta={meta}
            completed={progress.completed}
            matchResults={progress.matchResults}
            started={progress.started}
            awaitingLaunch={awaitingLaunch}
            forcedUpcomingByTerrain={progress.forcedUpcomingByTerrain}
            applyForcedUpcoming={() => {}}
          />
        </div>

        <div className={broadcastPanelClass(activeTab === "avancement")}>
          <LiveAvancementTab
            elapsed={progress.elapsed}
            done={progress.done}
            total={progress.total}
            percent={progress.percent}
            club={meta.club}
            logoUrl={meta.logo_url}
            matchResults={progress.matchResults}
            matchLaunches={progress.matchLaunches}
            started={progress.started}
            finished={progress.finished}
          />
        </div>

        <div className={broadcastPanelClass(activeTab === "main")}>
          {mainSlideIndex !== null ? (
            <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
              <LiveBracketViewer
                templateId={templateId}
                slideIndex={mainSlideIndex}
                matches={matches}
                matchResults={progress.matchResults}
              />
            </LiveManagerDocumentPage>
          ) : null}
        </div>

        <div className={broadcastPanelClass(activeTab === "classement")}>
          {classementSlideIndex !== null ? (
            <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
              <LiveBracketViewer
                templateId={templateId}
                slideIndex={classementSlideIndex}
                matches={matches}
                matchResults={progress.matchResults}
              />
            </LiveManagerDocumentPage>
          ) : null}
        </div>

        <div className={broadcastPanelClass(activeTab === "planning")}>
          {planningSlideIndex !== null ? (
            <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
              <LivePlanningTab
                layoutFields={planning_layout[String(planningSlideIndex)] ?? []}
                matches={matches}
                completed={progress.completed}
                matchResults={progress.matchResults}
                onToggleDone={() => {}}
                exportMode
              />
            </LiveManagerDocumentPage>
          ) : null}
        </div>

        <div className={broadcastPanelClass(activeTab === "final")}>
          <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
            <LiveFinalRankingTab
              meta={meta}
              matches={matches}
              matchResults={progress.matchResults}
              fields={fields}
            />
          </LiveManagerDocumentPage>
        </div>
      </div>
    </div>
  );
}

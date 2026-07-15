import { useEffect, useMemo, useRef, useState } from "react";
import { fetchTemplateLayout } from "./bracketSlideLayout";
import { poolLetters } from "./buildPoolStandings";
import { LivePoolsTab } from "./LivePoolsTab";
import { LiveAvancementTab } from "./LiveAvancementTab";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveBracketCrossPageOverlay } from "./LiveBracketCrossPageOverlay";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LiveMatchsEnCoursTab } from "./LiveMatchsEnCoursTab";
import { LivePlanningTab } from "./LivePlanningTab";
import { LiveProchainsMatchsTab } from "./LiveProchainsMatchsTab";
import { LiveManagerDocumentPage } from "./LiveManagerDocumentPage";
import { LivePdfPage } from "./LivePdfViewer";
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
    "absolute inset-0 flex min-h-0 flex-col overflow-hidden",
    active ? "z-10" : "pointer-events-none z-0 opacity-0",
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

  const coverPageUrl = `/api/live/${live_token}/page/0.png?dpi=240`;

  useEffect(() => {
    void fetchTemplateLayout(templateId);
    const coverPage = new Image();
    coverPage.decoding = "async";
    coverPage.src = coverPageUrl;
  }, [templateId, coverPageUrl]);

  const poolLettersList = useMemo(() => poolLetters(matches), [matches]);

  const mainPages = useMemo(() => {
    const all = pageEntries(page_map, "main");
    const poolCount = poolLettersList.length;
    if (poolCount === 0) return all;
    // Format à poules : les poolCount premières pages sont les poules (onglet
    // dédié) ; le bracket restant est ré-étiqueté comme les formats sans poule
    // (1 page = Tableau principal, 2 = Partie haute/basse → titre « Tableau
    // principal » en haut, rien en bas via formatPageBrushLabel).
    const bracket = all.slice(poolCount);
    if (bracket.length === 1) {
      return [{ ...bracket[0], label: "Tableau principal" }];
    }
    if (bracket.length === 2) {
      return [
        { ...bracket[0], label: "Partie haute" },
        { ...bracket[1], label: "Partie basse" },
      ];
    }
    return bracket;
  }, [page_map, poolLettersList]);
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

  const poulesPage =
    activeTab === "poules" && activeSubPage !== undefined ? activeSubPage : 0;
  const poulesLabel =
    poulesPage === 0
      ? "Composition des poules"
      : `Poule ${poolLettersList[poulesPage - 1] ?? ""}`;

  const [awaitingLaunch] = useState(() => new Set<string>());
  const broadcastMainShellRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={broadcastMainShellRef}
      className="pointer-events-none relative flex h-dvh w-full flex-col overflow-hidden bg-white select-none"
    >
      {/* La page de garde occupe toute la fenêtre (aucun titre) pour rester
          centrée verticalement ; les autres onglets gardent leur bandeau titre. */}
      {activeTab !== "cover" ? (
        <div className="flex shrink-0 items-end justify-center px-4 pb-2 pt-1 min-h-[clamp(2.75rem,6vw,3.75rem)] sm:px-6 sm:pb-3">
          <LiveTabTitle
            label={activeTab === "poules" ? poulesLabel : tabLabel}
            reserveLabel={tabTitleReserveLabel}
          />
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className={broadcastPanelClass(activeTab === "cover")}>
          <LivePdfPage pageUrl={coverPageUrl} />
        </div>

        <div className={broadcastPanelClass(activeTab === "poules")}>
          <LiveManagerDocumentPage club={meta.club} logoUrl={meta.logo_url}>
            <LivePoolsTab
              view={
                poulesPage === 0
                  ? "composition"
                  : { letter: poolLettersList[poulesPage - 1] }
              }
              matches={matches}
              matchResults={progress.matchResults}
              fields={fields}
            />
          </LiveManagerDocumentPage>
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
            exportPhase="idle"
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
      {activeTab === "main" ? (
        <LiveBracketCrossPageOverlay
          shellRef={broadcastMainShellRef}
          activeKey={`${activeTab}:main:${mainPage}`}
          slideSelector=".z-10 [data-bracket-slide]"
        />
      ) : null}
    </div>
  );
}

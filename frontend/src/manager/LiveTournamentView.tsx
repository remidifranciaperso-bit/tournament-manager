import { useCallback, useMemo, useRef, useState } from "react";
import { CourtBackground } from "../components/CourtBackground";
import type { TournamentForm } from "../types";
import { LiveAvancementTab } from "./LiveAvancementTab";
import { LiveMatchsEnCoursTab } from "./LiveMatchsEnCoursTab";
import { LiveProchainsMatchsTab } from "./LiveProchainsMatchsTab";
import { LiveBracketViewer } from "./LiveBracketViewer";
import { LiveFinalRankingTab } from "./LiveFinalRankingTab";
import { LivePlanningTab } from "./LivePlanningTab";
import { resolveTemplateId } from "./resolveTemplateId";
import type { LiveTournamentData } from "./liveTypes";
import {
  LIVE_PRIMARY_TABS,
  LIVE_TAB_WIDTH_CLASS,
  pageEntries,
  planningIndicesForPage,
  slideIndexAt,
  subTabLabels,
  type LivePrimaryTab,
} from "./liveTabs";
import { LiveTabTitle } from "./LiveTabTitle";
import { useLiveProgress } from "./useLiveProgress";
import type { LivePdfExportPayload } from "./LivePdfViewer";
import { captureManagerExportPages } from "./captureExportPages";
import type { ExportPhase } from "./exportCapture";

const TAB_BASE =
  "min-w-0 truncate rounded-lg px-1 py-2.5 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide transition sm:px-1.5 sm:py-3 sm:text-[10px]";

function tabClass(active: boolean) {
  return [
    TAB_BASE,
    active
      ? "bg-lime/15 text-lime ring-1 ring-lime/35"
      : "bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white/70",
  ].join(" ");
}

interface LiveTournamentViewProps {
  form: TournamentForm;
  nbEquipes: number;
  liveData: LiveTournamentData;
}

export function LiveTournamentView({ liveData }: LiveTournamentViewProps) {
  const {
    page_map,
    live_token,
    matches,
    meta,
    fields,
    planning_layout = {},
    pdf_filename,
  } = liveData;

  const progress = useLiveProgress(live_token, matches.length, meta);
  const templateId = useMemo(() => resolveTemplateId(meta), [meta]);

  const exportPayload = useMemo<LivePdfExportPayload>(() => {
    const match_results: LivePdfExportPayload["match_results"] = {};
    for (const [code, result] of Object.entries(progress.matchResults)) {
      match_results[code] = {
        winner: result.winner,
        loser: result.loser,
        display: result.display,
      };
    }

    return {
      page_map,
      template_id: templateId,
      matches,
      match_results,
      completed: [...progress.completed],
      fields,
      planning_layout: planning_layout ?? {},
      nb_equipes: meta.nb_equipes,
    };
  }, [
    page_map,
    templateId,
    matches,
    progress.matchResults,
    progress.completed,
    fields,
    planning_layout,
    meta.nb_equipes,
  ]);

  const mainPages = useMemo(() => pageEntries(page_map, "main"), [page_map]);
  const classementPages = useMemo(
    () => pageEntries(page_map, "classement"),
    [page_map]
  );
  const planningPages = useMemo(
    () => pageEntries(page_map, "planning"),
    [page_map]
  );
  const finalPages = useMemo(() => pageEntries(page_map, "final"), [page_map]);

  const [primaryTab, setPrimaryTab] = useState<LivePrimaryTab>("live");
  const [mainPage, setMainPage] = useState(0);
  const [classementPage, setClassementPage] = useState(0);
  const [planningPage, setPlanningPage] = useState(0);
  const [exportPhase, setExportPhase] = useState<ExportPhase>("idle");
  const exportCapturing = exportPhase === "capture";
  const exportUploading = exportPhase === "upload";
  const exportingPdf = exportPhase !== "idle";
  const savedViewRef = useRef({
    tab: "live" as LivePrimaryTab,
    main: 0,
    classement: 0,
    planning: 0,
  });

  const captureExportPages = useCallback(async () => {
    savedViewRef.current = {
      tab: primaryTab,
      main: mainPage,
      classement: classementPage,
      planning: planningPage,
    };

    return captureManagerExportPages(page_map, {
      showPage: (tab, subPage) => {
        setPrimaryTab(tab);
        if (tab === "main") setMainPage(subPage);
        else if (tab === "classement") setClassementPage(subPage);
        else if (tab === "planning") setPlanningPage(subPage);
      },
      restore: () => {
        const saved = savedViewRef.current;
        setPrimaryTab(saved.tab);
        setMainPage(saved.main);
        setClassementPage(saved.classement);
        setPlanningPage(saved.planning);
      },
    });
  }, [page_map, primaryTab, mainPage, classementPage, planningPage]);

  const activeSubPages = useMemo(() => {
    switch (primaryTab) {
      case "main":
        return subTabLabels(mainPages);
      case "classement":
        return subTabLabels(classementPages);
      case "planning":
        return subTabLabels(planningPages);
      default:
        return [];
    }
  }, [primaryTab, mainPages, classementPages, planningPages]);

  const showSubTabs = activeSubPages.length > 1;

  const subTabs = useMemo(() => {
    const pageState =
      primaryTab === "main"
        ? mainPage
        : primaryTab === "classement"
          ? classementPage
          : planningPage;

    return activeSubPages.map((label, i) => ({
      key: `${primaryTab}-${i}`,
      label,
      active: i === pageState,
      onSelect: () => {
        if (primaryTab === "main") setMainPage(i);
        else if (primaryTab === "classement") setClassementPage(i);
        else setPlanningPage(i);
      },
    }));
  }, [activeSubPages, primaryTab, mainPage, classementPage, planningPage]);

  const selectPrimary = (id: LivePrimaryTab) => {
    setPrimaryTab(id);
    if (id === "main") setMainPage(0);
    if (id === "classement") setClassementPage(0);
    if (id === "planning") setPlanningPage(0);
  };

  const slideIndices = useMemo(() => {
    switch (primaryTab) {
      case "main": {
        const index = slideIndexAt(mainPages, mainPage);
        return index !== null ? [index] : [];
      }
      case "classement": {
        const index = slideIndexAt(classementPages, classementPage);
        return index !== null ? [index] : [];
      }
      case "planning": {
        if (planningPages.length > 1) {
          const index = slideIndexAt(planningPages, planningPage);
          return index !== null ? [index] : [];
        }
        return planningIndicesForPage(page_map, planningPage);
      }
      case "final": {
        const index = slideIndexAt(finalPages, 0);
        return index !== null ? [index] : [];
      }
      default:
        return [];
    }
  }, [
    primaryTab,
    mainPages,
    mainPage,
    classementPages,
    classementPage,
    planningPage,
    page_map,
    finalPages,
    planningPages,
  ]);

  const renderContent = () => {
    switch (primaryTab) {
      case "avancement":
        return (
          <LiveAvancementTab
            elapsed={progress.elapsed}
            done={progress.done}
            total={progress.total}
            percent={progress.percent}
          />
        );
      case "live":
        return (
          <LiveMatchsEnCoursTab
            terrains={meta.terrains}
            matches={matches}
            meta={meta}
            started={progress.started}
            completed={progress.completed}
            matchResults={progress.matchResults}
            liveToken={live_token}
            pdfFilename={pdf_filename}
            exportPayload={exportPayload}
            captureExportPages={captureExportPages}
            exportingPdf={exportingPdf}
            onExportPhaseChange={setExportPhase}
            onStart={progress.startTournament}
            onCompleteMatch={progress.completeMatch}
          />
        );
      case "upcoming":
        return (
          <LiveProchainsMatchsTab
            terrains={meta.terrains}
            matches={matches}
            completed={progress.completed}
            matchResults={progress.matchResults}
            started={progress.started}
          />
        );
      case "main":
      case "classement": {
        const slideIndex = slideIndices[0];
        if (slideIndex === undefined) {
          return (
            <p className="py-8 text-center text-sm text-arena-600/55">
              Aucune page disponible pour cet onglet.
            </p>
          );
        }
        return (
          <LiveBracketViewer
            templateId={templateId}
            slideIndex={slideIndex}
            matches={matches}
            matchResults={progress.matchResults}
            captureMode={exportCapturing}
          />
        );
      }
      case "final":
        return (
          <LiveFinalRankingTab
            meta={meta}
            matches={matches}
            matchResults={progress.matchResults}
            fields={fields}
          />
        );
      case "planning": {
        const slideIndex = slideIndices[0];
        if (slideIndex === undefined) {
          return (
            <p className="py-8 text-center text-sm text-arena-600/55">
              Aucune page disponible pour cet onglet.
            </p>
          );
        }
        const layoutFields = planning_layout[String(slideIndex)] ?? [];
        return (
          <LivePlanningTab
            layoutFields={layoutFields}
            matches={matches}
            completed={progress.completed}
            matchResults={progress.matchResults}
            onToggleDone={progress.toggleMatch}
          />
        );
      }
      default:
        return null;
    }
  };

  const isBracketTab =
    primaryTab === "main" ||
    primaryTab === "classement" ||
    primaryTab === "final" ||
    primaryTab === "planning";

  const isProjectionTab = primaryTab === "live" || primaryTab === "upcoming";
  const isWhitePanelTab = isProjectionTab || isBracketTab || primaryTab === "avancement";

  const activeTabLabel =
    LIVE_PRIMARY_TABS.find((tab) => tab.id === primaryTab)?.label ?? "";

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-arena-950 text-white">
      <CourtBackground />

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
        <h1
          className="shrink-0 whitespace-nowrap text-center font-brush text-[clamp(1.35rem,3.2vw,2.35rem)] leading-none text-lime"
          style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
        >
          PADEL TOURNAMENT MANAGER
        </h1>

        <div className="mt-3 flex shrink-0 gap-0.5 overflow-hidden sm:gap-1">
          {LIVE_PRIMARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectPrimary(tab.id)}
              className={[tabClass(primaryTab === tab.id), "flex-1"].join(" ")}
              title={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showSubTabs && (
          <div className="mt-2 flex shrink-0 justify-center gap-1 overflow-hidden">
            {subTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={tab.onSelect}
                className={[tabClass(tab.active), LIVE_TAB_WIDTH_CLASS, "shrink-0"].join(
                  " "
                )}
                title={tab.label}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div
          className={[
            "mt-3 flex min-h-0 flex-1 select-none flex-col overflow-hidden rounded-2xl border",
            isWhitePanelTab
              ? "border-arena-600/15 bg-white"
              : "border-lime/15 bg-arena-900/45 backdrop-blur-xl",
            primaryTab === "planning" ? "touch-manipulation" : "touch-none",
          ].join(" ")}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!exportCapturing && !exportUploading && (
              <LiveTabTitle label={activeTabLabel} />
            )}
            <div
              className={
                isBracketTab
                  ? primaryTab === "planning"
                    ? "flex min-h-0 flex-1 flex-col overflow-hidden touch-manipulation"
                    : "flex min-h-0 flex-1 flex-col overflow-hidden touch-none"
                  : isProjectionTab
                    ? "flex min-h-0 flex-1 flex-col overflow-hidden touch-none"
                    : "flex min-h-0 flex-1 flex-col overflow-y-auto"
              }
            >
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      {exportUploading && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-arena-950/55">
          <p className="rounded-xl bg-white px-6 py-4 text-center font-semibold text-arena-800 shadow-lg">
            Génération du PDF…
          </p>
        </div>
      )}
    </div>
  );
}

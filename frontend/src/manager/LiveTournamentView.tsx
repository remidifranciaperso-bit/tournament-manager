import { useMemo, useState } from "react";
import { CourtBackground } from "../components/CourtBackground";
import type { TournamentForm } from "../types";
import { LivePdfViewer, downloadEnginePdf } from "./LivePdfViewer";
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

const TAB_BASE =
  "min-w-0 truncate rounded-lg px-1.5 py-3 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide transition sm:px-2 sm:text-[11px]";

function tabClass(active: boolean) {
  return [
    TAB_BASE,
    active
      ? "bg-lime/15 text-lime ring-1 ring-lime/35"
      : "bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white/70",
  ].join(" ");
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <p className="max-w-md text-center text-sm text-white/40">
        Contenu « {label} » — à venir.
      </p>
    </div>
  );
}

interface LiveTournamentViewProps {
  form: TournamentForm;
  nbEquipes: number;
  liveData: LiveTournamentData;
}

export function LiveTournamentView({ liveData }: LiveTournamentViewProps) {
  const { page_map, live_token, page_sizes, pdf_filename } = liveData;

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

  const [primaryTab, setPrimaryTab] = useState<LivePrimaryTab>("main");
  const [mainPage, setMainPage] = useState(0);
  const [classementPage, setClassementPage] = useState(0);
  const [planningPage, setPlanningPage] = useState(0);

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
  ]);

  const content = useMemo(() => {
    switch (primaryTab) {
      case "live":
        return <PlaceholderTab label="Matchs en cours" />;
      case "upcoming":
        return <PlaceholderTab label="Prochains matchs" />;
      case "main":
      case "classement":
      case "planning":
      case "final":
        return (
          <LivePdfViewer
            liveToken={live_token}
            pageSizes={page_sizes}
            slideIndices={slideIndices}
          />
        );
      default:
        return null;
    }
  }, [primaryTab, live_token, page_sizes, slideIndices]);

  const isSlideTab =
    primaryTab === "main" ||
    primaryTab === "classement" ||
    primaryTab === "planning" ||
    primaryTab === "final";

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

        <div className="mt-3 flex shrink-0 gap-1 overflow-hidden">
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

        {live_token && (
          <div className="mt-2 flex shrink-0 justify-end">
            <button
              type="button"
              onClick={() =>
                downloadEnginePdf(live_token, pdf_filename || "tournoi.pdf")
              }
              className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/55 transition hover:bg-white/[0.1] hover:text-white/80 sm:text-[11px]"
            >
              Télécharger PDF Engine
            </button>
          </div>
        )}

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

        <div className="mt-3 flex min-h-0 flex-1 touch-none select-none flex-col overflow-hidden rounded-2xl border border-lime/15 bg-arena-900/45 backdrop-blur-xl">
          <div
            className={
              isSlideTab
                ? "flex min-h-0 flex-1 flex-col overflow-hidden touch-none"
                : "flex min-h-0 flex-1 flex-col overflow-y-auto"
            }
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

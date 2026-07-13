import { useMemo, useState } from "react";
import { PrimaryButton } from "../components/ui";
import {
  broadcastableTabs,
  DEFAULT_BROADCAST_TABS,
  DEFAULT_ROTATION_SECONDS,
  RETRANSMISSION_MODES,
  type BroadcastableTab,
  type RetransmissionMode,
} from "./liveRetransmission";
import {
  buildAffichageUrl,
  createOutputToken,
  listBroadcastOutputs,
  saveBroadcastOutput,
  type BroadcastOutput,
} from "./liveBroadcastStore";
import { openBroadcastWindow } from "./displayWindow";
import {
  useDisplayDetection,
  type DetectedDisplay,
} from "./useDisplayDetection";
import { extendedModeHint } from "./displayWindow";

interface LiveRetransmissionTabProps {
  liveToken: string;
  classementPageCount: number;
  active: boolean;
}

function SectionTitle({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-arena-600/45">
        Étape {step}
      </p>
      <h3 className="mt-1 font-display text-lg text-arena-700 sm:text-xl">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-sm leading-snug text-arena-600/50">{subtitle}</p>
      ) : null}
    </div>
  );
}

function DisplayStatusBadge({ display }: { display: DetectedDisplay }) {
  const label =
    display.status === "connecting" ? "Connexion…" : "Connecté";

  const tone =
    display.status === "connecting"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
      : "border-template-blue/25 bg-template-blue/10 text-template-blue";

  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function DisplayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="13" rx="1.5" />
      <path d="M8 21h8" strokeLinecap="round" />
      <path d="M12 17v4" strokeLinecap="round" />
      <circle cx="18" cy="7" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ModeOptionCard({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition",
        active
          ? "border-template-blue/35 bg-template-blue/[0.06] ring-1 ring-template-blue/20"
          : "border-arena-600/15 bg-white hover:border-arena-600/30 hover:shadow-sm",
      ].join(" ")}
    >
      <p className="font-semibold text-arena-700">{title}</p>
      <p className="text-xs leading-snug text-arena-600/50">{subtitle}</p>
    </button>
  );
}

export function LiveRetransmissionTab({
  liveToken,
  classementPageCount,
  active,
}: LiveRetransmissionTabProps) {
  const { displays, layoutMode, extendedMode, scanning, apiSupported, error, scan } =
    useDisplayDetection(active);

  const tabOptions = useMemo(
    () => broadcastableTabs(classementPageCount),
    [classementPageCount]
  );

  const [selectedDisplayIds, setSelectedDisplayIds] = useState<string[]>([]);
  const [mode, setMode] = useState<RetransmissionMode | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<Set<BroadcastableTab>>(
    () => new Set(DEFAULT_BROADCAST_TABS)
  );
  const [fixedTab, setFixedTab] = useState<BroadcastableTab>("live");
  const [launchedOutputs, setLaunchedOutputs] = useState<BroadcastOutput[]>(() =>
    listBroadcastOutputs(liveToken)
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const tabList = useMemo(() => {
    const ordered = tabOptions.map((entry) => entry.id);
    return ordered.filter((id) => selectedTabs.has(id));
  }, [tabOptions, selectedTabs]);

  const toggleDisplay = (id: string) => {
    setSelectedDisplayIds((prev) => {
      if (mode === "multi") {
        return prev.includes(id)
          ? prev.filter((entry) => entry !== id)
          : [...prev, id];
      }
      return prev[0] === id ? [] : [id];
    });
  };

  const toggleTab = (tab: BroadcastableTab) => {
    setSelectedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      const nextList = [...next];
      if (!nextList.includes(fixedTab) && nextList.length > 0) {
        setFixedTab(nextList[0]);
      }
      return next;
    });
  };

  const canConfigureTabs =
    selectedDisplayIds.length > 0 && mode !== null && selectedTabs.size > 0;
  const canConfigureTest = mode !== null && selectedTabs.size > 0;
  const canLaunch = canConfigureTabs;

  const summaryLines = useMemo(() => {
    if (selectedDisplayIds.length === 0) return [];
    const names = displays
      .filter((d) => selectedDisplayIds.includes(d.id))
      .map((d) => d.label);
    const tabLabels = tabOptions
      .filter((t) => selectedTabs.has(t.id))
      .map((t) => t.label);
    const modeLabel =
      RETRANSMISSION_MODES.find((m) => m.id === mode)?.title ?? "—";

    return [
      `Écran${names.length > 1 ? "s" : ""} : ${names.join(", ")}`,
      `Mode : ${modeLabel}`,
      `Onglets : ${tabLabels.join(" · ") || "—"}`,
    ];
  }, [selectedDisplayIds, displays, tabOptions, selectedTabs, mode]);

  const handleCopyUrl = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(label);
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Copie impossible");
    }
  };

  const createOutputs = (
    displayTargets: DetectedDisplay[],
    openWindows: boolean
  ): BroadcastOutput[] => {
    if (!mode || tabList.length === 0) return [];

    const targets =
      displayTargets.length > 0
        ? displayTargets
        : [
            {
              id: "url-only",
              label: "Affichage URL (test)",
              left: 0,
              top: 0,
              width: 1280,
              height: 720,
              isPrimary: false,
              isInternal: false,
              status: "connected" as const,
            },
          ];

    return targets.map((display, index) => {
      const dedicatedTab =
        mode === "multi" ? tabList[index % tabList.length] : null;

      const output: BroadcastOutput = {
        version: 1,
        outputToken: createOutputToken(),
        liveToken,
        displayId: display.id,
        displayLabel: display.label,
        mode,
        tabs: tabList,
        fixedTab: mode === "fixed" || mode === "mirror" ? fixedTab : null,
        dedicatedTab,
        rotationSeconds: DEFAULT_ROTATION_SECONDS,
        createdAt: Date.now(),
      };

      saveBroadcastOutput(output);

      if (openWindows) {
        const url = buildAffichageUrl(output.outputToken);
        const opened =
          display.id !== "url-only"
            ? openBroadcastWindow(url, display)
            : null;
        if (!opened) {
          window.open(url, `broadcast-${output.outputToken}`, "noopener");
        }
      }

      return output;
    });
  };

  const handleLaunch = () => {
    const displayTargets = displays.filter((d) =>
      selectedDisplayIds.includes(d.id)
    );
    createOutputs(displayTargets, true);
    setLaunchedOutputs(listBroadcastOutputs(liveToken));
  };

  const handleLaunchTestUrl = () => {
    createOutputs([], true);
    setLaunchedOutputs(listBroadcastOutputs(liveToken));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <SectionTitle
                step={1}
                title="Écrans détectés"
                subtitle="Sélectionnez le rétroprojecteur ou l'écran de retransmission."
              />
              <button
                type="button"
                onClick={() => void scan()}
                disabled={scanning}
                className="shrink-0 rounded-lg border border-arena-600/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-arena-600/70 transition hover:border-arena-600/40 hover:text-arena-700 disabled:opacity-50"
              >
                {scanning ? "Analyse…" : "Actualiser"}
              </button>
            </div>

            {error ? (
              <p className="mb-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            {!apiSupported ? (
              <p className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-800">
                Détection automatique indisponible sur ce navigateur. Utilisez
                Chrome pour lister les écrans externes branchés.
              </p>
            ) : null}

            {apiSupported && !extendedMode ? (
              <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm text-amber-900">
                <span className="font-semibold">Mode étendu requis.</span>{" "}
                Avec un câble HDMI branché, passez en affichage{" "}
                <strong>étendu</strong> (pas dupliquer / miroir) pour que le
                rétro soit détecté et que l&apos;URL s&apos;y ouvre
                automatiquement — sans choix d&apos;écran.
                <span className="mt-2 block text-xs text-amber-800/90">
                  {extendedModeHint()}
                </span>
              </p>
            ) : null}

            {apiSupported && extendedMode && displays.length > 0 ? (
              <p className="mb-3 rounded-xl border border-template-blue/20 bg-template-blue/[0.05] px-4 py-3 text-sm text-arena-700">
                Mode étendu détecté — la retransmission s&apos;ouvrira
                automatiquement sur l&apos;écran externe sélectionné.
              </p>
            ) : null}

            {import.meta.env.DEV && displays.some((d) => d.id.startsWith("mock-")) ? (
              <p className="mb-3 rounded-xl border border-arena-600/15 bg-arena-600/[0.04] px-4 py-3 text-xs text-arena-600/60">
                Mode simulation : écrans fictifs pour tester sans rétro branché.
                Le lancement ouvre un nouvel onglet navigateur.
              </p>
            ) : null}

            {displays.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-arena-600/20 bg-arena-600/[0.03] px-5 py-8 text-center">
                <p className="text-sm font-medium text-arena-700">
                  {layoutMode === "mirror_or_single" && apiSupported
                    ? "Rétro non visible — passez en mode étendu"
                    : "Aucun rétroprojecteur détecté"}
                </p>
                <p className="mt-2 text-sm text-arena-600/50">
                  {layoutMode === "mirror_or_single" && apiSupported
                    ? "En mode dupliquer, le navigateur ne voit qu'un seul écran. Basculez en étendu : le rétro apparaîtra ici sans dialogue de choix."
                    : "Branchez un écran externe (HDMI, USB-C…) — la liste se met à jour automatiquement."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {displays.map((display) => {
                  const selected = selectedDisplayIds.includes(display.id);
                  return (
                    <button
                      key={display.id}
                      type="button"
                      onClick={() => toggleDisplay(display.id)}
                      className={[
                        "flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-template-blue/40 bg-template-blue/[0.06] ring-1 ring-template-blue/20"
                          : "border-arena-600/15 bg-white hover:border-arena-600/30 hover:shadow-sm",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={[
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            selected
                              ? "bg-template-blue/15 text-template-blue"
                              : "bg-arena-600/8 text-arena-600/55",
                          ].join(" ")}
                        >
                          <DisplayIcon />
                        </div>
                        <DisplayStatusBadge display={display} />
                      </div>
                      <div>
                        <p className="font-semibold text-arena-700">
                          {display.label}
                        </p>
                        <p className="mt-1 text-xs text-arena-600/45">
                          {display.width} × {display.height}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {selectedDisplayIds.length > 0 ? (
            <section>
              <SectionTitle
                step={2}
                title="Mode de retransmission"
                subtitle={
                  mode === "multi"
                    ? "Sélection multiple d'écrans activée."
                    : "Un seul écran à la fois pour ce mode."
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {RETRANSMISSION_MODES.map((option) => (
                  <ModeOptionCard
                    key={option.id}
                    active={mode === option.id}
                    title={option.title}
                    subtitle={option.subtitle}
                    onClick={() => {
                      setMode(option.id);
                      if (option.id !== "multi" && selectedDisplayIds.length > 1) {
                        setSelectedDisplayIds((prev) => prev.slice(0, 1));
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          ) : displays.length === 0 ? (
            <section>
              <SectionTitle
                step={2}
                title="Mode de retransmission (test URL)"
                subtitle="Sans rétro branché, vous pouvez quand même générer une URL et l'ouvrir dans un autre onglet."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {RETRANSMISSION_MODES.filter((option) => option.id !== "multi").map(
                  (option) => (
                    <ModeOptionCard
                      key={option.id}
                      active={mode === option.id}
                      title={option.title}
                      subtitle={option.subtitle}
                      onClick={() => setMode(option.id)}
                    />
                  )
                )}
              </div>
            </section>
          ) : null}

          {canConfigureTabs || canConfigureTest ? (
            <section>
              <SectionTitle
                step={3}
                title="Onglets à afficher"
                subtitle="Cochez les vues à diffuser sur l'écran sélectionné."
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {tabOptions.map((tab) => {
                  const checked = selectedTabs.has(tab.id);
                  return (
                    <label
                      key={tab.id}
                      className={[
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                        checked
                          ? "border-template-blue/30 bg-template-blue/[0.05]"
                          : "border-arena-600/15 bg-white hover:border-arena-600/25",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTab(tab.id)}
                        className="h-4 w-4 rounded border-arena-600/25 accent-template-blue"
                      />
                      <span className="text-sm font-medium text-arena-700">
                        {tab.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {mode === "fixed" && tabList.length > 1 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {tabList.map((tab) => {
                    const label =
                      tabOptions.find((entry) => entry.id === tab)?.label ?? tab;
                    return (
                      <label
                        key={tab}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                          fixedTab === tab
                            ? "border-template-blue/30 bg-template-blue/[0.05]"
                            : "border-arena-600/15 bg-white",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="fixed-tab"
                          checked={fixedTab === tab}
                          onChange={() => setFixedTab(tab)}
                          className="accent-template-blue"
                        />
                        <span className="text-sm font-medium text-arena-700">
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </section>
          ) : null}

          {canLaunch ? (
            <section className="rounded-2xl border border-arena-600/15 bg-arena-600/[0.03] px-5 py-5">
              <SectionTitle
                step={4}
                title="Lancer la retransmission"
                subtitle="Une URL est générée par écran. Collez-la sur la TV ou laissez l'ouverture automatique sur le rétro HDMI."
              />
              <ul className="mb-5 space-y-1 text-sm text-arena-600/65">
                {summaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <PrimaryButton onClick={handleLaunch}>
                Lancer la retransmission
              </PrimaryButton>
            </section>
          ) : null}

          {canConfigureTest && selectedDisplayIds.length === 0 ? (
            <section className="rounded-2xl border border-arena-600/15 bg-arena-600/[0.03] px-5 py-5">
              <SectionTitle
                step={4}
                title="Tester sans rétro"
                subtitle="Ouvre l'URL dans un nouvel onglet sur cet ordinateur — pratique sans matériel."
              />
              <PrimaryButton onClick={handleLaunchTestUrl}>
                Créer l&apos;URL et ouvrir (test)
              </PrimaryButton>
            </section>
          ) : null}

          {launchedOutputs.length > 0 ? (
            <section className="rounded-2xl border border-template-blue/20 bg-template-blue/[0.04] px-5 py-5">
              <SectionTitle
                step={5}
                title="URLs actives"
                subtitle="Copiez l'URL sur un navigateur TV ou rouvrez-la sur le rétro."
              />
              <div className="space-y-3">
                {launchedOutputs.map((output) => {
                  const url = buildAffichageUrl(output.outputToken);
                  return (
                    <div
                      key={output.outputToken}
                      className="rounded-xl border border-arena-600/15 bg-white px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-arena-700">
                        {output.displayLabel}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-arena-600/55">
                        {url}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCopyUrl(url, output.displayLabel)}
                        className="mt-2 text-xs font-semibold uppercase tracking-wide text-template-blue hover:underline"
                      >
                        Copier l&apos;URL
                      </button>
                    </div>
                  );
                })}
              </div>
              {copyFeedback ? (
                <p className="mt-3 text-xs text-template-blue">
                  URL copiée — {copyFeedback}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

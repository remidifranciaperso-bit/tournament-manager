import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PrimaryButton } from "../components/ui";
import {
  broadcastableTabs,
  DEFAULT_ROTATION_SECONDS,
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

interface LiveRetransmissionTabProps {
  liveToken: string;
  classementPageCount: number;
  isPoolFormat?: boolean;
  active: boolean;
}

type ProjectionMode = Extract<RetransmissionMode, "fixed" | "rotation">;

interface TargetConfig {
  mode: ProjectionMode | null;
  selectedTabs: BroadcastableTab[];
  fixedTab: BroadcastableTab;
}

interface UrlTarget {
  id: string;
  label: string;
  outputToken: string | null;
}

const PROJECTION_MODES: { id: ProjectionMode; title: string }[] = [
  { id: "fixed", title: "Onglet fixe" },
  { id: "rotation", title: "Défilement automatique" },
];

function createTargetConfig(
  mode: ProjectionMode,
  tabIds: BroadcastableTab[]
): TargetConfig {
  if (mode === "fixed") {
    return { mode, selectedTabs: ["cover"], fixedTab: "cover" };
  }
  return { mode, selectedTabs: [...tabIds], fixedTab: "cover" };
}

function outputToConfig(
  output: BroadcastOutput,
  allTabIds: BroadcastableTab[]
): TargetConfig {
  const mode: ProjectionMode =
    output.mode === "fixed" || output.mode === "rotation"
      ? output.mode
      : "rotation";
  if (mode === "fixed") {
    const fixedTab = output.fixedTab ?? output.tabs[0] ?? "cover";
    return { mode, selectedTabs: [fixedTab], fixedTab };
  }
  return {
    mode,
    selectedTabs: output.tabs.length > 0 ? output.tabs : [...allTabIds],
    fixedTab: output.fixedTab ?? "cover",
  };
}

function findLatestOutput(
  outputs: BroadcastOutput[],
  targetId: string,
  isUrl: boolean
): BroadcastOutput | null {
  const matches = outputs.filter((output) =>
    isUrl
      ? output.displayId === `url-${targetId}` ||
        (output.displayId === "url-only" && targetId.length > 0)
      : output.displayId === targetId
  );
  if (matches.length === 0) return null;
  return matches.reduce((latest, current) =>
    current.createdAt > latest.createdAt ? current : latest
  );
}

function loadUrlTargets(outputs: BroadcastOutput[]): UrlTarget[] {
  const urlOutputs = outputs.filter(
    (output) =>
      output.displayId.startsWith("url-") || output.displayId === "url-only"
  );
  const seen = new Set<string>();
  const targets: UrlTarget[] = [];

  for (const output of urlOutputs) {
    const id =
      output.displayId === "url-only"
        ? output.outputToken.slice(0, 8)
        : output.displayId.replace(/^url-/, "");
    if (seen.has(id)) continue;
    seen.add(id);
    targets.push({
      id,
      label: output.displayLabel,
      outputToken: output.outputToken,
    });
  }
  return targets;
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-arena-600/45">
        Étape {step}
      </p>
      <h3 className="mt-1 font-display text-lg text-arena-700 sm:text-xl">{title}</h3>
    </div>
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

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      <path
        d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L10 5"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 00-7.07 0L5.52 12.41a5 5 0 007.07 7.07L14 19"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TargetCard({
  active,
  icon,
  title,
  meta,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition",
        active
          ? "border-template-blue/40 bg-template-blue/[0.06] ring-1 ring-template-blue/20"
          : "border-arena-600/15 bg-white hover:border-arena-600/30 hover:shadow-sm",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl",
          active
            ? "bg-template-blue/15 text-template-blue"
            : "bg-arena-600/8 text-arena-600/55",
        ].join(" ")}
      >
        {icon}
      </div>
      <div>
        <p className="font-semibold text-arena-700">{title}</p>
        {meta ? <p className="mt-1 text-xs text-arena-600/45">{meta}</p> : null}
      </div>
    </button>
  );
}

function ModeOption({
  active,
  title,
  onClick,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-4 py-4 text-left font-semibold transition",
        active
          ? "border-template-blue/35 bg-template-blue/[0.06] text-arena-700 ring-1 ring-template-blue/20"
          : "border-arena-600/15 bg-white text-arena-700 hover:border-arena-600/30",
      ].join(" ")}
    >
      {title}
    </button>
  );
}

export function LiveRetransmissionTab({
  liveToken,
  classementPageCount,
  isPoolFormat = false,
  active,
}: LiveRetransmissionTabProps) {
  const { displays, scanning, apiSupported, error, scan } =
    useDisplayDetection(active);

  const tabOptions = useMemo(
    () => broadcastableTabs(classementPageCount, isPoolFormat),
    [classementPageCount, isPoolFormat]
  );
  const allTabIds = useMemo(
    () => tabOptions.map((entry) => entry.id),
    [tabOptions]
  );

  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [activeTargetIsUrl, setActiveTargetIsUrl] = useState(false);
  const [targetConfigs, setTargetConfigs] = useState<Record<string, TargetConfig>>(
    {}
  );
  const [urlTargets, setUrlTargets] = useState<UrlTarget[]>(() =>
    loadUrlTargets(listBroadcastOutputs(liveToken))
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const getConfig = useCallback(
    (targetId: string): TargetConfig =>
      targetConfigs[targetId] ?? {
        mode: null,
        selectedTabs: [...allTabIds],
        fixedTab: "cover",
      },
    [targetConfigs, allTabIds]
  );

  const setConfig = useCallback(
    (targetId: string, patch: Partial<TargetConfig>) => {
      setTargetConfigs((prev) => ({
        ...prev,
        [targetId]: { ...getConfig(targetId), ...patch },
      }));
    },
    [getConfig]
  );

  const setMode = useCallback(
    (targetId: string, mode: ProjectionMode) => {
      setTargetConfigs((prev) => ({
        ...prev,
        [targetId]: createTargetConfig(mode, allTabIds),
      }));
    },
    [allTabIds]
  );

  const selectTarget = useCallback(
    (targetId: string, isUrl: boolean) => {
      setActiveTargetId(targetId);
      setActiveTargetIsUrl(isUrl);
      if (targetConfigs[targetId]) return;
      const output = findLatestOutput(
        listBroadcastOutputs(liveToken),
        targetId,
        isUrl
      );
      if (output) {
        setTargetConfigs((prev) => ({
          ...prev,
          [targetId]: outputToConfig(output, allTabIds),
        }));
      }
    },
    [targetConfigs, liveToken, allTabIds]
  );

  useEffect(() => {
    if (!activeTargetId) return;
    const displayExists = displays.some((d) => d.id === activeTargetId);
    const urlExists = urlTargets.some((u) => u.id === activeTargetId);
    if (!displayExists && !urlExists) {
      setActiveTargetId(null);
      setActiveTargetIsUrl(false);
    }
  }, [activeTargetId, displays, urlTargets]);

  const activeConfig = activeTargetId ? getConfig(activeTargetId) : null;
  const activeDisplay = displays.find((d) => d.id === activeTargetId) ?? null;
  const activeUrlTarget = urlTargets.find((u) => u.id === activeTargetId) ?? null;

  const tabListForLaunch = useCallback((config: TargetConfig): BroadcastableTab[] => {
    if (config.mode === "fixed") return [config.fixedTab];
    return config.selectedTabs;
  }, []);

  const canLaunchTarget = (config: TargetConfig) =>
    config.mode !== null && tabListForLaunch(config).length > 0;

  const persistOutput = (
    display: DetectedDisplay,
    config: TargetConfig
  ): BroadcastOutput => {
    const tabs = tabListForLaunch(config);
    const output: BroadcastOutput = {
      version: 1,
      outputToken: createOutputToken(),
      liveToken,
      displayId: display.id,
      displayLabel: display.label,
      mode: config.mode!,
      tabs,
      fixedTab: config.mode === "fixed" ? config.fixedTab : null,
      dedicatedTab: null,
      rotationSeconds: DEFAULT_ROTATION_SECONDS,
      createdAt: Date.now(),
    };
    saveBroadcastOutput(output);
    return output;
  };

  const handleLaunchDisplay = () => {
    if (!activeDisplay || !activeConfig || !canLaunchTarget(activeConfig)) return;
    const output = persistOutput(activeDisplay, activeConfig);
    const url = buildAffichageUrl(output.outputToken);
    const opened = openBroadcastWindow(url, activeDisplay);
    if (!opened) window.open(url, `broadcast-${output.outputToken}`, "noopener");
  };

  const handleCreateUrl = () => {
    if (!activeUrlTarget || !activeConfig || !canLaunchTarget(activeConfig)) return;
    const tabs = tabListForLaunch(activeConfig);
    const outputToken = activeUrlTarget.outputToken ?? createOutputToken();
    const output: BroadcastOutput = {
      version: 1,
      outputToken,
      liveToken,
      displayId: `url-${activeUrlTarget.id}`,
      displayLabel: activeUrlTarget.label,
      mode: activeConfig.mode!,
      tabs,
      fixedTab: activeConfig.mode === "fixed" ? activeConfig.fixedTab : null,
      dedicatedTab: null,
      rotationSeconds: DEFAULT_ROTATION_SECONDS,
      createdAt: Date.now(),
    };
    saveBroadcastOutput(output);
    setUrlTargets((prev) =>
      prev.map((entry) =>
        entry.id === activeUrlTarget.id
          ? { ...entry, outputToken: output.outputToken }
          : entry
      )
    );
  };

  const handleCopyUrl = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(label);
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Copie impossible");
    }
  };

  const addUrlTarget = () => {
    const id = createOutputToken().slice(0, 8);
    const label = `Écran URL ${urlTargets.length + 1}`;
    setUrlTargets((prev) => [...prev, { id, label, outputToken: null }]);
    selectTarget(id, true);
  };

  const updateUrlLabel = (id: string, label: string) => {
    setUrlTargets((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, label } : entry))
    );
    const target = urlTargets.find((entry) => entry.id === id);
    if (target?.outputToken) {
      const existing = listBroadcastOutputs(liveToken).find(
        (output) => output.outputToken === target.outputToken
      );
      if (existing) {
        saveBroadcastOutput({ ...existing, displayLabel: label });
      }
    }
  };

  const hasDisplays = displays.length > 0;
  const statusLabel = hasDisplays
    ? `${displays.length} écran${displays.length > 1 ? "s" : ""} / rétro détecté${displays.length > 1 ? "s" : ""}`
    : "Aucun écran / rétro branché";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <SectionTitle step={1} title="Écrans" />
              <button
                type="button"
                onClick={() => void scan()}
                disabled={scanning}
                className="shrink-0 rounded-lg border border-arena-600/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-arena-600/70 transition hover:border-arena-600/40 hover:text-arena-700 disabled:opacity-50"
              >
                {scanning ? "Analyse…" : "Actualiser"}
              </button>
            </div>

            <p className="mb-3 text-sm text-arena-600/60">{statusLabel}</p>

            {error ? (
              <p className="mb-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            {!apiSupported ? (
              <p className="mb-3 text-xs text-arena-600/50">
                Détection automatique : Chrome recommandé.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {displays.map((display) => (
                <TargetCard
                  key={display.id}
                  active={activeTargetId === display.id && !activeTargetIsUrl}
                  icon={<DisplayIcon />}
                  title={display.label}
                  meta={`${display.width} × ${display.height}`}
                  onClick={() => selectTarget(display.id, false)}
                />
              ))}

              {urlTargets.map((urlTarget) => (
                <TargetCard
                  key={urlTarget.id}
                  active={activeTargetId === urlTarget.id && activeTargetIsUrl}
                  icon={<LinkIcon />}
                  title={urlTarget.label}
                  meta={
                    urlTarget.outputToken ? "URL générée" : "URL à générer"
                  }
                  onClick={() => selectTarget(urlTarget.id, true)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addUrlTarget}
              className="mt-3 w-full rounded-xl border border-dashed border-arena-600/25 px-4 py-3 text-sm font-medium text-arena-600/70 transition hover:border-template-blue/35 hover:text-template-blue"
            >
              Fournir une URL pour un écran
            </button>
          </section>

          {activeTargetId && activeConfig ? (
            <>
              <section>
                <SectionTitle step={2} title="Mode de projection" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {PROJECTION_MODES.map((option) => (
                    <ModeOption
                      key={option.id}
                      active={activeConfig.mode === option.id}
                      title={option.title}
                      onClick={() => setMode(activeTargetId, option.id)}
                    />
                  ))}
                </div>
              </section>

              {activeConfig.mode ? (
                <section>
                  <SectionTitle step={3} title="Onglets à afficher" />
                  {activeConfig.mode === "fixed" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {tabOptions.map((tab) => (
                        <label
                          key={tab.id}
                          className={[
                            "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                            activeConfig.fixedTab === tab.id
                              ? "border-template-blue/30 bg-template-blue/[0.05]"
                              : "border-arena-600/15 bg-white hover:border-arena-600/25",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name={`fixed-tab-${activeTargetId}`}
                            checked={activeConfig.fixedTab === tab.id}
                            onChange={() =>
                              setConfig(activeTargetId, {
                                fixedTab: tab.id,
                                selectedTabs: [tab.id],
                              })
                            }
                            className="accent-template-blue"
                          />
                          <span className="text-sm font-medium text-arena-700">
                            {tab.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {tabOptions.map((tab) => {
                        const checked = activeConfig.selectedTabs.includes(tab.id);
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
                              onChange={() => {
                                const next = checked
                                  ? activeConfig.selectedTabs.filter(
                                      (id) => id !== tab.id
                                    )
                                  : [...activeConfig.selectedTabs, tab.id];
                                setConfig(activeTargetId, { selectedTabs: next });
                              }}
                              className="h-4 w-4 rounded border-arena-600/25 accent-template-blue"
                            />
                            <span className="text-sm font-medium text-arena-700">
                              {tab.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : null}

              {activeDisplay && activeConfig.mode && canLaunchTarget(activeConfig) ? (
                <div className="flex justify-center">
                  <PrimaryButton onClick={handleLaunchDisplay}>
                    Lancer la projection
                  </PrimaryButton>
                </div>
              ) : null}

              {activeUrlTarget ? (
                <div className="rounded-2xl border border-arena-600/15 bg-arena-600/[0.03] px-5 py-5">
                  <label className="field-label-tight">Nom de l&apos;écran</label>
                  <input
                    type="text"
                    value={activeUrlTarget.label}
                    onChange={(event) =>
                      updateUrlLabel(activeUrlTarget.id, event.target.value)
                    }
                    className="text-input mt-2"
                  />

                  {activeUrlTarget.outputToken ? (
                    <>
                      <p className="mt-4 break-all font-mono text-xs text-arena-600/55">
                        {buildAffichageUrl(activeUrlTarget.outputToken)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyUrl(
                            buildAffichageUrl(activeUrlTarget.outputToken!),
                            activeUrlTarget.label
                          )
                        }
                        className="mt-2 text-xs font-semibold uppercase tracking-wide text-template-blue hover:underline"
                      >
                        Copier l&apos;URL
                      </button>
                    </>
                  ) : null}

                  {activeConfig.mode && canLaunchTarget(activeConfig) ? (
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      <PrimaryButton onClick={handleCreateUrl}>
                        {activeUrlTarget.outputToken
                          ? "Mettre à jour l'URL"
                          : "Générer l'URL"}
                      </PrimaryButton>
                      {activeUrlTarget.outputToken ? (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              buildAffichageUrl(activeUrlTarget.outputToken!),
                              `broadcast-${activeUrlTarget.outputToken}`,
                              "noopener"
                            )
                          }
                          className="rounded-xl border border-arena-600/20 px-5 py-3 text-sm font-semibold text-arena-700 transition hover:border-arena-600/35"
                        >
                          Tester l&apos;URL
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {copyFeedback && activeUrlTarget.outputToken ? (
                    <p className="mt-3 text-center text-xs text-template-blue">
                      URL copiée — {copyFeedback}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

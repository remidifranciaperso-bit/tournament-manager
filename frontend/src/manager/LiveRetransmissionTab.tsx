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
  deleteBroadcastOutput,
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

function ProjectionTargetCard({
  active,
  icon,
  label,
  meta,
  onSelect,
  onLabelChange,
  onDelete,
  deleteAriaLabel,
  footer,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  meta?: string;
  onSelect: () => void;
  onLabelChange: (label: string) => void;
  onDelete: () => void;
  deleteAriaLabel: string;
  footer?: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={[
        "relative flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition",
        active
          ? "border-template-blue/40 bg-template-blue/[0.06] ring-1 ring-template-blue/20"
          : "border-arena-600/15 bg-white hover:border-arena-600/30 hover:shadow-sm",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-arena-600/35 transition hover:bg-red-500/10 hover:text-red-600"
        aria-label={deleteAriaLabel}
      >
        <TrashIcon />
      </button>

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

      <div className="pr-8">
        <input
          type="text"
          value={label}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onLabelChange(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-arena-700 outline-none ring-0 placeholder:text-arena-600/40 focus:ring-0"
          placeholder="Nom de l'écran"
        />
        {meta ? <p className="mt-1 text-xs text-arena-600/45">{meta}</p> : null}
        {footer}
      </div>
    </div>
  );
}

function UrlTargetCard({
  active,
  label,
  outputToken,
  onSelect,
  onLabelChange,
  onDelete,
  onCopyUrl,
  onTestUrl,
}: {
  active: boolean;
  label: string;
  outputToken: string | null;
  onSelect: () => void;
  onLabelChange: (label: string) => void;
  onDelete: () => void;
  onCopyUrl: () => void;
  onTestUrl: () => void;
}) {
  return (
    <ProjectionTargetCard
      active={active}
      icon={<LinkIcon />}
      label={label}
      meta={outputToken ? undefined : "URL à générer"}
      onSelect={onSelect}
      onLabelChange={onLabelChange}
      onDelete={onDelete}
      deleteAriaLabel="Supprimer l'URL"
      footer={
        outputToken ? (
          <>
            <p className="mt-2 break-all font-mono text-[10px] leading-snug text-arena-600/45">
              {buildAffichageUrl(outputToken)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopyUrl();
                }}
                className="text-[10px] font-semibold uppercase tracking-wide text-template-blue hover:underline"
              >
                Copier l&apos;URL
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTestUrl();
                }}
                className="text-[10px] font-semibold uppercase tracking-wide text-arena-600/55 hover:text-arena-700 hover:underline"
              >
                Tester l&apos;URL
              </button>
            </div>
          </>
        ) : null
      }
    />
  );
}

function DisplayTargetCard({
  active,
  label,
  meta,
  onSelect,
  onLabelChange,
  onDelete,
}: {
  active: boolean;
  label: string;
  meta: string;
  onSelect: () => void;
  onLabelChange: (label: string) => void;
  onDelete: () => void;
}) {
  return (
    <ProjectionTargetCard
      active={active}
      icon={<DisplayIcon />}
      label={label}
      meta={meta}
      onSelect={onSelect}
      onLabelChange={onLabelChange}
      onDelete={onDelete}
      deleteAriaLabel="Retirer l'écran"
    />
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" />
      <path d="M7 7l1 12a1 1 0 001 1h6a1 1 0 001-1l1-12" strokeLinecap="round" />
    </svg>
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
  const [displayLabels, setDisplayLabels] = useState<Record<string, string>>({});
  const [dismissedDisplayIds, setDismissedDisplayIds] = useState<Set<string>>(
    () => new Set()
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const visibleDisplays = useMemo(
    () =>
      displays
        .filter((display) => !dismissedDisplayIds.has(display.id))
        .map((display) => ({
          ...display,
          label: displayLabels[display.id]?.trim() || display.label,
        })),
    [displays, dismissedDisplayIds, displayLabels]
  );

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
    const displayExists = visibleDisplays.some((d) => d.id === activeTargetId);
    const urlExists = urlTargets.some((u) => u.id === activeTargetId);
    if (!displayExists && !urlExists) {
      setActiveTargetId(null);
      setActiveTargetIsUrl(false);
    }
  }, [activeTargetId, visibleDisplays, urlTargets]);

  const activeConfig = activeTargetId ? getConfig(activeTargetId) : null;
  const activeDisplay =
    visibleDisplays.find((d) => d.id === activeTargetId) ?? null;
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

  const removeUrlTarget = (id: string) => {
    const target = urlTargets.find((entry) => entry.id === id);
    if (target?.outputToken) {
      deleteBroadcastOutput(target.outputToken, liveToken);
    }
    setUrlTargets((prev) => prev.filter((entry) => entry.id !== id));
    setTargetConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeTargetId === id && activeTargetIsUrl) {
      setActiveTargetId(null);
      setActiveTargetIsUrl(false);
    }
  };

  const updateDisplayLabel = (id: string, label: string) => {
    setDisplayLabels((prev) => ({ ...prev, [id]: label }));
  };

  const removeDisplayTarget = (id: string) => {
    setDismissedDisplayIds((prev) => new Set([...prev, id]));
    setTargetConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeTargetId === id && !activeTargetIsUrl) {
      setActiveTargetId(null);
      setActiveTargetIsUrl(false);
    }
  };

  const displayCount = visibleDisplays.length;
  const activeUrlCount = urlTargets.filter((entry) => entry.outputToken).length;
  const screenStatusLabel =
    displayCount > 0
      ? `Écran/rétro actifs : ${displayCount}`
      : "Aucun écran / rétro détecté";

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

            <div className="mb-3 space-y-1 text-sm text-arena-600/60">
              <p>{screenStatusLabel}</p>
              <p>URLs actives : {activeUrlCount}</p>
            </div>

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
              {visibleDisplays.map((display) => (
                <DisplayTargetCard
                  key={display.id}
                  active={activeTargetId === display.id && !activeTargetIsUrl}
                  label={display.label}
                  meta={`${display.width} × ${display.height}`}
                  onSelect={() => selectTarget(display.id, false)}
                  onLabelChange={(label) => updateDisplayLabel(display.id, label)}
                  onDelete={() => removeDisplayTarget(display.id)}
                />
              ))}

              {urlTargets.map((urlTarget) => (
                <UrlTargetCard
                  key={urlTarget.id}
                  active={activeTargetId === urlTarget.id && activeTargetIsUrl}
                  label={urlTarget.label}
                  outputToken={urlTarget.outputToken}
                  onSelect={() => selectTarget(urlTarget.id, true)}
                  onLabelChange={(label) => updateUrlLabel(urlTarget.id, label)}
                  onDelete={() => removeUrlTarget(urlTarget.id)}
                  onCopyUrl={() =>
                    void handleCopyUrl(
                      buildAffichageUrl(urlTarget.outputToken!),
                      urlTarget.label
                    )
                  }
                  onTestUrl={() =>
                    window.open(
                      buildAffichageUrl(urlTarget.outputToken!),
                      `broadcast-${urlTarget.outputToken}`,
                      "noopener"
                    )
                  }
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

                  {activeUrlTarget && canLaunchTarget(activeConfig) ? (
                    <div className="mt-4 flex justify-center">
                      <PrimaryButton onClick={handleCreateUrl}>
                        Générer l&apos;URL
                      </PrimaryButton>
                    </div>
                  ) : null}

                  {copyFeedback && activeUrlTarget?.outputToken ? (
                    <p className="mt-3 text-center text-xs text-template-blue">
                      URL copiée — {copyFeedback}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {activeDisplay && activeConfig.mode && canLaunchTarget(activeConfig) ? (
                <div className="flex justify-center">
                  <PrimaryButton onClick={handleLaunchDisplay}>
                    Lancer la projection
                  </PrimaryButton>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

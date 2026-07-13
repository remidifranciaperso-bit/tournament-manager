import { useMemo, useState } from "react";
import { OptionCard, PrimaryButton } from "../components/ui";
import {
  broadcastableTabs,
  DEFAULT_BROADCAST_TABS,
  RETRANSMISSION_MODES,
  type BroadcastableTab,
  type RetransmissionMode,
} from "./liveRetransmission";
import {
  useDisplayDetection,
  type DetectedDisplay,
} from "./useDisplayDetection";

interface LiveRetransmissionTabProps {
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-lime/55">
        Étape {step}
      </p>
      <h3 className="mt-1 font-display text-lg text-white sm:text-xl">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-sm leading-snug text-white/45">{subtitle}</p>
      ) : null}
    </div>
  );
}

function DisplayStatusBadge({ display }: { display: DetectedDisplay }) {
  const label =
    display.status === "connecting"
      ? "Connexion…"
      : display.isInternal
        ? "Interne"
        : "Externe";

  const tone =
    display.status === "connecting"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : display.isInternal
        ? "border-white/15 bg-white/5 text-white/55"
        : "border-lime/30 bg-lime/10 text-lime";

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

function DisplayIcon({ external }: { external: boolean }) {
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
      {external ? <circle cx="18" cy="7" r="1.5" fill="currentColor" /> : null}
    </svg>
  );
}

export function LiveRetransmissionTab({
  classementPageCount,
  active,
}: LiveRetransmissionTabProps) {
  const { displays, scanning, apiSupported, error, scan } =
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
      return next;
    });
  };

  const canConfigureTabs = selectedDisplayIds.length > 0 && mode !== null;
  const canLaunch =
    canConfigureTabs && selectedTabs.size > 0 && mode !== "multi"
      ? true
      : canConfigureTabs &&
        selectedTabs.size > 0 &&
        mode === "multi" &&
        selectedDisplayIds.length >= 1;

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
  }, [
    selectedDisplayIds,
    displays,
    tabOptions,
    selectedTabs,
    mode,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-arena-900/20">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <header className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-lime/70">
              Retransmission live
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Branchez un rétroprojecteur ou un écran externe : ils apparaissent
              ci-dessous. Choisissez ensuite le mode et les onglets à diffuser.
            </p>
            {!apiSupported ? (
              <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/80">
                Détection avancée non disponible sur ce navigateur — seul
                l&apos;écran principal est listé. Utilisez Chrome pour la
                détection automatique des écrans externes.
              </p>
            ) : null}
          </header>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <SectionTitle
                step={1}
                title="Écrans détectés"
                subtitle="Sélectionnez l'écran ou le rétroprojecteur de retransmission."
              />
              <button
                type="button"
                onClick={() => void scan()}
                disabled={scanning}
                className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/65 transition hover:border-lime/30 hover:text-lime disabled:opacity-50"
              >
                {scanning ? "Analyse…" : "Actualiser"}
              </button>
            </div>

            {error ? (
              <p className="mb-3 rounded-xl border border-red-400/25 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            ) : null}

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
                        ? "border-lime/45 bg-lime/5 ring-1 ring-lime/25"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={[
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          selected
                            ? "bg-lime/20 text-lime"
                            : "bg-white/5 text-white/50",
                        ].join(" ")}
                      >
                        <DisplayIcon external={!display.isInternal} />
                      </div>
                      <DisplayStatusBadge display={display} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{display.label}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {display.width} × {display.height}
                        {display.isPrimary ? " · Principal" : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {displays.every((d) => d.isInternal) && apiSupported ? (
              <p className="mt-3 text-xs text-white/40">
                Aucun écran externe pour l&apos;instant — branchez un câble
                HDMI/USB-C : la liste se met à jour automatiquement.
              </p>
            ) : null}
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
                  <OptionCard
                    key={option.id}
                    active={mode === option.id}
                    onClick={() => {
                      setMode(option.id);
                      if (option.id !== "multi" && selectedDisplayIds.length > 1) {
                        setSelectedDisplayIds((prev) => prev.slice(0, 1));
                      }
                    }}
                    title={option.title}
                    subtitle={option.subtitle}
                    variant="lime"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {canConfigureTabs ? (
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
                          ? "border-lime/35 bg-lime/5"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTab(tab.id)}
                        className="h-4 w-4 rounded border-white/25 bg-transparent accent-lime"
                      />
                      <span className="text-sm font-medium text-white/85">
                        {tab.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null}

          {canLaunch ? (
            <section className="rounded-2xl border border-lime/20 bg-lime/[0.04] px-5 py-5">
              <SectionTitle
                step={4}
                title="Lancer la retransmission"
                subtitle="La connexion aux écrans sera activée dans une prochaine version."
              />
              <ul className="mb-5 space-y-1 text-sm text-white/60">
                {summaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <PrimaryButton disabled>
                Lancer la retransmission (bientôt)
              </PrimaryButton>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

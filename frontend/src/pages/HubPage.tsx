import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IconCheck } from "../components/Icons";
import { ProductEntryLayout } from "../components/ProductEntry";
import { PrimaryButton } from "../components/ui";
import {
  HUB_COMMON_LEFT,
  HUB_COMMON_RIGHT,
  HUB_ENGINE_LEFT,
  HUB_ENGINE_RIGHT,
  HUB_LIVE_LEFT,
  HUB_LIVE_RIGHT,
} from "../wizard/constants";

const HUB_BUILD = "manager-preview-136";

const BRUSH_GLOW =
  "0 0 40px rgba(212,255,74,0.15), 0 0 80px rgba(212,255,74,0.06)";

const CHOICE_TITLE =
  "font-brush text-[clamp(1.35rem,3.8vw,2.35rem)] leading-[1.02] text-lime";

function HubHighlight({
  item,
  size = "default",
}: {
  item: string;
  size?: "default" | "compact" | "tiny";
}) {
  if (!item) return <li className="min-h-0" aria-hidden />;

  const textClass =
    size === "tiny"
      ? "min-h-[0.85rem] text-[8px] leading-tight sm:text-[9px]"
      : size === "compact"
        ? "min-h-[1rem] text-[10px] sm:text-[11px]"
        : "min-h-[1.125rem] text-xs sm:min-h-[1.25rem] sm:text-sm";

  const iconClass =
    size === "tiny"
      ? "h-2.5 w-2.5"
      : "h-3.5 w-3.5 sm:h-4 sm:w-4";

  const checkClass =
    size === "tiny" ? "h-1.5 w-1.5" : "h-2 w-2 sm:h-2.5 sm:w-2.5";

  return (
    <li
      className={[
        "flex items-start justify-start gap-1 text-left leading-none text-white/55",
        textClass,
      ].join(" ")}
    >
      <span
        className={[
          "mt-px flex shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime",
          iconClass,
        ].join(" ")}
      >
        <IconCheck className={checkClass} />
      </span>
      <span>{item}</span>
    </li>
  );
}

function HighlightPanel({
  left,
  right,
  size = "default",
}: {
  left: string[];
  right: string[];
  size?: "default" | "compact" | "tiny";
}) {
  const rowCount = Math.max(left.length, right.length);
  const padding =
    size === "tiny" ? "p-2 sm:p-2.5" : size === "compact" ? "p-3.5 sm:p-4" : "p-6 sm:p-7";
  const gap =
    size === "tiny"
      ? "gap-x-2 gap-y-0.5 sm:gap-x-3"
      : size === "compact"
        ? "gap-x-4 gap-y-1.5 sm:gap-x-5"
        : "gap-x-8 gap-y-2.5 sm:gap-x-10 sm:gap-y-3";

  return (
    <div className={["lime-panel mx-auto w-full", padding].join(" ")}>
      <ul className={["m-0 grid list-none grid-cols-2", gap].join(" ")}>
        {Array.from({ length: rowCount }, (_, index) => (
          <Fragment key={`${left[index] ?? ""}-${right[index] ?? ""}-${index}`}>
            <HubHighlight item={left[index] ?? ""} size={size} />
            <HubHighlight item={right[index] ?? ""} size={size} />
          </Fragment>
        ))}
      </ul>
    </div>
  );
}

function ProductChoice({
  title,
  ctaLabel,
  onCta,
  highlightsLeft,
  highlightsRight,
}: {
  title: string;
  ctaLabel: string;
  onCta: () => void;
  highlightsLeft: string[];
  highlightsRight: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-0 flex-col items-center gap-2 sm:gap-2.5"
    >
      <h2 className={CHOICE_TITLE} style={{ textShadow: BRUSH_GLOW }}>
        {title}
      </h2>
      <PrimaryButton onClick={onCta} size="lg">
        {ctaLabel}
      </PrimaryButton>
      <HighlightPanel
        left={highlightsLeft}
        right={highlightsRight}
        size="tiny"
      />
    </motion.div>
  );
}

export default function HubPage() {
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false);

  return (
    <div className="h-dvh overflow-hidden">
      <ProductEntryLayout compact>
        <div
          className={[
            "mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden px-2",
            choosing
              ? "items-center justify-start gap-3 pt-[clamp(0.5rem,2vh,1rem)] sm:gap-4"
              : "items-center justify-center gap-4 sm:gap-5",
          ].join(" ")}
        >
          <h1
            className="flex shrink-0 flex-col items-center gap-0.5 font-brush leading-none text-lime sm:gap-1"
            style={{ textShadow: BRUSH_GLOW }}
          >
            <span className="text-[clamp(2.25rem,6.5vw,4rem)] leading-[1.05]">
              Padel Tournament
            </span>
            <span className="text-[clamp(3.25rem,10vw,5.75rem)] leading-[0.95]">
              Manager
            </span>
          </h1>

          <div
            className={[
              "flex min-h-0 w-full flex-col overflow-hidden",
              choosing
                ? "mt-[clamp(2.5rem,10vh,5.5rem)] flex-none items-center justify-start"
                : "flex-1 items-center justify-center",
            ].join(" ")}
          >
            <AnimatePresence mode="wait">
              {!choosing ? (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex w-full max-w-2xl flex-col items-center gap-5 sm:gap-6"
                >
                  <HighlightPanel
                    left={HUB_COMMON_LEFT}
                    right={HUB_COMMON_RIGHT}
                    size="compact"
                  />
                  <PrimaryButton onClick={() => setChoosing(true)} size="lg">
                    Commencer
                  </PrimaryButton>
                </motion.div>
              ) : (
                <motion.div
                  key="choices"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="grid w-full max-w-4xl grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5"
                >
                  <ProductChoice
                    title="Engine"
                    ctaLabel="Faire mon dossier tournoi"
                    onCta={() => navigate("/engine")}
                    highlightsLeft={HUB_ENGINE_LEFT}
                    highlightsRight={HUB_ENGINE_RIGHT}
                  />
                  <ProductChoice
                    title="Live"
                    ctaLabel="Lancer mon tournoi live"
                    onCta={() => navigate("/manager")}
                    highlightsLeft={HUB_LIVE_LEFT}
                    highlightsRight={HUB_LIVE_RIGHT}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-auto shrink-0 text-[10px] uppercase tracking-widest text-white/25">
            preview {HUB_BUILD}
          </p>
        </div>
      </ProductEntryLayout>
    </div>
  );
}

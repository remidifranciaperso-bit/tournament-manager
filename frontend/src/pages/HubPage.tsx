import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IconCheck } from "../components/Icons";
import { ProductEntryLayout } from "../components/ProductEntry";
import { PrimaryButton } from "../components/ui";
import {
  ENGINE_WELCOME_LEFT,
  ENGINE_WELCOME_RIGHT,
  HUB_COMMON_LEFT,
  HUB_COMMON_RIGHT,
  MANAGER_WELCOME_LEFT,
  MANAGER_WELCOME_RIGHT,
} from "../wizard/constants";

const HUB_BUILD = "manager-preview-135";

const BRUSH_GLOW =
  "0 0 40px rgba(212,255,74,0.15), 0 0 80px rgba(212,255,74,0.06)";

const PRODUCT_TITLE =
  "font-brush text-[clamp(2.15rem,6.5vw,4.5rem)] leading-[1.02] text-lime";

function HubHighlight({
  item,
  compact = false,
}: {
  item: string;
  compact?: boolean;
}) {
  return (
    <li
      className={[
        "flex items-center justify-start gap-1.5 text-left leading-none text-white/55",
        compact
          ? "min-h-[1rem] text-[10px] sm:text-[11px]"
          : "min-h-[1.125rem] text-xs sm:min-h-[1.25rem] sm:text-sm",
      ].join(" ")}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime sm:h-4 sm:w-4">
        <IconCheck className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
      </span>
      <span>{item}</span>
    </li>
  );
}

function HighlightPanel({
  left,
  right,
  compact = false,
}: {
  left: string[];
  right: string[];
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "lime-panel mx-auto w-full",
        compact ? "p-3.5 sm:p-4" : "p-6 sm:p-7",
      ].join(" ")}
    >
      <ul
        className={[
          "m-0 grid list-none grid-cols-2",
          compact ? "gap-x-4 gap-y-1.5 sm:gap-x-5" : "gap-x-8 gap-y-3 sm:gap-x-10",
        ].join(" ")}
      >
        {left.map((item, index) => (
          <Fragment key={item}>
            <HubHighlight item={item} compact={compact} />
            <HubHighlight
              item={right[index] ?? ""}
              compact={compact}
            />
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
      className="flex min-h-0 flex-1 flex-col items-center gap-3 sm:gap-4"
    >
      <h2 className={PRODUCT_TITLE} style={{ textShadow: BRUSH_GLOW }}>
        {title}
      </h2>
      <PrimaryButton onClick={onCta} size="lg">
        {ctaLabel}
      </PrimaryButton>
      <HighlightPanel
        left={highlightsLeft}
        right={highlightsRight}
        compact
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
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center gap-4 overflow-hidden px-2 sm:gap-5">
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

          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden">
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
                  className="grid h-full min-h-0 w-full max-w-4xl grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6"
                >
                  <ProductChoice
                    title="Engine"
                    ctaLabel="Faire mon dossier tournoi"
                    onCta={() => navigate("/engine")}
                    highlightsLeft={ENGINE_WELCOME_LEFT}
                    highlightsRight={ENGINE_WELCOME_RIGHT}
                  />
                  <ProductChoice
                    title="Live"
                    ctaLabel="Lancer mon tournoi live"
                    onCta={() => navigate("/manager")}
                    highlightsLeft={MANAGER_WELCOME_LEFT}
                    highlightsRight={MANAGER_WELCOME_RIGHT}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="shrink-0 text-[10px] uppercase tracking-widest text-white/25">
            preview {HUB_BUILD}
          </p>
        </div>
      </ProductEntryLayout>
    </div>
  );
}

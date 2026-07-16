import { Fragment, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IconCheck } from "../components/Icons";
import { ProductEntryLayout } from "../components/ProductEntry";
import {
  HUB_COMMON_LEFT,
  HUB_COMMON_RIGHT,
  HUB_ENGINE_LEFT,
  HUB_ENGINE_RIGHT,
  HUB_LIVE_LEFT,
  HUB_LIVE_RIGHT,
} from "../wizard/constants";

const HUB_BUILD = "manager-preview-137";

const BRUSH_GLOW =
  "0 0 40px rgba(212,255,74,0.15), 0 0 80px rgba(212,255,74,0.06)";

const CHOICE_TITLE =
  "font-brush text-[clamp(1.35rem,3.8vw,2.35rem)] leading-[1.02] text-lime";

const HIGHLIGHT_PANEL_MIN_H = "min-h-[10.75rem] sm:min-h-[11.75rem]";

function HubEntryCta({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime px-10 py-4 text-base font-bold tracking-wide text-arena-950 shadow-lime transition hover:brightness-110"
    >
      {children}
    </motion.button>
  );
}

function HubHighlight({ item }: { item: string }) {
  if (!item) {
    return <li className="min-h-[1.125rem] sm:min-h-[1.25rem]" aria-hidden />;
  }

  return (
    <li className="flex min-h-[1.125rem] items-start justify-start gap-1.5 text-left text-xs leading-snug text-white/55 sm:min-h-[1.25rem] sm:gap-2 sm:text-sm">
      <span className="mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime sm:h-4 sm:w-4">
        <IconCheck className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
      </span>
      <span>{item}</span>
    </li>
  );
}

function HighlightPanel({
  left,
  right,
  minRows,
  equalHeight = false,
}: {
  left: string[];
  right: string[];
  minRows?: number;
  equalHeight?: boolean;
}) {
  const rowCount = Math.max(left.length, right.length, minRows ?? 0);

  return (
    <div
      className={[
        "lime-panel mx-auto w-full p-5 sm:p-6",
        equalHeight ? HIGHLIGHT_PANEL_MIN_H : "",
      ].join(" ")}
    >
      <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-2 sm:gap-x-8 sm:gap-y-2.5">
        {Array.from({ length: rowCount }, (_, index) => (
          <Fragment key={`${left[index] ?? ""}-${right[index] ?? ""}-${index}`}>
            <HubHighlight item={left[index] ?? ""} />
            <HubHighlight item={right[index] ?? ""} />
          </Fragment>
        ))}
      </ul>
    </div>
  );
}

function HubTaglines() {
  return (
    <div className="flex shrink-0 flex-col items-center text-center">
      <p className="text-sm font-medium text-white/70 sm:text-base">
        Générateur professionnel de tournois Padel
      </p>
      <p className="mt-2 max-w-xl text-[clamp(0.75rem,2.8vw,1rem)] leading-snug text-white/45">
        De votre fichier Excel à votre tournoi, en quelques clics.
      </p>
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
      className="flex min-h-0 flex-col items-center"
    >
      <h2 className={CHOICE_TITLE} style={{ textShadow: BRUSH_GLOW }}>
        {title}
      </h2>
      <div className="mt-5 sm:mt-6">
        <HubEntryCta onClick={onCta}>{ctaLabel}</HubEntryCta>
      </div>
      <div className="mt-6 w-full sm:mt-7">
        <HighlightPanel
          left={highlightsLeft}
          right={highlightsRight}
          minRows={4}
          equalHeight
        />
      </div>
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
              ? "items-center justify-start gap-3 pt-[clamp(0.25rem,1.5vh,0.75rem)] sm:gap-4"
              : "items-center justify-center gap-3 sm:gap-4",
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

          <HubTaglines />

          <div
            className={[
              "flex min-h-0 w-full flex-col overflow-hidden",
              choosing
                ? "mt-[clamp(1.5rem,6vh,3.5rem)] flex-none items-center justify-start"
                : "mt-2 flex-1 items-center justify-center sm:mt-3",
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
                  className="flex w-full max-w-2xl flex-col items-center"
                >
                  <HighlightPanel
                    left={HUB_COMMON_LEFT}
                    right={HUB_COMMON_RIGHT}
                  />
                  <div className="mt-6 sm:mt-7">
                    <HubEntryCta onClick={() => setChoosing(true)}>
                      Commencer
                    </HubEntryCta>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="choices"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="grid w-full max-w-4xl grid-cols-1 items-start gap-6 sm:grid-cols-2 sm:gap-8"
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

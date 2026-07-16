import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IconCheck } from "../components/Icons";
import { ProductEntryLayout } from "../components/ProductEntry";
import {
  HUB_COMMON_LEFT,
  HUB_COMMON_RIGHT,
  HUB_ENGINE_ITEMS,
  HUB_LIVE_ITEMS,
} from "../wizard/constants";

const HUB_BUILD = "manager-preview-143";

const BRUSH_GLOW =
  "0 0 40px rgba(212,255,74,0.15), 0 0 80px rgba(212,255,74,0.06)";

const CHOICE_TITLE =
  "font-brush text-[clamp(1.5rem,4.5vw,2.65rem)] leading-[1.02] text-lime";

/** Encarts Engine / Live : largeur et hauteur strictement identiques. */
const PRODUCT_HIGHLIGHT_PANEL_CLASS =
  "lime-panel box-border flex h-[12.25rem] w-full items-center justify-center p-5 sm:h-[13rem] sm:p-6";

function HubEntryCta({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className="inline-flex items-center justify-center rounded-xl border border-lime/40 bg-lime/5 px-10 py-4 text-base font-semibold tracking-wide text-lime ring-1 ring-lime/30 transition hover:border-lime/50 hover:bg-lime/[0.08]"
    >
      {children}
    </motion.button>
  );
}

function HubHighlight({
  item,
  product = false,
  nowrap = false,
  centered = false,
}: {
  item: string;
  product?: boolean;
  nowrap?: boolean;
  centered?: boolean;
}) {
  if (!item) {
    return (
      <li
        className={product ? "min-h-0" : "min-h-[1.125rem] sm:min-h-[1.25rem]"}
        aria-hidden
      />
    );
  }

  return (
    <li
      className={[
        "flex gap-1.5 leading-snug text-white/55 sm:gap-2",
        centered ? "items-center justify-center" : "items-start justify-start",
        product
          ? "min-h-0 text-sm sm:text-[15px]"
          : "min-h-[1.125rem] text-xs sm:min-h-[1.25rem] sm:text-sm",
      ].join(" ")}
    >
      {!product && (
        <span className="mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime sm:h-4 sm:w-4">
          <IconCheck className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
        </span>
      )}
      <span className={["min-w-0", nowrap ? "whitespace-nowrap" : ""].join(" ")}>
        {item}
      </span>
    </li>
  );
}

function HighlightPanel({
  left,
  right,
}: {
  left: string[];
  right: string[];
}) {
  return (
    <div className="lime-panel mx-auto w-fit max-w-full p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-x-8 sm:gap-x-10">
        <ul className="m-0 flex list-none flex-col gap-y-2 sm:gap-y-2.5">
          {left.map((item) => (
            <HubHighlight key={item} item={item} nowrap />
          ))}
        </ul>
        <ul className="m-0 flex list-none flex-col gap-y-2 sm:gap-y-2.5">
          {right.map((item) => (
            <HubHighlight key={item} item={item} nowrap />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProductHighlightPanel({ items }: { items: string[] }) {
  return (
    <div className={PRODUCT_HIGHLIGHT_PANEL_CLASS}>
      <ul className="m-0 flex h-full w-fit max-w-full list-none flex-col justify-between">
        {items.map((item) => (
          <HubHighlight key={item} item={item} product centered nowrap />
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
  highlightItems,
}: {
  title: string;
  ctaLabel: string;
  onCta: () => void;
  highlightItems: string[];
}) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <h2 className={CHOICE_TITLE} style={{ textShadow: BRUSH_GLOW }}>
        {title}
      </h2>
      <div className="mt-5 sm:mt-6">
        <HubEntryCta onClick={onCta}>{ctaLabel}</HubEntryCta>
      </div>
      <div className="mt-6 w-full sm:mt-7">
        <ProductHighlightPanel items={highlightItems} />
      </div>
    </div>
  );
}

export default function HubPage() {
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false);

  return (
    <div className="min-h-screen h-dvh overflow-hidden">
      <ProductEntryLayout compact>
        <div
          className={[
            "mx-auto flex min-h-0 h-full w-full max-w-5xl flex-col overflow-hidden px-2",
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
            {!choosing ? (
              <div className="flex w-full max-w-2xl flex-col items-center">
                <HighlightPanel
                  left={HUB_COMMON_LEFT}
                  right={HUB_COMMON_RIGHT}
                />
                <div className="mt-6 sm:mt-7">
                  <HubEntryCta onClick={() => setChoosing(true)}>
                    Commencer
                  </HubEntryCta>
                </div>
              </div>
            ) : (
              <div className="grid w-full max-w-4xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2 sm:gap-8">
                <ProductChoice
                  title="Engine"
                  ctaLabel="Faire mon dossier tournoi"
                  onCta={() => navigate("/engine")}
                  highlightItems={HUB_ENGINE_ITEMS}
                />
                <ProductChoice
                  title="Live"
                  ctaLabel="Lancer mon tournoi live"
                  onCta={() => navigate("/manager")}
                  highlightItems={HUB_LIVE_ITEMS}
                />
              </div>
            )}
          </div>

          <p className="mt-auto shrink-0 text-[10px] uppercase tracking-widest text-white/25">
            preview {HUB_BUILD}
          </p>
        </div>
      </ProductEntryLayout>
    </div>
  );
}

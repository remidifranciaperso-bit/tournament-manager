import { isBracketPlaceholder } from "./formatBracketLabel";

export const LIVE_TABLE_PAGE =
  "flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6 sm:py-6";

export const LIVE_TABLE_PAGE_INNER =
  "my-auto flex w-full flex-col";

export const LIVE_TABLE_CARD =
  "mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-template-blue/35 shadow-sm";

/** Live V2 planning — pleine largeur utile (sans plafond max-w-5xl). */
export const LIVE_TABLE_CARD_WIDE =
  "mx-auto w-full max-w-none overflow-hidden rounded-xl border border-template-blue/35 shadow-sm";

export const LIVE_TABLE = "w-full border-collapse text-sm sm:text-base";

/** Capture PDF — border-separate évite la diagonale bleu/blanc aux coins arrondis. */
export const LIVE_TABLE_CAPTURE =
  "w-full border-separate border-spacing-0 text-sm";

/** En-têtes tableaux — alignés PyMuPDF ``TABLE_HEAD_DISPLAY_PT`` (12 pt). */
export const LIVE_TABLE_HEAD_ENGINE_V2 =
  "live-table-col-head-v2 px-2 py-2 text-left font-tsl font-semibold uppercase tracking-wide sm:px-2.5";

/** Live V1 — en-têtes plus compacts à l'écran. */
export const LIVE_TABLE_HEAD_CLASSIC =
  "px-2 py-2.5 text-left font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm";

/** @deprecated Préférer ``useLiveTableHeadClass()`` (session / déploiement V2). */
export const LIVE_TABLE_HEAD = LIVE_TABLE_HEAD_CLASSIC;

/** Alias capture / export natif (12 pt). */
export const LIVE_TABLE_HEAD_NATIVE = LIVE_TABLE_HEAD_ENGINE_V2;

/** @deprecated Préférer ``useLiveTableHeadClass()`` en mode export intermédiaire. */
export const LIVE_TABLE_HEAD_EXPORT = LIVE_TABLE_HEAD_CLASSIC;

/** Conteneur capture PDF (coins arrondis + overflow clip). */
export const LIVE_TABLE_CAPTURE_SHELL =
  "mx-auto w-full max-w-none overflow-hidden rounded-xl border border-template-blue/35 shadow-sm";

/** Ligne titre hors `<table>` — évite la diagonale bleu/blanc html2canvas. */
export const LIVE_TABLE_CAPTURE_HEAD_ROW =
  "grid w-full bg-template-blue text-white";

export const FINAL_TABLE_HEAD_CLASSIC =
  "px-2 py-2.5 text-left font-tsl text-[12px] font-normal uppercase tracking-wide sm:px-3";

/** @deprecated Préférer ``useLiveTableHeadClass()`` — même style 12 pt que Engine V2. */
export const FINAL_TABLE_HEAD = FINAL_TABLE_HEAD_CLASSIC;

export const FINAL_TABLE_BODY_NOTO =
  "px-2 py-2 font-noto text-[12px] text-arena-800 sm:px-3";

export const FINAL_TABLE_BODY_TSL_BOLD =
  "px-2 py-2 font-tsl text-[12px] font-semibold text-arena-800 sm:px-3";

export const LIVE_TABLE_HEAD_PLANNING_CAPTURE = LIVE_TABLE_HEAD_NATIVE;
export const PLANNING_HEAD_CAPTURE_PX = 16;

export const LIVE_TABLE_ROW = "border-t border-template-blue/15 odd:bg-white even:bg-template-blue/[0.04]";

export const LIVE_TABLE_ROW_EXPORT =
  "border-t border-template-blue/15 odd:bg-white even:bg-template-blue/[0.04] [&>td]:align-middle [&>td]:py-2.5";

export const LIVE_TABLE_CELL_TSL =
  "px-2 py-2 font-tsl text-arena-800 sm:px-3";

export const LIVE_TABLE_CELL_TSL_BOLD =
  "px-2 py-2 font-tsl font-semibold text-arena-800 sm:px-3";

export const LIVE_TABLE_CELL_NOTO =
  "px-2 py-2 font-noto text-arena-800 sm:px-3";

export const LIVE_TABLE_CELL_NOTO_BOLD =
  "px-2 py-2 font-noto font-bold text-arena-800 sm:px-3";

export const LIVE_TABLE_CELL_POINTS =
  "live-table-points px-2 py-2 text-right text-template-blue sm:px-3";

/** Placeholder 🏆/❌ plus petit ; nom d'équipe en taille tableau normale. */
export function liveTeamTextClass(text: string): string {
  if (!text || text === "—") return "";
  return isBracketPlaceholder(text)
    ? "text-[10px] sm:text-xs"
    : "text-sm sm:text-base";
}

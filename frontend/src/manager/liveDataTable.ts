import { isBracketPlaceholder } from "./formatBracketLabel";

export const LIVE_TABLE_PAGE =
  "flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-6";

export const LIVE_TABLE_PAGE_INNER =
  "my-auto flex w-full flex-col";

export const LIVE_TABLE_CARD =
  "mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-template-blue/35 shadow-sm";

export const LIVE_TABLE = "w-full border-collapse text-sm sm:text-base";

export const LIVE_TABLE_HEAD =
  "px-2 py-2.5 text-left font-tsl text-xs font-semibold uppercase tracking-wide sm:px-3 sm:text-sm";

export const LIVE_TABLE_ROW = "border-t border-template-blue/15 odd:bg-white even:bg-template-blue/[0.04]";

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

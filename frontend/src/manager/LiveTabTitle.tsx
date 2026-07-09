export const LIVE_BRUSH_LABEL_SIZE_CLASS =
  "text-[clamp(1.35rem,3vw,2rem)]";

export const LIVE_BRUSH_LABEL_CLASS = [
  "font-brush leading-none text-template-blue",
  LIVE_BRUSH_LABEL_SIZE_CLASS,
].join(" ");

const LIVE_TAB_TITLE = [
  "shrink-0 px-4 pb-3 pt-1 text-center",
  LIVE_BRUSH_LABEL_CLASS,
  "sm:px-6 sm:pb-4",
].join(" ");

export function LiveTabTitle({ label }: { label: string }) {
  return <h2 className={LIVE_TAB_TITLE}>{label}</h2>;
}

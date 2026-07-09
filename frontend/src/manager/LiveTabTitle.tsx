const LIVE_TAB_TITLE =
  "shrink-0 px-4 pb-3 pt-1 text-center font-brush text-[clamp(1.125rem,2.5vw,1.75rem)] leading-none text-template-blue sm:px-6 sm:pb-4";

export function LiveTabTitle({ label }: { label: string }) {
  return <h2 className={LIVE_TAB_TITLE}>{label}</h2>;
}

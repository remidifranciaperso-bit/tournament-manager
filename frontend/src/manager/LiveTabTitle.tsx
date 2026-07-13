/** Taille des libellés brush bleus (onglets Manager) et des logos pied de page. */
export const LIVE_BRUSH_LABEL_SIZE_CLASS =
  "text-[clamp(1.85rem,4.2vw,2.85rem)]";

export const LIVE_LOGO_HEIGHT_CLASS =
  "h-[clamp(1.48rem,3.36vw,2.28rem)]";

export const LIVE_LOGO_MAX_WIDTH_CLASS = "max-w-[26%]";

export const LIVE_BRUSH_LABEL_CLASS = [
  "font-brush leading-none text-template-blue",
  LIVE_BRUSH_LABEL_SIZE_CLASS,
].join(" ");

const LIVE_TAB_TITLE_WRAPPER =
  "shrink-0 px-4 pb-3 pt-1 sm:px-6 sm:pb-4";

const LIVE_TAB_TITLE = [
  LIVE_TAB_TITLE_WRAPPER,
  LIVE_BRUSH_LABEL_CLASS,
  "text-center",
].join(" ");

export function LiveTabTitle({ label }: { label: string }) {
  const hasLabel = label.trim().length > 0;
  if (!hasLabel) {
    return (
      <div className={LIVE_TAB_TITLE_WRAPPER} aria-hidden>
        <span className={`invisible block ${LIVE_BRUSH_LABEL_SIZE_CLASS}`}>
          &nbsp;
        </span>
      </div>
    );
  }
  return <h2 className={LIVE_TAB_TITLE}>{label}</h2>;
}

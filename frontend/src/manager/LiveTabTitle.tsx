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

const LIVE_TAB_TITLE = [
  "shrink-0 px-4 pb-3 pt-1 text-center",
  LIVE_BRUSH_LABEL_CLASS,
  "sm:px-6 sm:pb-4",
].join(" ");

export function LiveTabTitle({
  label,
  reserveLabel = null,
}: {
  label: string;
  reserveLabel?: string | null;
}) {
  const visible = label.trim();
  const reserve = reserveLabel?.trim() ?? "";

  if (!visible && reserve) {
    return <h2 className={`${LIVE_TAB_TITLE} invisible`}>{reserve}</h2>;
  }

  if (!visible) return null;

  return <h2 className={LIVE_TAB_TITLE}>{visible}</h2>;
}

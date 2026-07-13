import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SLIDE_ASPECT } from "./bracketSlideLayout";
import { fieldValue, isDynamicField } from "./liveFields";
import type { LiveTournamentMeta } from "./liveTypes";
import { useTemplateLayout } from "./useTemplateLayout";

interface LiveCoverBroadcastProps {
  templateId: string;
  fields: Record<string, string>;
  meta: LiveTournamentMeta;
  liveToken: string;
}

/** Page de garde retransmission : masque template + champs dynamiques. */
export function LiveCoverBroadcast({
  templateId,
  fields,
  meta,
  liveToken,
}: LiveCoverBroadcastProps) {
  const { layout } = useTemplateLayout(templateId);
  const slotRef = useRef<HTMLDivElement>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(
    null
  );

  const layoutFields = layout?.["0"] ?? [];
  const maskSrc = `/live-templates/${templateId}/0.png`;
  const logoSrc =
    meta.logo_url?.trim() ||
    fields.LOGO?.trim() ||
    `/api/live/${liveToken}/logo`;

  const logoField = layoutFields.find((field) => field.key === "LOGO");

  const textFields = useMemo(
    () =>
      layoutFields.filter(
        (field) =>
          field.key !== "LOGO" &&
          isDynamicField(field.key) &&
          fieldValue(fields, field.key).trim().length > 0
      ),
    [layoutFields, fields]
  );

  const computeScale = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const slotW = slot.clientWidth;
    const slotH = slot.clientHeight;
    if (slotW <= 0 || slotH <= 0) return;

    const fit = Math.min(slotW / SLIDE_ASPECT, slotH);
    setRenderSize({
      w: Math.floor(fit * SLIDE_ASPECT),
      h: Math.floor(fit),
    });
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    computeScale();
    const observer = new ResizeObserver(() => computeScale());
    observer.observe(slot);
    return () => observer.disconnect();
  }, [computeScale, maskSrc]);

  return (
    <div
      ref={slotRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white px-2 pb-2 pt-0 transition-none sm:px-4 sm:pb-4"
    >
      <div
        className="relative shrink-0"
        style={
          renderSize
            ? { width: renderSize.w, height: renderSize.h }
            : { width: "min(100%, calc((100vh - 8rem) * 1.44))", aspectRatio: String(SLIDE_ASPECT) }
        }
      >
        <img
          src={maskSrc}
          alt="Page de garde"
          decoding="async"
          draggable={false}
          className="block h-full w-full select-none object-contain"
        />

        {logoField && logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            decoding="async"
            draggable={false}
            className="absolute object-contain"
            style={{
              left: `${logoField.left}%`,
              top: `${logoField.top}%`,
              width: `${logoField.width}%`,
              height: `${logoField.height}%`,
            }}
          />
        ) : null}

        {renderSize
          ? textFields.map((field) => (
              <div
                key={field.key}
                className="absolute flex items-center justify-center overflow-hidden whitespace-nowrap font-sans font-bold leading-none text-black"
                style={{
                  left: `${field.left}%`,
                  top: `${field.top}%`,
                  width: `${field.width}%`,
                  height: `${field.height}%`,
                  fontSize: `${Math.max(
                    7,
                    (field.height / 100) * renderSize.h * 0.58
                  )}px`,
                }}
              >
                {fieldValue(fields, field.key)}
              </div>
            ))
          : null}
      </div>
    </div>
  );
}

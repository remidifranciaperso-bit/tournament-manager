import { motion } from "framer-motion";
import {
  MATCH_FORMAT_OPTIONS,
  type MatchFormatChoice,
  type MatchFormatCode,
} from "./matchFormats";

interface MatchFormatPickerProps {
  label: string;
  value: MatchFormatCode | MatchFormatChoice | null;
  onChange: (value: MatchFormatCode | MatchFormatChoice) => void;
  allowIdentique?: boolean;
  scrollable?: boolean;
  compact?: boolean;
}

export function MatchFormatPicker({
  label,
  value,
  onChange,
  allowIdentique = false,
  scrollable = false,
  compact = false,
}: MatchFormatPickerProps) {
  const options = (
    <div className={compact ? "grid gap-1.5" : "grid gap-2"}>
      {allowIdentique && (
        <FormatOptionButton
          active={value === "identique"}
          displayCode="Identique"
          description="Même format que le tableau principal"
          onClick={() => onChange("identique")}
          wideCode
          compact={compact}
        />
      )}
      {MATCH_FORMAT_OPTIONS.map((option) => (
        <FormatOptionButton
          key={option.code}
          active={value === option.code}
          displayCode={option.code}
          description={option.description}
          onClick={() => onChange(option.code)}
          compact={compact}
        />
      ))}
    </div>
  );

  return (
    <div
      className={
        scrollable
          ? "flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1.5"
          : "flex flex-col gap-2"
      }
    >
      <label className="field-label-tight shrink-0">{label}</label>
      {scrollable ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          {options}
        </div>
      ) : (
        options
      )}
    </div>
  );
}

function FormatOptionButton({
  active,
  displayCode,
  description,
  onClick,
  wideCode = false,
  compact = false,
}: {
  active: boolean;
  displayCode: string;
  description: string;
  onClick: () => void;
  wideCode?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={[
        "flex w-full items-start text-left transition",
        compact
          ? "gap-2 rounded-lg border px-2 py-2 sm:px-2.5 sm:py-2"
          : "gap-3 rounded-xl border px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3",
        active
          ? "border-lime/40 bg-lime/5 ring-1 ring-lime/30"
          : "border-white/10 bg-white/[0.04] hover:border-lime/25 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <span
        className={[
          wideCode
            ? compact
              ? "min-w-[4.5rem] shrink-0 font-display text-sm font-bold tracking-wide"
              : "min-w-[5.5rem] shrink-0 font-display text-base font-bold tracking-wide sm:text-lg"
            : compact
              ? "w-8 shrink-0 font-display text-base font-bold tracking-wide"
              : "w-10 shrink-0 font-display text-xl font-bold tracking-wide sm:w-11 sm:text-2xl",
          active ? "text-lime" : "text-white/65",
        ].join(" ")}
      >
        {displayCode}
      </span>
      <span
        className={[
          "min-w-0 flex-1 leading-snug",
          compact
            ? "pt-0 text-[10px] sm:text-[11px]"
            : "pt-0.5 text-xs sm:text-[13px]",
          active ? "text-white/75" : "text-white/40",
        ].join(" ")}
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        {description}
      </span>
    </motion.button>
  );
}

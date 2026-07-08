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
}

export function MatchFormatPicker({
  label,
  value,
  onChange,
  allowIdentique = false,
}: MatchFormatPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="field-label-tight">{label}</label>
      <div className="grid gap-2">
        {allowIdentique && (
          <FormatOptionButton
            active={value === "identique"}
            displayCode="Identique"
            description="Même format que le tableau principal"
            onClick={() => onChange("identique")}
            wideCode
          />
        )}
        {MATCH_FORMAT_OPTIONS.map((option) => (
          <FormatOptionButton
            key={option.code}
            active={value === option.code}
            displayCode={option.code}
            description={option.description}
            onClick={() => onChange(option.code)}
          />
        ))}
      </div>
    </div>
  );
}

function FormatOptionButton({
  active,
  displayCode,
  description,
  onClick,
  wideCode = false,
}: {
  active: boolean;
  displayCode: string;
  description: string;
  onClick: () => void;
  wideCode?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={[
        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition sm:gap-4 sm:px-4 sm:py-3",
        active
          ? "border-lime/40 bg-lime/5 ring-1 ring-lime/30"
          : "border-white/10 bg-white/[0.04] hover:border-lime/25 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <span
        className={[
          wideCode
            ? "min-w-[5.5rem] shrink-0 font-display text-base font-bold tracking-wide sm:text-lg"
            : "w-10 shrink-0 font-display text-xl font-bold tracking-wide sm:w-11 sm:text-2xl",
          active ? "text-lime" : "text-white/65",
        ].join(" ")}
      >
        {displayCode}
      </span>
      <span
        className={[
          "min-w-0 flex-1 pt-0.5 text-xs leading-snug sm:text-[13px]",
          active ? "text-white/75" : "text-white/40",
        ].join(" ")}
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        {description}
      </span>
    </motion.button>
  );
}

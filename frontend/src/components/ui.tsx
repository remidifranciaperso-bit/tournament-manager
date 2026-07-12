import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  size?: "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "px-10 py-4 text-base tracking-wide"
      : "px-7 py-3 text-sm";

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={[
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold text-arena-950 transition disabled:cursor-not-allowed disabled:opacity-35",
        sizeClass,
      ].join(" ")}
      style={{
        background: disabled
          ? "rgba(212,255,74,0.3)"
          : "linear-gradient(135deg, #d4ff4a 0%, #a8e020 100%)",
        boxShadow: disabled
          ? "none"
          : "0 0 32px -4px rgba(212,255,74,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
      }}
    >
      {children}
    </motion.button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
    >
      {children}
    </motion.button>
  );
}

export function OptionCard({
  active = false,
  onClick,
  title,
  subtitle,
  icon,
  disabled,
  variant = "neon",
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: "neon" | "lime";
}) {
  const isLime = variant === "lime";

  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      className={[
        "group relative flex w-full flex-col items-start gap-3 rounded-2xl border p-5 text-left transition",
        disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
          : active
            ? isLime
              ? "border-lime/50 bg-lime/5 shadow-lime"
              : "border-neon/50 bg-neon/5 shadow-neon"
            : isLime
              ? "border-white/10 bg-white/[0.03] hover:border-lime/25 hover:bg-lime/[0.04]"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      {icon && (
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl transition",
            active
              ? isLime
                ? "bg-lime/20 text-lime"
                : "bg-neon/15 text-neon"
              : isLime
                ? "bg-lime/10 text-lime/55 group-hover:bg-lime/15 group-hover:text-lime"
                : "bg-white/5 text-white/50 group-hover:text-white/70",
          ].join(" ")}
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <div className="font-semibold text-white">{title}</div>
        {subtitle && (
          <div className="text-xs text-white/45">{subtitle}</div>
        )}
      </div>
      {active && (
        <motion.span
          layoutId={isLime ? "option-active-ring-lime" : "option-active-ring"}
          className={[
            "pointer-events-none absolute inset-0 rounded-2xl ring-1",
            isLime ? "ring-lime/30" : "ring-neon/30",
          ].join(" ")}
        />
      )}
    </motion.button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  id?: string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-arena-900/60 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative rounded-lg px-4 py-2.5 text-sm font-medium transition"
          >
            {active && (
              <motion.span
                layoutId={id ?? "segmented-active"}
                className="absolute inset-0 rounded-lg bg-neon/15 ring-1 ring-neon/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={
                active ? "relative z-10 text-neon" : "relative z-10 text-white/50"
              }
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  variant = "neon",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  variant?: "neon" | "lime";
}) {
  const isLime = variant === "lime";

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3"
    >
      <span
        className={[
          "relative h-7 w-12 rounded-full transition",
          checked
            ? isLime
              ? "bg-lime/80"
              : "bg-neon/80"
            : "bg-white/15",
        ].join(" ")}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={[
            "absolute top-1 h-5 w-5 rounded-full shadow",
            checked
              ? isLime
                ? "left-6 bg-arena-950"
                : "left-6 bg-white"
              : "left-1 bg-white",
          ].join(" ")}
        />
      </span>
      <span
        className={[
          "text-sm font-medium transition",
          checked && isLime ? "text-lime" : "text-white/60",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}

export function NumberStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-arena-900/60 p-1.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-lg font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        −
      </button>
      <span className="w-10 text-center font-display text-2xl text-neon">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-lg font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        +
      </button>
    </div>
  );
}

export function LimeChoice({
  label,
  active,
  onClick,
  compact = false,
  variant = "filled",
}: {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
  variant?: "filled" | "halo";
}) {
  const isHalo = variant === "halo";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: isHalo ? 1.01 : 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={[
        "relative w-full rounded-xl border text-center leading-snug transition",
        isHalo
          ? "px-3 py-3 text-sm font-medium sm:px-4"
          : [
              "font-display tracking-wider",
              compact
                ? "px-2 py-2 text-sm sm:px-3 sm:py-2.5 sm:text-base"
                : "px-3 py-2.5 text-sm sm:px-4 sm:text-base",
            ].join(" "),
        active
          ? isHalo
            ? "border-lime/40 bg-lime/5 text-lime shadow-lime ring-1 ring-lime/30"
            : "border-lime/50 bg-lime text-arena-950 shadow-lime"
          : isHalo
            ? "border-white/10 bg-white/[0.04] text-white/50 hover:border-lime/25 hover:text-white/75"
            : "border-white/10 bg-white/[0.04] text-white/55 hover:border-lime/25 hover:text-white/80",
      ].join(" ")}
    >
      {label}
    </motion.button>
  );
}

export function TypeChip({
  label,
  active,
  onClick,
  compact = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={[
        "rounded-xl font-display tracking-wider transition",
        compact ? "px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base" : "px-5 py-2.5 text-lg",
        active
          ? "bg-neon text-arena-950 shadow-neon"
          : "border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white",
      ].join(" ")}
    >
      {label}
    </motion.button>
  );
}

export function Badge({
  children,
  variant = "success",
}: {
  children: ReactNode;
  variant?: "success" | "warning";
}) {
  const styles =
    variant === "success"
      ? "border-neon/30 bg-neon/10 text-neon-glow"
      : "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        styles,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

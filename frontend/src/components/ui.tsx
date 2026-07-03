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
  active,
  onClick,
  title,
  subtitle,
  icon,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      className={[
        "group relative flex w-full flex-col items-start gap-2 rounded-2xl border p-5 text-left transition",
        disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
          : active
            ? "border-neon/50 bg-neon/5 shadow-neon"
            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      {icon && (
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl transition",
            active
              ? "bg-neon/15 text-neon"
              : "bg-white/5 text-white/50 group-hover:text-white/70",
          ].join(" ")}
        >
          {icon}
        </div>
      )}
      <div className="font-semibold text-white">{title}</div>
      {subtitle && (
        <div className="text-xs text-white/45">{subtitle}</div>
      )}
      {active && (
        <motion.span
          layoutId="option-active-ring"
          className="absolute inset-0 rounded-2xl ring-1 ring-neon/30"
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
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3"
    >
      <span
        className={[
          "relative h-7 w-12 rounded-full transition",
          checked ? "bg-neon/80" : "bg-white/15",
        ].join(" ")}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </span>
      <span className="text-sm font-medium text-white/60">{label}</span>
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

export function TypeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={[
        "rounded-xl px-5 py-2.5 font-display text-lg tracking-wider transition",
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

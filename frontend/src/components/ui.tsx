import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-court-500 to-court-600 px-6 py-3 font-semibold text-white shadow-glass transition disabled:cursor-not-allowed disabled:opacity-40"
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
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-court-200 bg-white/60 px-5 py-3 font-semibold text-court-700 transition hover:bg-white"
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
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={[
        "group relative flex w-full flex-col items-start gap-1 rounded-2xl border p-4 text-left transition",
        disabled
          ? "cursor-not-allowed border-court-100 bg-white/40 opacity-50"
          : active
            ? "border-court-500 bg-court-50 shadow-glow"
            : "border-court-100 bg-white/70 hover:border-court-300",
      ].join(" ")}
    >
      {icon && <div className="text-2xl">{icon}</div>}
      <div className="font-display text-base font-semibold text-deep-900">
        {title}
      </div>
      {subtitle && (
        <div className="text-sm text-deep-800/60">{subtitle}</div>
      )}
      {active && (
        <motion.span
          layoutId={`active-dot-${title}`}
          className="absolute right-3 top-3 h-3 w-3 rounded-full bg-court-500"
        />
      )}
    </motion.button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-court-100 bg-white/60 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative rounded-xl px-4 py-2 text-sm font-semibold transition"
          >
            {active && (
              <motion.span
                layoutId="segmented-active"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-court-500 to-court-600"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={
                active ? "relative z-10 text-white" : "relative z-10 text-deep-800/70"
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
          checked ? "bg-court-500" : "bg-deep-800/20",
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
      <span className="text-sm font-medium text-deep-800/80">{label}</span>
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
    <div className="inline-flex items-center gap-3 rounded-2xl border border-court-100 bg-white/70 p-1.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className="h-9 w-9 rounded-xl bg-court-50 text-lg font-bold text-court-700 transition hover:bg-court-100"
      >
        −
      </button>
      <span className="w-8 text-center font-display text-lg font-semibold">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className="h-9 w-9 rounded-xl bg-court-50 text-lg font-bold text-court-700 transition hover:bg-court-100"
      >
        +
      </button>
    </div>
  );
}

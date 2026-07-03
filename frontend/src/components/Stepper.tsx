import { motion } from "framer-motion";
import { IconCheck } from "./Icons";

export interface StepDef {
  key: string;
  label: string;
}

export function Stepper({
  steps,
  current,
  onGo,
}: {
  steps: StepDef[];
  current: number;
  onGo: (i: number) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= current;

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => reachable && onGo(i)}
            disabled={!reachable}
            className={[
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
              active
                ? "bg-neon/10"
                : reachable
                  ? "hover:bg-white/5"
                  : "cursor-default opacity-40",
            ].join(" ")}
          >
            <motion.span
              initial={false}
              animate={{
                scale: active ? 1.05 : 1,
              }}
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition",
                done
                  ? "bg-neon text-arena-950"
                  : active
                    ? "bg-neon/20 text-neon ring-1 ring-neon/40"
                    : "bg-white/5 text-white/40",
              ].join(" ")}
            >
              {done ? <IconCheck className="h-4 w-4" /> : i + 1}
            </motion.span>

            <div className="min-w-0">
              <div
                className={[
                  "truncate text-sm font-medium transition",
                  active ? "text-white" : "text-white/45",
                ].join(" ")}
              >
                {step.label}
              </div>
              {active && (
                <motion.div
                  layoutId="step-indicator"
                  className="mt-0.5 h-0.5 w-8 rounded-full bg-neon"
                />
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}

/** Stepper horizontal compact pour mobile */
export function StepperMobile({
  steps,
  current,
}: {
  steps: StepDef[];
  current: number;
}) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-xs text-white/40">
        <span>
          Étape {current + 1} / {steps.length}
        </span>
        <span>{steps[current]?.label}</span>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-neon to-lime"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
      </div>
    </div>
  );
}

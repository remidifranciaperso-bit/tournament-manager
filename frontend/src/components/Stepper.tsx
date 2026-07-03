import { motion } from "framer-motion";

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
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full">
      <div className="relative mx-auto flex max-w-3xl items-center justify-between">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-court-100" />
        <motion.div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-court-400 to-court-600"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= current;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => reachable && onGo(i)}
              className="relative z-10 flex flex-col items-center gap-2"
              disabled={!reachable}
            >
              <motion.span
                initial={false}
                animate={{
                  scale: active ? 1.15 : 1,
                  backgroundColor: done || active ? "#0d8079" : "#ffffff",
                  color: done || active ? "#ffffff" : "#106661",
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-court-500 text-sm font-bold shadow-sm"
              >
                {done ? "✓" : i + 1}
              </motion.span>
              <span
                className={[
                  "hidden text-xs font-semibold sm:block",
                  active ? "text-court-700" : "text-deep-800/50",
                ].join(" ")}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

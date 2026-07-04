import type { CSSProperties } from "react";
import { motion } from "framer-motion";

type RacketProgressProps = {
  /** Étape courante du wizard (1–8). */
  step: number;
  total?: number;
};

const MASK_STYLE: CSSProperties = {
  WebkitMaskImage: "url(/images/padel-racket-fill-mask.png)",
  maskImage: "url(/images/padel-racket-fill-mask.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export function RacketProgress({ step, total = 8 }: RacketProgressProps) {
  const ratio = Math.min(Math.max(step, 0), total) / total;
  const fillHeight = `${ratio * 100}%`;

  return (
    <div className="relative aspect-[100/200] h-[5.25rem] w-auto origin-center scale-[1.35]">
      <div className="absolute inset-0" style={MASK_STYLE}>
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-lime"
          initial={false}
          animate={{ height: fillHeight }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-lime/50 blur-sm"
          initial={false}
          animate={{ height: fillHeight }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
      </div>
      <img
        src="/images/padel-racket.png"
        alt=""
        draggable={false}
        className="relative z-10 h-full w-full select-none object-contain"
        style={{ filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.35))" }}
      />
    </div>
  );
}

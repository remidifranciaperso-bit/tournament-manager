import type { CSSProperties } from "react";
import { motion } from "framer-motion";

type RacketProgressProps = {
  /** Étape courante du wizard (1–8). */
  step: number;
  total?: number;
};

/**
 * Seuils clip-path calibrés sur le masque : chaque étape remplit
 * exactement 1/8 de la surface de la raquette (cumul pixels du bas).
 */
const CLIP_TOP_BY_STEP = [74.95, 58.15, 47.76, 38.9, 30.65, 22.3, 13.34, 0.81];

const MASK_STYLE: CSSProperties = {
  WebkitMaskImage: "url(/images/padel-racket-fill-mask.png)",
  maskImage: "url(/images/padel-racket-fill-mask.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskMode: "alpha",
  maskMode: "alpha",
};

function clipTopForStep(step: number, total: number): number {
  const s = Math.min(Math.max(step, 0), total);
  if (s <= 0) return 100;
  const idx = Math.min(s - 1, CLIP_TOP_BY_STEP.length - 1);
  return CLIP_TOP_BY_STEP[idx] ?? 100;
}

export function RacketProgress({ step, total = 8 }: RacketProgressProps) {
  const clipTop = clipTopForStep(step, total);

  return (
    <div className="relative aspect-[746/982] h-[5.25rem] w-auto origin-center scale-[1.35]">
      <motion.div
        className="absolute inset-0 bg-lime"
        initial={false}
        animate={{ clipPath: `inset(${clipTop}% 0 0 0)` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={MASK_STYLE}
      />
      <motion.div
        className="absolute inset-0 bg-lime/40 blur-md"
        initial={false}
        animate={{ clipPath: `inset(${clipTop}% 0 0 0)` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={MASK_STYLE}
        aria-hidden
      />
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

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
  const s = Math.min(Math.max(step, 0), total);
  const ratio = s / total;

  // Le masque dépasse le tracé visible en haut : on remplit uniquement la zone utile
  // pour que chaque étape ajoute 1/total identique (1/8 → 8/8).
  const MASK_TOP = 12;
  const FILL_RANGE = 100 - MASK_TOP;
  const clipTop = MASK_TOP + (1 - ratio) * FILL_RANGE;

  return (
    <div className="relative aspect-[100/200] h-[5.25rem] w-auto origin-center scale-[1.35]">
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

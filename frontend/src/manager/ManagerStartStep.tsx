import { motion } from "framer-motion";
import { IconTrophy, IconUpload } from "../components/Icons";

export function ManagerStartStep({
  onExcelStart,
  onPackStart,
}: {
  onExcelStart: () => void;
  onPackStart: () => void;
}) {
  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-3xl flex-col items-center text-center"
      >
        <img
          src="/images/padel-racket-logo-lime.png"
          alt=""
          className="h-[clamp(3.5rem,10vw,5rem)] w-auto select-none"
          draggable={false}
        />

        <p
          className="mt-4 font-brush text-[clamp(1.35rem,4vw,2rem)] leading-[1.05] text-lime"
          style={{ textShadow: "0 0 32px rgba(212,255,74,0.15)" }}
        >
          Padel Tournament
        </p>
        <h1
          className="mt-1 font-brush text-[clamp(2.75rem,9vw,4.75rem)] leading-[0.95] text-lime"
          style={{ textShadow: "0 0 40px rgba(212,255,74,0.18)" }}
        >
          Live
        </h1>

        <h2 className="mt-8 font-display text-xl tracking-wide text-white sm:text-2xl">
          Comment souhaitez-vous démarrer ?
        </h2>

        <div className="mt-10 grid w-full max-w-2xl gap-4 sm:grid-cols-[1.15fr_0.85fr] sm:items-stretch">
          <motion.button
            type="button"
            onClick={onPackStart}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="group flex min-h-[11rem] flex-col items-center justify-center gap-4 rounded-2xl border border-lime/45 bg-black/35 px-6 py-8 backdrop-blur-[2px] transition hover:border-lime/70 hover:bg-black/45 sm:min-h-[12.5rem]"
          >
            <div className="flex h-12 w-12 items-center justify-center text-lime">
              <IconUpload className="h-10 w-10" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-white sm:text-lg">
                Importer un pack
              </span>
              <span className="text-xs text-white/50">
                Pack ZIP depuis Engine
              </span>
            </div>
          </motion.button>

          <motion.button
            type="button"
            onClick={onExcelStart}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            className="group flex min-h-[9.5rem] flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-5 py-6 backdrop-blur-[2px] transition hover:border-lime/25 hover:bg-black/35 sm:min-h-[12.5rem]"
          >
            <div className="flex h-10 w-10 items-center justify-center text-lime/70 group-hover:text-lime">
              <IconTrophy className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-white/85 sm:text-base">
                Depuis un Excel
              </span>
              <span className="text-[11px] text-white/40">
                Démarrage direct
              </span>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

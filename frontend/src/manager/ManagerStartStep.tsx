import { motion } from "framer-motion";
import { IconTrophy, IconUpload } from "../components/Icons";
import {
  ProductBrushHeadline,
  ProductEntryLayout,
} from "../components/ProductEntry";

export function ManagerStartStep({
  onExcelStart,
  onPackStart,
}: {
  onExcelStart: () => void;
  onPackStart: () => void;
}) {
  return (
    <ProductEntryLayout>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-3xl flex-col items-center text-center"
      >
        <ProductBrushHeadline product="Live" />

        <h2 className="mt-8 font-display text-xl tracking-wide text-white sm:text-2xl">
          Lancer mon tournoi Live
        </h2>

        <div className="mt-10 flex w-full max-w-md flex-col items-stretch gap-5">
          <motion.button
            type="button"
            onClick={onPackStart}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="group flex min-h-[12.5rem] flex-col items-center justify-center gap-4 rounded-2xl border border-lime/50 bg-black/40 px-8 py-10 shadow-lime backdrop-blur-[2px] transition hover:border-lime/75 hover:bg-black/50"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-lime/15 text-lime transition group-hover:bg-lime/20">
              <IconUpload className="h-9 w-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-lg font-semibold text-white sm:text-xl">
                Importer un pack
              </span>
              <span className="text-sm text-white/55">
                Pack ZIP depuis Engine
              </span>
            </div>
          </motion.button>

          <motion.button
            type="button"
            onClick={onExcelStart}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            className="group flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-black/20 px-5 py-3.5 backdrop-blur-[2px] transition hover:border-white/20 hover:bg-black/30"
          >
            <IconTrophy className="h-5 w-5 shrink-0 text-lime/55 group-hover:text-lime/80" />
            <span className="text-sm font-medium text-white/60 group-hover:text-white/80">
              Depuis un Excel
            </span>
          </motion.button>
        </div>
      </motion.div>
    </ProductEntryLayout>
  );
}

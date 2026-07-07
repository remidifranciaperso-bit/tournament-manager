import { motion } from "framer-motion";
import { IconTrophy, IconUpload } from "../components/Icons";
import { OptionCard } from "../components/ui";

export function ManagerStartStep({
  onExcelStart,
}: {
  onExcelStart: () => void;
}) {
  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-3xl text-center"
      >
        <h2 className="font-display text-2xl tracking-wide text-white sm:text-3xl">
          Comment souhaitez-vous démarrer ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/45 sm:text-base">
          Choisissez votre point de départ pour lancer le tournoi en direct.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <OptionCard
            variant="lime"
            active
            onClick={onExcelStart}
            title="Démarrer mon tournoi live"
            subtitle="Depuis un fichier Excel"
            icon={<IconTrophy />}
          />
          <OptionCard
            variant="lime"
            active={false}
            onClick={() => undefined}
            title="Démarrer à partir d'un PDF généré"
            subtitle="Bientôt disponible"
            icon={<IconUpload />}
            disabled
          />
        </div>
      </motion.div>
    </div>
  );
}

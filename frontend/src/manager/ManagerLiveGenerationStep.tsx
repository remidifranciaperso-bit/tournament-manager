import { motion } from "framer-motion";
import { PadelBall } from "../components/PadelBall";
import { PrimaryButton } from "../components/ui";
import { WizardPageTitle } from "../components/Icons";
import type { Genre } from "../types";
import { generationTagline } from "../wizard/helpers";

export function ManagerLiveGenerationStep({
  generating,
  genError,
  ready,
  genreTournoi,
  onAccessLive,
}: {
  generating: boolean;
  genError: string | null;
  ready: boolean;
  genreTournoi: Genre;
  onAccessLive: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Tournoi live"
        subtitle={
          ready
            ? "Votre tournoi est prêt à être géré en direct."
            : "Préparation du tournoi live en cours…"
        }
      />

      <div className="mx-auto mt-6 w-full max-w-md">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          {ready ? (
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full bg-lime shadow-lime"
            />
          ) : (
            <motion.div
              className="h-full rounded-full bg-lime shadow-lime"
              initial={{ width: "12%" }}
              animate={{ width: generating ? "88%" : "12%" }}
              transition={{
                duration: generating ? 8 : 0.3,
                ease: "easeInOut",
              }}
            />
          )}
        </div>
      </div>

      {generating && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <PadelBall size={40} spinning realistic />
          <p className="text-sm text-white/45">
            Génération du PDF Engine (identique au téléchargement Engine)…
          </p>
        </div>
      )}

      {genError && (
        <p className="mt-6 text-center text-sm text-red-400">{genError}</p>
      )}

      {ready && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span className="font-display text-lg tracking-wide text-lime sm:text-xl">
              TOURNOI PRÊT
            </span>
            <PrimaryButton onClick={onAccessLive}>
              Accéder au tournoi live →
            </PrimaryButton>
          </div>
          <p
            className="mt-14 font-brush text-[clamp(2rem,6.5vw,3.75rem)] leading-none text-lime sm:mt-20"
            style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
          >
            {generationTagline(genreTournoi)}
          </p>
        </motion.div>
      )}
    </div>
  );
}

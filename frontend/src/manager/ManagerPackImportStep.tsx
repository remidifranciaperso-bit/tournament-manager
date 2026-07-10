import { useState } from "react";
import { motion } from "framer-motion";
import { FileDrop } from "../components/FileDrop";
import { IconUpload, WizardPageTitle } from "../components/Icons";
import { PadelBall } from "../components/PadelBall";
import { GhostButton } from "../components/ui";
import { initLiveFromPack } from "../api";
import type { LiveTournamentData } from "./liveTypes";

export function ManagerPackImportStep({
  onReady,
}: {
  onReady: (data: LiveTournamentData) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packFile, setPackFile] = useState<File | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setPackFile(file);
    setError(null);
    setLoading(true);
    try {
      const data = await initLiveFromPack(file);
      onReady(data);
    } catch (err) {
      setPackFile(null);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'importer le pack Manager Live."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Pack Manager Live"
        subtitle="Importez le ZIP téléchargé depuis Engine (PDF + fichier .live.json). Le tableau et les convocations restent identiques à la génération Engine."
      />

      {!loading && (
        <div className="mt-8">
          <FileDrop
            accept=".zip"
            file={packFile}
            onFile={handleFile}
            title="Glissez votre pack ZIP ici"
            hint="Fichier « PDF + pack Manager Live » depuis Engine"
            icon={<IconUpload className="h-7 w-7" />}
            variant="lime"
          />
        </div>
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 flex flex-col items-center gap-4"
        >
          <PadelBall size={40} spinning realistic />
          <p className="text-sm text-white/45">
            Import du tableau figé et préparation du live…
          </p>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-4 text-sm text-red-400"
        >
          {error}
        </motion.div>
      )}

      {error && (
        <div className="mt-4">
          <GhostButton onClick={() => setError(null)}>Réessayer</GhostButton>
        </div>
      )}
    </div>
  );
}

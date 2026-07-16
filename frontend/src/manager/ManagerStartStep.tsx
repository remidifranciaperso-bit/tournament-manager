import { useState } from "react";
import { motion } from "framer-motion";
import { initLiveFromPack } from "../api";
import { IconTrophy, IconUpload } from "../components/Icons";
import { ProductEntryDropZone } from "../components/ProductEntryDropZone";
import {
  ProductBrushHeadline,
  ProductEntryLayout,
} from "../components/ProductEntry";
import { ManagerPackSummaryDialog } from "./ManagerPackSummaryDialog";
import type { LiveTournamentData } from "./liveTypes";

const PACK_DESCRIPTION =
  "Importez le ZIP téléchargé depuis Engine (PDF + fichier .live.json). Le tableau et les convocations restent identiques à la génération Engine.";

export function ManagerStartStep({
  onPackConfirmed,
  onExcelFile,
}: {
  onPackConfirmed: (data: LiveTournamentData) => void;
  onExcelFile: (file: File) => void;
}) {
  const [packFile, setPackFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [pendingPack, setPendingPack] = useState<LiveTournamentData | null>(null);

  const handlePackFile = async (file: File | null) => {
    setPackFile(file);
    setPackError(null);
    setPendingPack(null);
    if (!file) return;

    setPackLoading(true);
    try {
      const data = await initLiveFromPack(file);
      setPendingPack(data);
    } catch (err) {
      setPackFile(null);
      setPackError(
        err instanceof Error
          ? err.message
          : "Impossible d'importer le pack Manager Live."
      );
    } finally {
      setPackLoading(false);
    }
  };

  const handleExcelFile = (file: File | null) => {
    setExcelFile(file);
    if (file) onExcelFile(file);
  };

  const cancelPackSummary = () => {
    setPendingPack(null);
    setPackFile(null);
  };

  return (
    <ProductEntryLayout>
      {pendingPack ? (
        <ManagerPackSummaryDialog
          meta={pendingPack.meta}
          onConfirm={() => {
            onPackConfirmed(pendingPack);
            setPendingPack(null);
          }}
          onCancel={cancelPackSummary}
        />
      ) : null}

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
          <ProductEntryDropZone
            accept=".zip"
            file={packFile}
            onFile={handlePackFile}
            title="Importer un pack"
            description={PACK_DESCRIPTION}
            dropHint="Glissez votre pack ZIP ici"
            icon={<IconUpload className="h-9 w-9" />}
            prominent
            engineDropStyle
            loading={packLoading}
          />

          <ProductEntryDropZone
            accept=".xlsx,.xls"
            file={excelFile}
            onFile={handleExcelFile}
            title="Depuis un fichier Excel"
            dropHint="Glissez votre fichier Excel ici"
            icon={<IconTrophy className="h-7 w-7" />}
          />
        </div>

        {packError ? (
          <p className="mt-5 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {packError}
          </p>
        ) : null}
      </motion.div>
    </ProductEntryLayout>
  );
}

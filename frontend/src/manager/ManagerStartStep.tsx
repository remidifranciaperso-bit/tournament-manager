import { useState } from "react";
import { initLiveFromPack } from "../api";
import { FileDrop } from "../components/FileDrop";
import { IconTable, IconUpload } from "../components/Icons";
import { ProductEntryDropZone } from "../components/ProductEntryDropZone";
import {
  ProductBrushHeadline,
  ProductEntryLayout,
} from "../components/ProductEntry";
import { ManagerPackSummaryDialog } from "./ManagerPackSummaryDialog";
import type { LiveTournamentData } from "./liveTypes";

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
    if (packLoading) return;
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
    <ProductEntryLayout compact alignTop dimContent={!!pendingPack}>
      {pendingPack ? (
        <ManagerPackSummaryDialog
          data={pendingPack}
          onConfirm={() => {
            onPackConfirmed(pendingPack);
            setPendingPack(null);
          }}
          onCancel={cancelPackSummary}
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center overflow-hidden px-2 pt-[clamp(2.75rem,7vh,5rem)] text-center">
        <ProductBrushHeadline product="Live" />

        <div className="mx-auto mt-4 max-w-2xl text-sm text-white/50 sm:mt-5 sm:text-base">
          <p className="leading-snug">
            Importez le pack ZIP téléchargé depuis Engine (PDF + fichier .live.json).
          </p>
          <p className="mt-1 leading-snug">
            Le tableau et les convocations restent identiques à la génération Engine.
          </p>
        </div>

        <div className="mt-9 flex w-full max-w-md flex-col items-stretch gap-6 sm:mt-10">
          <div className="w-full text-center">
            <label className="field-label">Pack Manager Live</label>
            <FileDrop
              accept=".zip"
              file={packFile}
              onFile={handlePackFile}
              title="Glissez votre pack ZIP ici"
              hint={
                packLoading
                  ? "Import du pack en cours…"
                  : "ZIP téléchargé depuis Engine"
              }
              icon={<IconUpload className="h-7 w-7" />}
              variant="lime"
              disabled={packLoading}
            />
          </div>

          <ProductEntryDropZone
            accept=".xlsx,.xls"
            file={excelFile}
            onFile={handleExcelFile}
            title="Depuis un fichier Excel"
            dropHint="Glissez votre fichier Excel ici"
            icon={<IconTable className="h-6 w-6" />}
            compact
          />
        </div>

        {packError ? (
          <p className="mt-5 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {packError}
          </p>
        ) : null}
      </div>
    </ProductEntryLayout>
  );
}

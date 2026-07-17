import { createPortal } from "react-dom";
import { PrimaryButton, GhostButton } from "../components/ui";
import type { LiveTournamentMeta } from "./liveTypes";
import { formatDateFr } from "../wizard/helpers";

interface ManagerPackSummaryDialogProps {
  meta: LiveTournamentMeta;
  onConfirm: () => void;
  onCancel: () => void;
}

function summaryRows(meta: LiveTournamentMeta): { label: string; value: string }[] {
  return [
    { label: "Club", value: meta.club },
    { label: "Date", value: formatDateFr(meta.date_tournoi) },
    {
      label: "Type",
      value: `${meta.type_tournoi}${meta.genre_tournoi ? ` ${meta.genre_tournoi}` : ""}`,
    },
    { label: "Équipes", value: String(meta.nb_equipes) },
    { label: "Déroulement", value: meta.mode_tournoi },
    { label: "Jours", value: String(meta.nb_jours) },
    { label: "Terrains", value: meta.terrains.join(", ") },
    { label: "Durée des matchs", value: `${meta.duree_match} min` },
  ];
}

export function ManagerPackSummaryDialog({
  meta,
  onConfirm,
  onCancel,
}: ManagerPackSummaryDialogProps) {
  const rows = summaryRows(meta);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-summary-title"
        className="w-full max-w-lg rounded-[1.75rem] border border-white/10 bg-arena-900/90 px-6 py-8 text-center shadow-2xl backdrop-blur-xl sm:px-10 sm:py-10"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-lime/70">
          Pack Engine importé
        </p>
        <h2
          id="pack-summary-title"
          className="mt-4 font-brush text-[clamp(1.75rem,6vw,2.5rem)] leading-none text-lime"
          style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
        >
          Résumé du tournoi
        </h2>

        <div className="mt-6 overflow-hidden rounded-2xl border border-lime/20 text-left">
          {rows.map(({ label, value }, index) => (
            <div
              key={label}
              className={[
                "flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5 sm:py-3",
                index % 2 === 0 ? "bg-lime/[0.03]" : "bg-transparent",
                index < rows.length - 1 ? "border-b border-lime/10" : "",
              ].join(" ")}
            >
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/35">
                {label}
              </span>
              <span className="text-right text-sm font-medium text-lime">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PrimaryButton onClick={onConfirm}>Confirmer</PrimaryButton>
          <GhostButton onClick={onCancel}>Annuler</GhostButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { CourtBackground } from "../components/CourtBackground";
import { GhostButton, PrimaryButton } from "../components/ui";
import type { LiveResumeSummary } from "./liveSessionStore";

interface ManagerLiveResumeDialogProps {
  summary: LiveResumeSummary;
  onResume: () => void;
  onDiscard: () => void;
}

function formatDateLabel(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function ManagerLiveResumeDialog({
  summary,
  onResume,
  onDiscard,
}: ManagerLiveResumeDialogProps) {
  const statusLabel = summary.finished
    ? "Tournoi terminé — export PDF en attente"
    : summary.started
      ? `${summary.done}/${summary.total} matchs joués`
      : "Prêt — pas encore commencé";

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      <CourtBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-lg rounded-[1.75rem] border border-white/10 bg-arena-900/75 px-6 py-8 text-center shadow-2xl backdrop-blur-xl sm:px-10 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-lime/70">
            Session active
          </p>
          <h1
            className="mt-4 font-brush text-[clamp(2rem,8vw,3rem)] leading-none text-lime"
            style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
          >
            Reprendre le tournoi ?
          </h1>
          <p className="mt-5 text-lg font-medium text-white/85">{summary.club}</p>
          <p className="mt-1 text-sm text-white/45">
            {formatDateLabel(summary.dateTournoi)}
          </p>
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/70">
            {statusLabel}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <PrimaryButton onClick={onResume}>Reprendre le tournoi</PrimaryButton>
            <GhostButton onClick={onDiscard}>
              Annuler et recommencer un nouveau tournoi
            </GhostButton>
          </div>
        </div>
      </div>
    </div>
  );
}

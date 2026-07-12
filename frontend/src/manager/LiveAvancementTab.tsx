import { LiveProjectionPage } from "./LiveProjectionPage";

interface LiveAvancementTabProps {
  elapsed: string;
  done: number;
  total: number;
  percent: number;
  club: string;
  logoUrl?: string | null;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-arena-600/15 bg-white px-4 py-5 text-center shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-arena-600/55 sm:text-[11px]">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl leading-none text-arena-700 sm:text-3xl">
        {value}
      </div>
    </div>
  );
}

export function LiveAvancementTab({
  elapsed,
  done,
  total,
  percent,
  club,
  logoUrl,
}: LiveAvancementTabProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <LiveProjectionPage club={club} logoUrl={logoUrl}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-arena-600/50">
              Progression du tournoi
            </p>
            <p className="font-display text-[clamp(3rem,12vw,5rem)] leading-none text-template-blue">
              {clampedPercent}%
            </p>
            <p className="text-sm text-arena-600/60">
              {done} match{done > 1 ? "s" : ""} terminé{done > 1 ? "s" : ""} sur{" "}
              {total}
            </p>
          </div>

          <div className="w-full">
            <div className="h-3 overflow-hidden rounded-full bg-arena-600/10">
              <div
                className="h-full rounded-full bg-template-blue transition-none"
                style={{ width: `${clampedPercent}%` }}
              />
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard label="Temps écoulé" value={elapsed} />
            <StatCard label="Matchs joués" value={`${done}/${total}`} />
            <StatCard label="Restants" value={`${Math.max(0, total - done)}`} />
          </div>
        </div>
      </div>
    </LiveProjectionPage>
  );
}

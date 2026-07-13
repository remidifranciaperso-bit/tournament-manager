import { LiveProjectionPage } from "./LiveProjectionPage";

interface LiveAvancementTabProps {
  elapsed: string;
  done: number;
  total: number;
  percent: number;
  club: string;
  logoUrl?: string | null;
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 88;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto aspect-square w-[min(72vw,15.5rem)]">
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="100"
          cy="100"
          r={normalizedRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-arena-600/10"
        />
        <circle
          cx="100"
          cy="100"
          r={normalizedRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          className="text-template-blue transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
        <span className="font-display text-[clamp(2.75rem,10vw,4.25rem)] leading-none text-template-blue">
          {percent}%
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-arena-600/50 sm:text-[11px]">
          complété
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border px-4 py-4 text-center shadow-sm sm:px-5 sm:py-5",
        accent
          ? "border-template-blue/25 bg-template-blue/[0.06]"
          : "border-arena-600/15 bg-white",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-y-3 left-0 w-1 rounded-r-full",
          accent ? "bg-template-blue" : "bg-arena-600/20",
        ].join(" ")}
      />
      <div className="text-[10px] font-semibold uppercase tracking-widest text-arena-600/55 sm:text-[11px]">
        {label}
      </div>
      <div
        className={[
          "mt-2 font-display text-2xl leading-none sm:text-3xl",
          accent ? "text-template-blue" : "text-arena-700",
        ].join(" ")}
      >
        {value}
      </div>
      {hint ? (
        <p className="mt-1.5 text-[11px] text-arena-600/45">{hint}</p>
      ) : null}
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
  const remaining = Math.max(0, total - done);
  const matchWord = (count: number) => (count > 1 ? "matchs" : "match");

  return (
    <LiveProjectionPage club={club} logoUrl={logoUrl}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
          <div className="overflow-hidden rounded-[1.75rem] border border-arena-600/15 bg-white shadow-sm">
            <div className="border-b border-arena-600/10 bg-template-blue/[0.05] px-5 py-4 text-center sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-arena-600/50">
                Progression du tournoi
              </p>
              <p className="mt-2 font-display text-lg text-arena-700 sm:text-xl">
                {done} {matchWord(done)} terminé{done > 1 ? "s" : ""}{" "}
                <span className="text-arena-600/40">/</span> {total}
              </p>
            </div>

            <div className="flex flex-col items-center gap-6 px-5 py-7 sm:gap-7 sm:px-8 sm:py-8">
              <ProgressRing percent={clampedPercent} />

              <div className="w-full max-w-xl">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-arena-600/45">
                  <span>Début</span>
                  <span>Fin du tournoi</span>
                </div>
                <div className="h-3.5 overflow-hidden rounded-full border border-arena-600/10 bg-arena-600/[0.06] p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-template-blue/85 to-template-blue transition-none"
                    style={{ width: `${clampedPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard label="Temps écoulé" value={elapsed} hint="Depuis le coup d'envoi" />
            <StatCard
              label="Matchs joués"
              value={`${done}/${total}`}
              hint={`${clampedPercent}% du planning`}
              accent
            />
            <StatCard
              label="Restants"
              value={String(remaining)}
              hint={
                remaining === 0
                  ? "Tournoi terminé"
                  : `${remaining} ${matchWord(remaining)} à venir`
              }
            />
          </div>
        </div>
      </div>
    </LiveProjectionPage>
  );
}

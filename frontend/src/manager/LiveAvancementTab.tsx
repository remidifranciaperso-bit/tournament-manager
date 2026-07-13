import type { StoredMatchResult } from "./useLiveProgress";
import { formatElapsed } from "./useLiveProgress";
import { LiveProjectionPage } from "./LiveProjectionPage";

interface LiveAvancementTabProps {
  elapsed: string;
  elapsedMs: number;
  done: number;
  total: number;
  percent: number;
  club: string;
  logoUrl?: string | null;
  matchResults: Record<string, StoredMatchResult>;
  matchLaunches: Record<string, number>;
  nbTerrains: number;
  started: boolean;
  finished: boolean;
}

function averageMatchMinutes(
  results: Record<string, StoredMatchResult>,
  launches: Record<string, number>
): string {
  const durations: number[] = [];

  for (const [code, result] of Object.entries(results)) {
    const launched = launches[code] ?? result.launchedAt;
    if (!launched || !result.validatedAt) continue;
    durations.push((result.validatedAt - launched) / 60_000);
  }

  if (durations.length === 0) return "—";
  const avg = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return `${Math.round(avg)} min`;
}

function formatPace(done: number, elapsedMs: number): string {
  if (done === 0 || elapsedMs <= 0) return "—";
  const perHour = done / (elapsedMs / 3_600_000);
  if (perHour >= 10) return `${Math.round(perHour)} / h`;
  return `${perHour.toFixed(1)} / h`;
}

function estimateRemaining(
  elapsedMs: number,
  done: number,
  total: number,
  finished: boolean
): string {
  if (finished) return "Terminé";
  const remaining = total - done;
  if (!finished && remaining <= 0) return "Terminé";
  if (done === 0 || elapsedMs <= 0) return "—";
  return `≈ ${formatElapsed((elapsedMs / done) * remaining)}`;
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-arena-600/15 bg-white px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-arena-600/50">
        {label}
      </p>
      <p className="mt-1 font-display text-xl leading-none text-arena-700 sm:text-2xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-[11px] leading-snug text-arena-600/45">{detail}</p>
      ) : null}
    </div>
  );
}

export function LiveAvancementTab({
  elapsed,
  elapsedMs,
  done,
  total,
  percent,
  club,
  logoUrl,
  matchResults,
  matchLaunches,
  nbTerrains,
  started,
  finished,
}: LiveAvancementTabProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const avgMatch = averageMatchMinutes(matchResults, matchLaunches);
  const pace = formatPace(done, elapsedMs);
  const eta = estimateRemaining(elapsedMs, done, total, finished);

  return (
    <LiveProjectionPage club={club} logoUrl={logoUrl}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:gap-4">
          <section className="rounded-2xl border border-arena-600/15 bg-white px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-arena-600/50">
                  Progression globale
                </p>
                <p className="mt-1.5 font-display text-[clamp(2.25rem,8vw,3.5rem)] leading-none text-template-blue">
                  {clampedPercent}%
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl leading-none text-arena-700 sm:text-3xl">
                  {done}
                  <span className="text-arena-600/30">/</span>
                  {total}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-arena-600/45">
                  matchs
                </p>
              </div>
            </div>

            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-arena-600/10"
              role="progressbar"
              aria-valuenow={clampedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-template-blue transition-none"
                style={{ width: `${clampedPercent}%` }}
              />
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Temps écoulé"
              value={started ? elapsed : "—"}
              detail={started ? "Depuis le coup d'envoi" : "Tournoi pas encore lancé"}
            />
            <StatTile
              label="Durée moyenne"
              value={avgMatch}
              detail="Par match terminé"
            />
            <StatTile
              label="Cadence"
              value={pace}
              detail="Matchs joués par heure"
            />
            <StatTile
              label="Fin estimée"
              value={eta}
              detail={
                finished
                  ? "Tous les matchs sont terminés"
                  : `${nbTerrains} terrain${nbTerrains > 1 ? "s" : ""} au planning`
              }
            />
          </div>
        </div>
      </div>
    </LiveProjectionPage>
  );
}

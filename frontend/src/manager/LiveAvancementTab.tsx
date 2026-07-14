import { useLayoutEffect, useRef, useState } from "react";
import type { StoredMatchResult } from "./useLiveProgress";
import { LiveProjectionPage } from "./LiveProjectionPage";

interface LiveAvancementTabProps {
  elapsed: string;
  done: number;
  total: number;
  percent: number;
  club: string;
  logoUrl?: string | null;
  matchResults: Record<string, StoredMatchResult>;
  matchLaunches: Record<string, number>;
  started: boolean;
  finished: boolean;
}

/** Largeur de référence de l'onglet avancement (avant mise à l'échelle). */
const AVANCEMENT_BASE_WIDTH = 576;

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
    <div className="flex flex-1 flex-col rounded-2xl border border-arena-600/15 bg-white px-4 py-5 text-center sm:px-5 sm:py-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-arena-600/50 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-2 font-display text-[clamp(1.75rem,5vw,2.5rem)] leading-none text-arena-700">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-[11px] leading-snug text-arena-600/45">{detail}</p>
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
  matchResults,
  matchLaunches,
  started,
  finished,
}: LiveAvancementTabProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const avgMatch = averageMatchMinutes(matchResults, matchLaunches);

  const pageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const card = cardRef.current;
    if (!page || !card) return;

    const apply = () => {
      const availW = page.clientWidth;
      const availH = page.clientHeight;
      const naturalH = card.offsetHeight;
      if (availW <= 0 || availH <= 0 || naturalH <= 0) return;

      const nextScale = Math.min(
        1,
        availW / AVANCEMENT_BASE_WIDTH,
        availH / naturalH
      );
      setScale((prev) => (prev === nextScale ? prev : nextScale));
      setNaturalHeight((prev) => (prev === naturalH ? prev : naturalH));
    };

    apply();
    const observer = new ResizeObserver(() => apply());
    observer.observe(page);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <LiveProjectionPage club={club} logoUrl={logoUrl}>
      <div
        ref={pageRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-6"
      >
        <div
          className="relative shrink-0"
          style={{
            width: AVANCEMENT_BASE_WIDTH * scale,
            height: naturalHeight * scale || undefined,
          }}
        >
        <div
          ref={cardRef}
          className="absolute left-0 top-0 flex w-full flex-col gap-4 sm:gap-5"
          style={{
            width: AVANCEMENT_BASE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <section className="overflow-hidden rounded-[1.75rem] border border-arena-600/15 bg-white shadow-sm">
            <div className="bg-template-blue/[0.06] px-5 py-8 text-center sm:px-8 sm:py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-arena-600/50">
                Progression
              </p>
              <p className="mt-3 font-display text-[clamp(4.5rem,22vw,7rem)] leading-none text-template-blue">
                {clampedPercent}%
              </p>
              <p className="mt-4 font-display text-[clamp(1.5rem,5vw,2.25rem)] leading-none text-arena-700">
                {done}
                <span className="mx-1 text-arena-600/25">/</span>
                {total}
                <span className="ml-2 text-[clamp(0.85rem,2.5vw,1.1rem)] font-sans font-semibold uppercase tracking-widest text-arena-600/45">
                  matchs
                </span>
              </p>
            </div>

            <div className="px-5 pb-6 pt-4 sm:px-8 sm:pb-7">
              <div
                className="h-4 overflow-hidden rounded-full bg-arena-600/10 sm:h-5"
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
              {finished ? (
                <p className="mt-3 text-center text-xs font-medium uppercase tracking-widest text-template-blue">
                  Tournoi terminé
                </p>
              ) : null}
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <StatTile
              label="Temps écoulé"
              value={started ? elapsed : "—"}
              detail={started ? "Depuis le coup d'envoi" : "Tournoi pas encore lancé"}
            />
            <StatTile
              label="Durée moyenne des matchs"
              value={avgMatch}
              detail={
                done > 0
                  ? `Calculée sur ${done} match${done > 1 ? "s" : ""} terminé${done > 1 ? "s" : ""}`
                  : "Aucun match terminé pour l'instant"
              }
            />
          </div>
        </div>
        </div>
      </div>
    </LiveProjectionPage>
  );
}

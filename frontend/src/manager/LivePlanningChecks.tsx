import type { LiveMatch } from "./liveTypes";

interface LivePlanningChecksProps {
  matches: LiveMatch[];
  completed: Set<string>;
  onToggle: (code: string) => void;
}

export function LivePlanningChecks({
  matches,
  completed,
  onToggle,
}: LivePlanningChecksProps) {
  if (matches.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-white/[0.08] bg-arena-950/80 px-3 py-2 sm:px-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
        Matchs joués
      </p>
      <div className="max-h-36 space-y-1 overflow-y-auto sm:max-h-44">
        {matches.map((match) => {
          const checked = completed.has(match.code);
          return (
            <label
              key={match.code}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-white/[0.04] sm:text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(match.code)}
                className="size-4 shrink-0 rounded border-white/20 bg-arena-900 accent-lime"
              />
              <span className="shrink-0 font-semibold text-lime/90">{match.code}</span>
              <span className="min-w-0 truncate text-white/70">
                {match.equipe1} vs {match.equipe2}
              </span>
              {match.heure && (
                <span className="ml-auto shrink-0 text-[10px] text-white/35">
                  {match.heure}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

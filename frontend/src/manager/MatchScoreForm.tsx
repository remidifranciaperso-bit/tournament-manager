import { useMemo, useState } from "react";
import type { MatchFormatCode } from "./matchFormats";
import {
  expectedSetCount,
  formatScoreLabel,
  validateMatchScore,
  type SetScore,
  type ValidatedMatchScore,
} from "./matchScoreRules";

interface MatchScoreFormProps {
  format: MatchFormatCode;
  equipe1: string;
  equipe2: string;
  onSubmit: (score: ValidatedMatchScore) => void;
  onCancel: () => void;
}

function emptySets(count: number): SetScore[] {
  return Array.from({ length: count }, () => ({ team1: 0, team2: 0 }));
}

function SetRow({
  index,
  label,
  set,
  onChange,
}: {
  index: number;
  label: string;
  set: SetScore;
  onChange: (index: number, side: "team1" | "team2", value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/50">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={99}
        value={set.team1 || ""}
        onChange={(e) =>
          onChange(index, "team1", Math.max(0, Number(e.target.value) || 0))
        }
        className="w-12 rounded border border-white/20 bg-arena-950/80 px-1.5 py-1 text-center text-sm text-white"
        aria-label={`Set ${index + 1} équipe 1`}
      />
      <span className="text-xs text-white/40">-</span>
      <input
        type="number"
        min={0}
        max={99}
        value={set.team2 || ""}
        onChange={(e) =>
          onChange(index, "team2", Math.max(0, Number(e.target.value) || 0))
        }
        className="w-12 rounded border border-white/20 bg-arena-950/80 px-1.5 py-1 text-center text-sm text-white"
        aria-label={`Set ${index + 1} équipe 2`}
      />
    </div>
  );
}

export function MatchScoreForm({
  format,
  equipe1,
  equipe2,
  onSubmit,
  onCancel,
}: MatchScoreFormProps) {
  const baseSetCount = expectedSetCount(format);
  const [sets, setSets] = useState<SetScore[]>(() => emptySets(baseSetCount));
  const [error, setError] = useState<string | null>(null);

  const needsSuperTb = useMemo(() => {
    if (baseSetCount !== 3 || sets.length < 2) return false;
    const s1 = sets[0];
    const s2 = sets[1];
    const w1 =
      s1.team1 !== s1.team2 ? (s1.team1 > s1.team2 ? 1 : 2) : null;
    const w2 =
      s2.team1 !== s2.team2 ? (s2.team1 > s2.team2 ? 1 : 2) : null;
    return w1 !== null && w2 !== null && w1 !== w2;
  }, [baseSetCount, sets]);

  const visibleSets = needsSuperTb ? 3 : Math.min(sets.length, 2);

  const updateSet = (
    index: number,
    side: "team1" | "team2",
    value: number
  ) => {
    setSets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [side]: value };
      return next;
    });
    setError(null);
  };

  const handleSubmit = () => {
    const activeSets = sets.slice(0, visibleSets);
    const validation = validateMatchScore(format, activeSets);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    onSubmit(validation.result);
  };

  const preview = useMemo(() => {
    const validation = validateMatchScore(format, sets.slice(0, visibleSets));
    if (!validation.ok) return null;
    const winnerLabel =
      validation.result.winner === 1 ? equipe1 : equipe2;
    const loserLabel =
      validation.result.loser === 1 ? equipe1 : equipe2;
    return { winnerLabel, loserLabel, display: validation.result.display };
  }, [format, sets, visibleSets, equipe1, equipe2]);

  return (
    <div className="mt-3 w-full max-w-[280px] rounded-xl border border-lime/20 bg-arena-950/90 p-3 shadow-lg">
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-lime/80">
        Format {format} — {formatScoreLabel(format)}
      </p>

      <div className="mt-3 space-y-2">
        {sets.slice(0, visibleSets).map((set, index) => (
          <SetRow
            key={index}
            index={index}
            label={index === 2 ? "STB" : `Set ${index + 1}`}
            set={set}
            onChange={updateSet}
          />
        ))}
      </div>

      {preview && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-center text-[11px] leading-snug">
          <p className="text-lime">
            Gagnant : <span className="font-semibold">{preview.winnerLabel}</span>
          </p>
          <p className="mt-0.5 text-white/55">
            Perdant : {preview.loserLabel}
          </p>
          <p className="mt-1 font-medium text-white/80">{preview.display}</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-center text-[11px] text-red-300/90">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/15 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/55 transition hover:bg-white/[0.05]"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 rounded-lg border border-lime/35 bg-lime/10 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-lime transition hover:bg-lime/20"
        >
          Valider
        </button>
      </div>
    </div>
  );
}

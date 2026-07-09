interface LiveAvancementTabProps {
  elapsed: string;
  done: number;
  total: number;
  percent: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-arena-600/20 bg-arena-600/[0.04] px-3 py-4 text-center sm:px-4">
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
}: LiveAvancementTabProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center bg-white p-4 sm:p-8">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Temps écoulé" value={elapsed} />
        <StatCard label="Matchs" value={`${done}/${total}`} />
        <StatCard label="% fini" value={`${percent}%`} />
      </div>
    </div>
  );
}

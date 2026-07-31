import { IconClock, IconHourglass, WizardPageTitle } from "../components/Icons";
import type { TournamentForm } from "../types";

export function PlatformPlanningStep({
  form,
  patch,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
}) {
  const horaireLabel = form.nbJours === 1 ? "Horaire" : "Horaires";

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Planning"
        subtitle="Horaires de début et durée estimée des matchs."
      />

      <div className="space-y-8">
        <div className="flex flex-col items-center gap-3">
          <label className="field-label-tight">{horaireLabel}</label>
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            {form.heuresDebutJours.map((heure, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                {form.nbJours > 1 && (
                  <span className="text-xs font-medium uppercase tracking-widest text-white/35">
                    Jour {i + 1}
                  </span>
                )}
                <div className="relative w-[140px]">
                  <IconClock
                    className="pointer-events-none absolute right-full top-1/2 mr-3 h-5 w-5 -translate-y-1/2 text-lime/70"
                    aria-hidden
                  />
                  <input
                    id={`heure-${i}`}
                    className="text-input lime-input w-full text-center"
                    value={heure}
                    onChange={(e) => {
                      const heures = [...form.heuresDebutJours];
                      heures[i] = e.target.value;
                      patch({ heuresDebutJours: heures });
                    }}
                    placeholder="18:00"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <label className="field-label-tight">
            Durée estimée d&apos;un match
          </label>
          <div className="relative w-[140px]">
            <IconHourglass
              className="pointer-events-none absolute right-full top-1/2 mr-3 h-5 w-5 -translate-y-1/2 text-lime/70"
              aria-hidden
            />
            <div className="text-input lime-input w-full text-center">
              {form.dureeMatch} min
            </div>
          </div>
          <div className="w-full max-w-md">
            <input
              type="range"
              min={20}
              max={90}
              step={5}
              value={form.dureeMatch}
              onChange={(e) => patch({ dureeMatch: Number(e.target.value) })}
              className="lime-range mt-1 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-white/25">
              <span>20 min</span>
              <span>90 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

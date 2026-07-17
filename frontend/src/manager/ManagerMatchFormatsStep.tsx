import { WizardPageTitle } from "../components/Icons";
import type { TournamentForm } from "../types";
import { MatchFormatPicker } from "./MatchFormatPicker";
import { matchFormatsStepValid } from "./matchFormats";

export function ManagerMatchFormatsStep({
  form,
  patch,
  club,
  nbEquipes,
  showPoules,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
  club: string;
  nbEquipes: number;
  showPoules: boolean;
}) {
  const subtitle =
    nbEquipes > 0
      ? `${club || "Tournoi importé"} — ${nbEquipes} équipes — formats de score des matchs`
      : "Formats de score des matchs";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col text-center">
      <WizardPageTitle
        title="Formats de match"
        subtitle={subtitle}
        compact
      />

      <div className="relative mt-4 flex min-h-0 flex-1 flex-col pt-4">
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-0 h-2 w-screen max-w-none -translate-x-1/2 bg-arena-950"
          aria-hidden
        />
        <div className="relative z-10 flex shrink-0 flex-col items-center gap-1.5">
          <label className="field-label-section">Formats de match</label>
          <p className="max-w-xl text-xs text-white/40">
            Le tableau, le planning et les convocations viennent du pack Engine.
            Indiquez uniquement les formats de score pour la saisie live.
          </p>
        </div>

        <div
          className={[
            "relative z-10 mt-2 grid min-h-0 flex-1 gap-3 sm:gap-4",
            showPoules ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3",
          ].join(" ")}
        >
          <MatchFormatPicker
            label="Tableau principal"
            value={form.formatMatchTableauPrincipal}
            onChange={(value) => {
              if (value !== "identique") {
                patch({ formatMatchTableauPrincipal: value });
              }
            }}
            scrollable
            compact
          />

          <MatchFormatPicker
            label="Matchs de classements"
            value={form.formatMatchClassement}
            onChange={(value) => patch({ formatMatchClassement: value })}
            allowIdentique
            identiqueOnlyUntilExpanded
            scrollable
            compact
          />

          <MatchFormatPicker
            label="Finale"
            value={form.formatMatchFinale}
            onChange={(value) => patch({ formatMatchFinale: value })}
            allowIdentique
            identiqueOnlyUntilExpanded
            scrollable
            compact
          />

          {showPoules && (
            <MatchFormatPicker
              label="Poules"
              value={form.formatMatchPoule}
              onChange={(value) => patch({ formatMatchPoule: value })}
              allowIdentique
              identiqueOnlyUntilExpanded
              scrollable
              compact
            />
          )}
        </div>

        {!matchFormatsStepValid(form) && (
          <p className="relative z-10 mt-2 shrink-0 text-center text-xs text-amber-300/80">
            Sélectionnez le format du tableau principal pour continuer.
          </p>
        )}
      </div>
    </div>
  );
}

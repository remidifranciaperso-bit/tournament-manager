import { Fragment, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { FileDrop } from "../components/FileDrop";
import {
  IconCheck,
  IconClock,
  IconGrid,
  IconHourglass,
  IconLogo,
  IconTrophy,
  IconUpload,
  WizardPageTitle,
} from "../components/Icons";
import { PadelBall } from "../components/PadelBall";
import { LIVE_LOGO_HEIGHT_CLASS } from "../manager/LiveTabTitle";
import { trimLogoFile } from "../utils/trimLogoImage";
import {
  GhostButton,
  LimeChoice,
  NumberStepper,
  OptionCard,
  PrimaryButton,
  Toggle,
} from "../components/ui";
import { MatchFormatPicker } from "../manager/MatchFormatPicker";
import {
  buildMatchFormatSummaryRows,
  matchFormatsStepValid,
} from "../manager/matchFormats";
import {
  FORMATS_SUPPORTES,
  TYPES_TOURNOI,
  type Genre,
  type PreviewResult,
  type TournamentForm,
} from "../types";
import {
  ENGINE_WELCOME_LEFT,
  ENGINE_WELCOME_RIGHT,
  MANAGER_WELCOME_LEFT,
  MANAGER_WELCOME_RIGHT,
} from "./constants";
import {
  formatDateFr,
  formatHeuresDebut,
  formatModeTournoi,
  syncHeures,
  syncTerrains,
} from "./helpers";

function WelcomeHighlight({
  item,
  delay,
}: {
  item: string;
  delay: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex min-h-[1.125rem] items-center justify-start gap-2 whitespace-nowrap text-xs leading-none text-white/55 sm:min-h-[1.25rem] sm:text-sm"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime">
        <IconCheck className="h-2.5 w-2.5" />
      </span>
      <span>{item}</span>
    </motion.li>
  );
}

function ProductWelcomeStep({
  productLine2,
  tagline,
  description,
  ctaLabel,
  onCta,
  highlightsLeft,
  highlightsRight,
}: {
  productLine2: string;
  tagline: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  highlightsLeft: string[];
  highlightsRight: string[];
}) {
  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center overflow-x-hidden px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-4xl overflow-x-hidden text-center"
      >
        <h1
          className="flex flex-col gap-1.5 font-brush text-[clamp(2.5rem,8vw,5.25rem)] leading-[1.02] text-lime sm:gap-2"
          style={{ textShadow: "0 0 40px rgba(212,255,74,0.15)" }}
        >
          <span>Padel Tournament</span>
          <span>{productLine2}</span>
        </h1>

        <p className="mt-4 text-base font-medium text-white/70 sm:text-lg">
          {tagline}
        </p>

        <p className="mx-auto mt-6 whitespace-nowrap text-center text-[clamp(0.75rem,2.8vw,1rem)] leading-snug text-white/45">
          {description}
        </p>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <PrimaryButton onClick={onCta} size="lg">
            {ctaLabel}
          </PrimaryButton>
        </motion.div>

        <motion.div
          className="mt-12 flex w-full justify-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="lime-panel mx-auto w-fit max-w-full p-7 sm:p-8">
            <ul className="m-0 grid list-none grid-cols-2 gap-x-10 gap-y-3.5 sm:gap-x-12">
              <WelcomeHighlight item="Tableaux pré-remplis" delay={0.52} />
              <WelcomeHighlight
                item={`${FORMATS_SUPPORTES.join("/")} équipes`}
                delay={0.555}
              />
              {highlightsLeft.map((item, i) => (
                <Fragment key={item}>
                  <WelcomeHighlight
                    item={item}
                    delay={0.59 + i * 0.035}
                  />
                  <WelcomeHighlight
                    item={highlightsRight[i]}
                    delay={0.6075 + i * 0.035}
                  />
                </Fragment>
              ))}
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function EngineWelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <ProductWelcomeStep
      productLine2="Engine"
      tagline="Générateur professionnel de tournois padel"
      description="De votre fichier excel au dossier complet, en quelques clics."
      ctaLabel="Générer mon tournoi"
      onCta={onStart}
      highlightsLeft={ENGINE_WELCOME_LEFT}
      highlightsRight={ENGINE_WELCOME_RIGHT}
    />
  );
}

export function ManagerWelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <ProductWelcomeStep
      productLine2="Manager"
      tagline="Gestion professionnelle de tournois padel en live"
      description="De votre fichier excel au tournoi en direct, en quelques clics."
      ctaLabel="Continuer"
      onCta={onStart}
      highlightsLeft={MANAGER_WELCOME_LEFT}
      highlightsRight={MANAGER_WELCOME_RIGHT}
    />
  );
}

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return <EngineWelcomeStep onStart={onStart} />;
}

export function ParticipantsStep({
  form,
  patch,
  preview,
  previewLoading,
  previewError,
  onValidate,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
  preview: PreviewResult | null;
  previewLoading: boolean;
  previewError: string | null;
  onValidate: () => void;
}) {
  const formatsLabel = FORMATS_SUPPORTES.join(", ").replace(/, ([^,]*)$/, " ou $1");

  const resetFile = () => patch({ excelFile: null });

  const analysisReady = preview && !previewLoading;

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Participants"
        subtitle="Importez votre fichier Excel : le moteur lit la liste des joueurs, forme les paires et classe les têtes de séries automatiquement."
      />
      <div>
        {!form.excelFile && (
          <FileDrop
            accept=".xlsx"
            file={null}
            onFile={(f) => patch({ excelFile: f })}
            title="Glissez votre fichier .xlsx ici"
            icon={<IconUpload className="h-7 w-7" />}
          />
        )}

        {form.excelFile && previewLoading && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon/30 border-t-neon" />
            <p className="text-sm text-neon/70 sm:text-base">Analyse en cours…</p>
          </div>
        )}

        {form.excelFile && !previewLoading && previewError && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-10 text-center"
          >
            <p className="text-sm font-semibold text-red-400 sm:text-base">
              {previewError}
            </p>
            <GhostButton onClick={resetFile}>Choisir un autre fichier</GhostButton>
          </motion.div>
        )}

        {form.excelFile && analysisReady && !preview.supporte && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-10 text-center"
          >
            <p className="text-sm font-semibold text-red-400 sm:text-base">
              Nombre d&apos;équipes non supporté par le moteur !
            </p>
            <div className="space-y-1 text-sm text-white/45 sm:text-base">
              <p>{preview.nb_equipes} équipes détectées</p>
              <p>
                Formats acceptés : {formatsLabel} équipes.
              </p>
            </div>
            <GhostButton onClick={resetFile}>Choisir un autre fichier</GhostButton>
          </motion.div>
        )}

        {form.excelFile && analysisReady && preview.supporte && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="lime-panel flex flex-col items-center justify-center gap-6 p-10 text-center"
          >
            <div className="font-display text-4xl tracking-wide text-lime sm:text-5xl">
              {preview.nb_equipes} équipes détectées
            </div>
            <p className="text-sm text-white/45 sm:text-base">
              {form.excelFile.name}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <PrimaryButton onClick={onValidate}>Valider</PrimaryButton>
              <GhostButton onClick={resetFile}>Changer de fichier</GhostButton>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function ClubStep({
  form,
  patch,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
}) {
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoTrimming, setLogoTrimming] = useState(false);

  useEffect(() => {
    if (!form.logoFile || form.pasDeLogo) {
      setLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.logoFile, form.pasDeLogo]);

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Club"
        subtitle="Renseignez le club organisateur et importez le logo de votre club."
      />
      <div className="space-y-6 text-left">
        <div className="mx-auto max-w-md">
          <label className="field-label" htmlFor="club">
            Club organisateur
          </label>
          <input
            id="club"
            name="club-organisateur"
            autoComplete="off"
            className="text-input lime-input uppercase"
            value={form.club}
            onChange={(e) => patch({ club: e.target.value.toUpperCase() })}
            placeholder="Nom du club"
            spellCheck={false}
            autoCapitalize="characters"
            autoCorrect="off"
          />
        </div>

        {!form.pasDeLogo && (
          <div className="mx-auto max-w-md">
            <label className="field-label">Logo du club</label>
            {form.logoFile && logoPreviewUrl ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lime-panel flex flex-col items-center gap-4 p-8 text-center"
              >
                <div className="flex h-28 w-full items-center justify-center rounded-xl bg-white/[0.04] p-4">
                  <img
                    src={logoPreviewUrl}
                    alt="Aperçu du logo"
                    className={`${LIVE_LOGO_HEIGHT_CLASS} w-auto max-w-full object-contain object-center`}
                  />
                </div>
                <p className="text-sm text-white/50">{form.logoFile.name}</p>
                <GhostButton
                  onClick={() => patch({ logoFile: null })}
                >
                  Changer de logo
                </GhostButton>
              </motion.div>
            ) : (
              <FileDrop
                accept=".png,.jpg,.jpeg"
                file={null}
                onFile={async (f) => {
                  if (!f) return;
                  setLogoTrimming(true);
                  try {
                    const trimmed = await trimLogoFile(f);
                    patch({ logoFile: trimmed, pasDeLogo: false });
                  } finally {
                    setLogoTrimming(false);
                  }
                }}
                title={logoTrimming ? "Préparation du logo…" : "Glissez votre logo ici"}
                hint="PNG ou JPG"
                icon={<IconLogo className="h-7 w-7" />}
                variant="lime"
              />
            )}
          </div>
        )}

        <div className="mx-auto flex max-w-md justify-center">
          <Toggle
            variant="lime"
            checked={form.pasDeLogo}
            onChange={(v) =>
              patch(v ? { pasDeLogo: true, logoFile: null } : { pasDeLogo: false })
            }
            label="Pas de logo à importer"
          />
        </div>
      </div>
    </div>
  );
}

export function IdentityStep({
  form,
  patch,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Paramètres du tournoi"
        subtitle="Date, niveau FFT et catégorie du tournoi."
      />

      <div className="space-y-8">
        <div className="flex flex-col items-center gap-1.5">
          <label className="field-label-tight" htmlFor="date">
            Date du tournoi
          </label>
          <input
            id="date"
            type="date"
            className="text-input lime-input w-[min(100%,13rem)]"
            value={form.dateTournoi}
            onChange={(e) => patch({ dateTournoi: e.target.value })}
          />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <label className="field-label-tight">Niveau FFT</label>
          <div className="grid w-full max-w-xl grid-cols-6 gap-1.5 sm:max-w-2xl sm:gap-2">
            {TYPES_TOURNOI.map((t) => (
              <LimeChoice
                key={t}
                label={t}
                active={form.typeTournoi === t}
                onClick={() => patch({ typeTournoi: t })}
                compact
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <label className="field-label-tight">Catégorie</label>
          <div className="grid w-full max-w-md grid-cols-3 gap-1.5 sm:gap-2">
            {(
              [
                { value: "Hommes", label: "Hommes" },
                { value: "Femmes", label: "Femmes" },
                { value: "Mixte", label: "Mixte" },
              ] as const
            ).map((opt) => (
              <LimeChoice
                key={opt.value}
                label={opt.label}
                active={form.genreTournoi === opt.value}
                onClick={() => patch({ genreTournoi: opt.value })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormatStep({
  form,
  patch,
  nbEquipes,
  poulesDisponibles,
  multiJoursDisponible,
  showMatchFormats = false,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
  nbEquipes: number;
  poulesDisponibles: boolean;
  multiJoursDisponible: boolean;
  showMatchFormats?: boolean;
}) {
  const subtitle =
    nbEquipes > 0
      ? `Déroulement du tournoi — ${nbEquipes} équipes`
      : "Déroulement du tournoi";

  const isPoulesMode = form.modeTournoi === "Poules + tableau final";

  return (
    <div
      className={[
        "mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden text-center",
        showMatchFormats ? "max-w-6xl" : "max-w-2xl",
      ].join(" ")}
    >
      <WizardPageTitle
        title="Format"
        subtitle={subtitle}
        compact={showMatchFormats}
      />

      <div
        className={[
          "shrink-0 text-left",
          showMatchFormats ? "space-y-4" : "space-y-8",
        ].join(" ")}
      >
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          <OptionCard
            variant="lime"
            active={form.modeTournoi === "Élimination directe"}
            onClick={() => patch({ modeTournoi: "Élimination directe" })}
            title="Tableau principal"
            subtitle="et tableaux de classements"
            icon={<IconTrophy />}
          />
          <OptionCard
            variant="lime"
            active={form.modeTournoi === "Poules + tableau final"}
            onClick={() => patch({ modeTournoi: "Poules + tableau final" })}
            title="Poules + Tableau final"
            subtitle="et tableaux de classements"
            icon={<IconGrid />}
            disabled={!poulesDisponibles}
          />
        </div>

        {form.modeTournoi === "Poules + tableau final" && (
          <div className="flex flex-col items-center gap-1.5">
            <label className="field-label-tight">Constitution des poules</label>
            <div className="grid w-full max-w-md grid-cols-2 gap-1.5 sm:gap-2">
              <LimeChoice
                variant="halo"
                label={
                  <>
                    Méthode du
                    <br />
                    serpentin
                  </>
                }
                active={form.methodePoules === "Méthode du serpentin"}
                onClick={() =>
                  patch({ methodePoules: "Méthode du serpentin" })
                }
              />
              <LimeChoice
                variant="halo"
                label={
                  <>
                    Tirage au sort
                    <br />
                    par rang
                  </>
                }
                active={form.methodePoules === "Tirage au sort par rang"}
                onClick={() =>
                  patch({ methodePoules: "Tirage au sort par rang" })
                }
              />
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5">
          <label className="field-label-section">Nombre de jours</label>
          {multiJoursDisponible ? (
            <div className="grid w-full max-w-md grid-cols-3 gap-1.5 sm:gap-2">
              {(
                [
                  { value: 1, label: "1 jour" },
                  { value: 2, label: "2 jours" },
                  { value: 3, label: "3 jours" },
                ] as const
              ).map((opt) => (
                <LimeChoice
                  key={opt.value}
                  label={opt.label}
                  active={form.nbJours === opt.value}
                  onClick={() => patch(syncHeures(form, opt.value))}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-white/40">
              Formats 8, 12 et 16 équipes : 1 jour uniquement.
            </p>
          )}
        </div>
      </div>

      {showMatchFormats && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-white/10 pt-4">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <label className="field-label-section">Formats de match</label>
          </div>

          <div
            className={[
              "mt-2 grid min-h-0 flex-1 gap-3 sm:gap-4",
              isPoulesMode ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3",
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

            {isPoulesMode && (
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
            <p className="mt-2 shrink-0 text-center text-xs text-amber-300/80">
              Sélectionnez le format du tableau principal pour continuer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function PlanningStep({
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
          <div className="flex w-full max-w-md flex-col gap-3">
            {form.heuresDebutJours.map((heure, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-center"
              >
                {form.nbJours > 1 && (
                  <span className="min-w-[4.5rem] text-xs font-medium uppercase tracking-widest text-white/35">
                    Jour {i + 1}
                  </span>
                )}
                <div className="relative w-[140px]">
                  <IconClock className="pointer-events-none absolute right-full top-1/2 mr-3 h-5 w-5 -translate-y-1/2 text-lime/70" />
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
            <IconHourglass className="pointer-events-none absolute right-full top-1/2 mr-3 h-5 w-5 -translate-y-1/2 text-lime/70" />
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

export function TerrainsStep({
  form,
  patch,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Terrains"
        subtitle="Nombre, noms et terrain principal pour la finale."
      />

      <div className="space-y-8 text-left">
        <div className="flex flex-col items-center gap-3">
          <label className="field-label-tight">Nombre de terrains</label>
          <NumberStepper
            value={form.nbTerrains}
            min={1}
            max={8}
            onChange={(nb) => patch(syncTerrains(form, nb))}
          />
        </div>

        <div className="mx-auto w-full max-w-md space-y-3">
          <label className="field-label-tight">Noms des terrains</label>
          {form.terrains.map((nom, i) => (
            <input
              key={i}
              className="text-input lime-input uppercase"
              value={nom}
              onChange={(e) => {
                const terrains = [...form.terrains];
                terrains[i] = e.target.value.toUpperCase();
                patch({ terrains });
              }}
              placeholder={`Terrain ${i + 1}`}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          ))}
        </div>

        <div className="mx-auto w-full max-w-md">
          <label className="field-label-tight" htmlFor="terrain-principal">
            Terrain principal — finale
          </label>
          <select
            id="terrain-principal"
            className="text-input lime-input"
            value={form.terrainPrincipal}
            onChange={(e) => patch({ terrainPrincipal: e.target.value })}
          >
            {form.terrains.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function SummaryStep({
  form,
  preview,
  showMatchFormats = false,
}: {
  form: TournamentForm;
  preview: PreviewResult | null;
  showMatchFormats?: boolean;
}) {
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!form.logoFile || form.pasDeLogo) {
      setLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.logoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.logoFile, form.pasDeLogo]);

  const rows: { label: string; value: ReactNode }[] = [
    ["Club organisateur", form.club || "—"],
    {
      label: "Logo",
      value:
        form.pasDeLogo || !logoPreviewUrl ? (
          <span>Pas de logo</span>
        ) : (
          <img
            src={logoPreviewUrl}
            alt="Logo du club"
            className={`${LIVE_LOGO_HEIGHT_CLASS} ml-auto max-w-[88px] object-contain`}
          />
        ),
    },
    {
      label: "Date",
      value: (
        <div className="text-right">
          <div>{formatDateFr(form.dateTournoi)}</div>
          <div className="mt-0.5 text-xs text-lime/70">
            {formatHeuresDebut(form)}
          </div>
        </div>
      ),
    },
    ["Type", `${form.typeTournoi} ${form.genreTournoi}`],
    ["Nombre d'équipes", preview ? String(preview.nb_equipes) : "—"],
    ["Déroulement", formatModeTournoi(form.modeTournoi)],
    ["Jours", String(form.nbJours)],
    ["Terrains", String(form.nbTerrains)],
    ["Durée des matchs", `${form.dureeMatch} min`],
    ...(showMatchFormats ? buildMatchFormatSummaryRows(form) : []),
  ].map((row) =>
    Array.isArray(row) ? { label: row[0], value: row[1] } : row
  );

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Résumé du tournoi"
        subtitle="Vérifiez le récapitulatif avant de lancer la génération."
        compact
      />

      <div className="overflow-hidden rounded-2xl border border-lime/20">
        {rows.map(({ label, value }, i) => (
          <div
            key={label}
            className={[
              "flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5 sm:py-3",
              i % 2 === 0 ? "bg-lime/[0.03]" : "bg-transparent",
              i < rows.length - 1 ? "border-b border-lime/10" : "",
            ].join(" ")}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-white/35">
              {label}
            </span>
            <div className="text-right text-sm font-medium text-lime">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadOptionClass(downloaded: boolean) {
  return downloaded
    ? "inline-flex w-full flex-col items-center justify-center gap-1 rounded-xl bg-lime px-5 py-3 text-sm font-bold text-arena-950 shadow-lime transition hover:brightness-110"
    : "inline-flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-lime/35 bg-lime/10 px-5 py-3 text-sm font-semibold text-lime transition hover:bg-lime/15";
}

function downloadSubtitleClass(downloaded: boolean) {
  return downloaded
    ? "text-[11px] font-normal text-arena-950/70"
    : "text-[11px] font-normal text-lime/70";
}

export function GenerationStep({
  generating,
  genError,
  pdfUrl,
  pdfFilename,
  genreTournoi,
  liveSnapshotAvailable = false,
  pdfDownloaded = false,
  managerPackDownloaded = false,
  hasTelecharge = false,
  generatingMessage,
  onDownloadPdf,
  onDownloadManagerLive,
  onRegenerateSame,
}: {
  generating: boolean;
  genError: string | null;
  pdfUrl: string | null;
  pdfFilename: string;
  genreTournoi: Genre;
  liveSnapshotAvailable?: boolean;
  pdfDownloaded?: boolean;
  managerPackDownloaded?: boolean;
  hasTelecharge?: boolean;
  generatingMessage?: string;
  onDownloadPdf: () => void;
  onDownloadManagerLive?: () => void;
  onRegenerateSame?: () => void;
}) {
  const done = !!pdfUrl && !generating;
  const afficherRegenerer = hasTelecharge && !generating;
  const taglineLine1 =
    genreTournoi === "Femmes" ? "QUE LES MEILLEURES" : "QUE LES MEILLEURS";

  const sousTitre = generating
    ? generatingMessage ?? "Production du PDF en cours…"
    : done && !afficherRegenerer
      ? "Votre dossier tournoi est prêt."
      : "\u00a0";

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle title="Génération" subtitle={sousTitre} />

      <div className="mx-auto mt-6 flex min-h-[3.75rem] w-full max-w-md items-center justify-center">
        {generating ? (
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-lime shadow-lime"
              initial={{ width: "12%" }}
              animate={{ width: "88%" }}
              transition={{
                duration: 8,
                ease: "easeInOut",
              }}
            />
          </div>
        ) : afficherRegenerer && onRegenerateSame ? (
          <button
            type="button"
            onClick={onRegenerateSame}
            className="inline-flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-lime/30 hover:bg-white/[0.06] hover:text-lime"
          >
            <span>Regénérer le même tournoi</span>
            <span className="text-[11px] font-normal text-white/45">
              nouveau tirage au sort - paramètres identiques
            </span>
          </button>
        ) : done ? (
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full bg-lime shadow-lime"
            />
          </div>
        ) : (
          <div className="h-2 w-full" aria-hidden />
        )}
      </div>

      {generating && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <PadelBall size={40} spinning realistic />
          <p className="text-sm text-white/45">
            Tableaux · Convocations · Planning
          </p>
        </div>
      )}

      {genError && (
        <p className="mt-6 text-center text-sm text-red-400">{genError}</p>
      )}

      {done && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <div className="flex flex-col items-center gap-4">
            <span className="font-display text-lg tracking-wide text-lime sm:text-xl">
              Dossier prêt à être téléchargé
            </span>

            <div className="flex w-full max-w-md flex-col gap-3">
              <a
                href={pdfUrl}
                download={pdfFilename}
                onClick={onDownloadPdf}
                className={downloadOptionClass(pdfDownloaded)}
              >
                <span>PDF seul</span>
                <span className={downloadSubtitleClass(pdfDownloaded)}>
                  participants-convocations-tableaux-planning-classement final
                </span>
              </a>

              {liveSnapshotAvailable && onDownloadManagerLive && (
                <button
                  type="button"
                  onClick={onDownloadManagerLive}
                  className={downloadOptionClass(managerPackDownloaded)}
                >
                  <span>PDF + pack Manager Live</span>
                  <span className={downloadSubtitleClass(managerPackDownloaded)}>
                    Conserve le tableau et les convocations pour un live ultérieur
                  </span>
                </button>
              )}
            </div>
          </div>
          <div
            className="mx-auto mt-14 flex w-full max-w-full flex-col items-center px-2 font-brush text-[clamp(1.85rem,5.5vw,3.25rem)] leading-none text-lime sm:mt-20"
            style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
            aria-label={`${taglineLine1} GAGNENT`}
          >
            <span className="whitespace-nowrap">{taglineLine1}</span>
            <span className="whitespace-nowrap">GAGNENT</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

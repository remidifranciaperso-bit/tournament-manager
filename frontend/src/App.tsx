import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { generateTournament, previewExcel } from "./api";
import { CourtBackground } from "./components/CourtBackground";
import { FileDrop } from "./components/FileDrop";
import {
  IconClock,
  IconGrid,
  IconLogo,
  IconTrophy,
  IconUpload,
  WizardPageTitle,
} from "./components/Icons";
import { PadelBall } from "./components/PadelBall";
import { Stepper, StepperMobile } from "./components/Stepper";
import {
  GhostButton,
  NumberStepper,
  OptionCard,
  PrimaryButton,
  LimeChoice,
  Toggle,
} from "./components/ui";
import {
  FORMATS_SUPPORTES,
  TYPES_TOURNOI,
  defaultForm,
  type PreviewResult,
  type TournamentForm,
} from "./types";

const STEPS = [
  { key: "welcome", label: "Accueil" },
  { key: "participants", label: "Participants" },
  { key: "club", label: "Club" },
  { key: "identity", label: "Paramètres" },
  { key: "format", label: "Format" },
  { key: "planning", label: "Planning" },
  { key: "terrains", label: "Terrains" },
  { key: "generate", label: "Génération" },
];

const WIZARD_STEPS = STEPS.slice(1);

function formatDateFr(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function syncTerrains(form: TournamentForm, nb: number): TournamentForm {
  const terrains = [...form.terrains];
  while (terrains.length < nb) terrains.push(`Terrain ${terrains.length + 1}`);
  while (terrains.length > nb) terrains.pop();
  const terrainPrincipal = terrains.includes(form.terrainPrincipal)
    ? form.terrainPrincipal
    : terrains[0] ?? "Terrain 1";
  return { ...form, nbTerrains: nb, terrains, terrainPrincipal };
}

function syncHeures(form: TournamentForm, nbJours: number): TournamentForm {
  const heures = [...form.heuresDebutJours];
  while (heures.length < nbJours) {
    heures.push(heures.length === 0 ? "18:00" : "09:00");
  }
  while (heures.length > nbJours) heures.pop();
  return { ...form, nbJours, heuresDebutJours: heures };
}

function poulesDisponibleFrom(nb: number) {
  return nb === 20 || nb === 24;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TournamentForm>(defaultForm);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("tournoi.pdf");

  const nbEquipes = preview?.nb_equipes ?? 0;
  const poulesDisponibles = nbEquipes === 20 || nbEquipes === 24;
  const multiJoursDisponible = nbEquipes >= 20;

  const patch = useCallback((partial: Partial<TournamentForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    if (!form.excelFile) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    previewExcel(form.excelFile)
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
        setForm((prev) => {
          let next = { ...prev };
          if (!poulesDisponibleFrom(result.nb_equipes)) {
            next.modeTournoi = "Élimination directe";
          }
          if (result.nb_equipes < 20) next = syncHeures(next, 1);
          return next;
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.excelFile]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        if (!form.excelFile || previewLoading) return false;
        return !previewError && !!preview?.supporte;
      case 2:
        return (
          form.club.trim() !== "" &&
          (form.pasDeLogo || form.logoFile !== null)
        );
      case 3:
        return form.dateTournoi !== "";
      case 4:
        return true;
      case 5:
        return form.heuresDebutJours.every((h) => h.trim() !== "");
      case 6:
        return (
          form.terrains.length > 0 &&
          form.terrains.every((t) => t.trim() !== "")
        );
      case 7:
        return true;
      default:
        return false;
    }
  }, [step, form, preview, previewLoading, previewError]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    try {
      const { blob, filename } = await generateTournament(form);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(filename);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#00e5c3", "#d4ff4a", "#ffffff"],
      });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  if (step === 0) {
    return (
      <div className="relative flex min-h-full flex-col">
        <CourtBackground />
        <WelcomeStep onStart={() => setStep(1)} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full">
      <CourtBackground />

      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-arena-900/50 p-6 backdrop-blur-xl lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <PadelBall size={32} />
          <div>
            <div className="font-display text-lg tracking-wider text-white">
              PADEL TM
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/30">
              Tournament Manager
            </div>
          </div>
        </div>
        <Stepper
          steps={WIZARD_STEPS}
          current={step - 1}
          onGo={(i) => i < step - 1 && setStep(i + 1)}
        />
        <div className="mt-auto pt-8">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-[10px] uppercase tracking-widest text-white/30">
              Progression
            </div>
            <div className="mt-1 font-display text-3xl text-neon">
              {Math.round(((step) / (STEPS.length - 1)) * 100)}%
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        {/* Header mobile */}
        <header className="border-b border-white/[0.06] bg-arena-900/40 px-4 py-4 backdrop-blur-xl lg:hidden">
          <StepperMobile steps={WIZARD_STEPS} current={step - 1} />
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 && (
                <ParticipantsStep
                  form={form}
                  patch={patch}
                  preview={preview}
                  previewLoading={previewLoading}
                  previewError={previewError}
                  onValidate={goNext}
                />
              )}
              {step === 2 && <ClubStep form={form} patch={patch} />}
              {step === 3 && <IdentityStep form={form} patch={patch} />}
              {step === 4 && (
                <FormatStep
                  form={form}
                  patch={patch}
                  nbEquipes={nbEquipes}
                  poulesDisponibles={poulesDisponibles}
                  multiJoursDisponible={multiJoursDisponible}
                />
              )}
              {step === 5 && <PlanningStep form={form} patch={patch} />}
              {step === 6 && <TerrainsStep form={form} patch={patch} />}
              {step === 7 && (
                <GenerateStep
                  form={form}
                  preview={preview}
                  generating={generating}
                  genError={genError}
                  pdfUrl={pdfUrl}
                  pdfFilename={pdfFilename}
                  onGenerate={handleGenerate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="sticky bottom-0 border-t border-white/[0.06] bg-arena-900/60 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            {step > 1 ? (
              <GhostButton onClick={goBack}>← Retour</GhostButton>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 &&
            step !== 1 &&
            (step !== 2 || stepValid) ? (
              <PrimaryButton onClick={goNext} disabled={!stepValid}>
                Continuer →
              </PrimaryButton>
            ) : (
              <div />
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-2xl text-center"
      >
        <h1
          className="font-brush text-[clamp(3.25rem,11vw,6.75rem)] leading-[1.05] text-lime"
          style={{ textShadow: "0 0 40px rgba(212,255,74,0.15)" }}
        >
          Padel Tournament Engine
        </h1>

        <p className="mt-4 text-base font-medium text-white/70 sm:text-lg">
          Générateur professionnel de tournois padel
        </p>

        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/45 sm:text-base">
          De votre fichier Excel au dossier complet en PDF — tableaux,
          convocations, planning et classement. En quelques clics.
        </p>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <PrimaryButton onClick={onStart} size="lg">
            Générer mon tournoi
          </PrimaryButton>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ParticipantsStep({
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

function formatModeTournoi(mode: string) {
  if (mode === "Élimination directe") return "Tableau principal";
  if (mode === "Poules + tableau final") return "Poules + Tableau final";
  return mode;
}

function ClubStep({
  form,
  patch,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
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
            className="text-input lime-input"
            value={form.club}
            onChange={(e) => patch({ club: e.target.value })}
            placeholder="Padel Club Paris"
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
                <div className="flex h-36 w-full items-center justify-center rounded-xl bg-white/[0.04] p-4">
                  <img
                    src={logoPreviewUrl}
                    alt="Aperçu du logo"
                    className="max-h-full max-w-full object-contain"
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
                onFile={(f) => {
                  if (f) patch({ logoFile: f, pasDeLogo: false });
                }}
                title="Glissez votre logo ici"
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

function IdentityStep({
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

function FormatStep({
  form,
  patch,
  nbEquipes,
  poulesDisponibles,
  multiJoursDisponible,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
  nbEquipes: number;
  poulesDisponibles: boolean;
  multiJoursDisponible: boolean;
}) {
  const subtitle =
    nbEquipes > 0
      ? `Déroulement du tournoi — ${nbEquipes} équipes`
      : "Déroulement du tournoi";

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle title="Format" subtitle={subtitle} />

      <div className="space-y-8 text-left">
        <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="field-label-tight">Nombre de jours</label>
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

        <div className="flex flex-col items-center gap-1.5">
          <label className="field-label-tight">Style du dossier</label>
          <div className="grid w-full max-w-md grid-cols-2 gap-1.5 sm:gap-2">
            <LimeChoice
              label="Basic"
              active={form.styleTemplates === "Basic"}
              onClick={() => patch({ styleTemplates: "Basic" })}
            />
            <LimeChoice
              label="Avancé"
              active={form.styleTemplates === "Avancé"}
              onClick={() => patch({ styleTemplates: "Avancé" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanningStep({
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
                <div className="flex items-center gap-3">
                  <IconClock className="h-5 w-5 shrink-0 text-lime/70" />
                  <input
                    id={`heure-${i}`}
                    className="text-input lime-input max-w-[140px]"
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
            Durée estimée d&apos;un match — {form.dureeMatch} min
          </label>
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

function TerrainsStep({
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
              className="text-input lime-input"
              value={nom}
              onChange={(e) => {
                const terrains = [...form.terrains];
                terrains[i] = e.target.value;
                patch({ terrains });
              }}
              placeholder={`Terrain ${i + 1}`}
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

function GenerateStep({
  form,
  preview,
  generating,
  genError,
  pdfUrl,
  pdfFilename,
  onGenerate,
}: {
  form: TournamentForm;
  preview: PreviewResult | null;
  generating: boolean;
  genError: string | null;
  pdfUrl: string | null;
  pdfFilename: string;
  onGenerate: () => void;
}) {
  const rows: [string, string][] = [
    ["Club organisateur", form.club || "—"],
    [
      "Logo",
      form.pasDeLogo
        ? "Pas de logo"
        : form.logoFile?.name ?? "—",
    ],
    ["Date", formatDateFr(form.dateTournoi)],
    ["Type", `${form.typeTournoi} ${form.genreTournoi}`],
    ["Équipes", preview ? String(preview.nb_equipes) : "—"],
    ["Déroulement", formatModeTournoi(form.modeTournoi)],
    ["Jours", String(form.nbJours)],
    ["Terrains", String(form.nbTerrains)],
    ["Style", form.styleTemplates],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <WizardPageTitle
        title="Résumé du tournoi"
        subtitle="Vérifiez le récapitulatif et lancez la production du PDF."
      />

      <div className="overflow-hidden rounded-2xl border border-lime/20">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={[
              "flex items-center justify-between gap-4 px-5 py-3.5",
              i % 2 === 0 ? "bg-lime/[0.03]" : "bg-transparent",
              i < rows.length - 1 ? "border-b border-lime/10" : "",
            ].join(" ")}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-white/35">
              {label}
            </span>
            <span className="text-right text-sm font-medium text-lime">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        {generating ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <PadelBall size={64} spinning />
            <div className="text-center">
              <p className="font-display text-xl tracking-wide text-neon">
                GÉNÉRATION EN COURS
              </p>
              <p className="mt-1 text-sm text-white/40">
                Tableaux · Convocations · Planning
              </p>
            </div>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-neon to-lime"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                style={{ width: "40%" }}
              />
            </div>
          </div>
        ) : (
          <PrimaryButton onClick={onGenerate} size="lg" disabled={generating}>
            Générer le dossier PDF
          </PrimaryButton>
        )}
        {genError && (
          <p className="text-center text-sm text-red-400">{genError}</p>
        )}
      </div>

      {pdfUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-4"
        >
          <div className="flex items-center justify-between gap-3 rounded-xl border border-neon/20 bg-neon/5 px-5 py-4">
            <div>
              <p className="font-display text-lg tracking-wide text-neon">
                DOSSIER PRÊT
              </p>
              <p className="text-xs text-white/40">{pdfFilename}</p>
            </div>
            <a
              href={pdfUrl}
              download={pdfFilename}
              className="inline-flex items-center gap-2 rounded-xl bg-lime px-5 py-2.5 text-sm font-bold text-arena-950 shadow-lime transition hover:brightness-110"
            >
              Télécharger ↓
            </a>
          </div>
          <iframe
            title="Aperçu PDF"
            src={pdfUrl}
            className="h-[500px] w-full rounded-2xl border border-white/10 bg-white shadow-panel"
          />
        </motion.div>
      )}
    </div>
  );
}

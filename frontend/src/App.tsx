import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { generateTournament, previewExcel } from "./api";
import { CourtBackground, CourtGraphic } from "./components/CourtBackground";
import { FileDrop } from "./components/FileDrop";
import {
  FeaturePill,
  IconClock,
  IconGrid,
  IconLogo,
  IconTrophy,
  IconUpload,
  StepHeader,
} from "./components/Icons";
import { PadelBall } from "./components/PadelBall";
import { Stepper, StepperMobile } from "./components/Stepper";
import {
  Badge,
  GhostButton,
  NumberStepper,
  OptionCard,
  PrimaryButton,
  Segmented,
  Toggle,
  TypeChip,
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
  { key: "import", label: "Import" },
  { key: "identity", label: "Identité" },
  { key: "format", label: "Format" },
  { key: "planning", label: "Planning" },
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
        if (previewError || !preview?.supporte) return false;
        if (form.pasDeLogo) return form.club.trim() !== "";
        return form.logoFile !== null;
      case 2:
        return form.dateTournoi !== "";
      case 3:
        return true;
      case 4:
        return (
          form.terrains.length > 0 &&
          form.terrains.every((t) => t.trim() !== "") &&
          form.heuresDebutJours.every((h) => h.trim() !== "")
        );
      case 5:
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
                <ImportStep
                  form={form}
                  patch={patch}
                  preview={preview}
                  previewLoading={previewLoading}
                  previewError={previewError}
                />
              )}
              {step === 2 && <IdentityStep form={form} patch={patch} />}
              {step === 3 && (
                <FormatStep
                  form={form}
                  patch={patch}
                  nbEquipes={nbEquipes}
                  poulesDisponibles={poulesDisponibles}
                  multiJoursDisponible={multiJoursDisponible}
                />
              )}
              {step === 4 && <PlanningStep form={form} patch={patch} />}
              {step === 5 && (
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
            {step < STEPS.length - 1 ? (
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
  const features = [
    "Participants",
    "Tableaux",
    "Convocations",
    "Planning",
    "Classement",
  ];

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Texte */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neon/20 bg-neon/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
            <span className="text-xs font-medium uppercase tracking-widest text-neon">
              Générateur professionnel
            </span>
          </div>

          <h1 className="font-display text-[clamp(3.5rem,10vw,7rem)] leading-[0.9] tracking-wide text-white">
            TOURNOI
            <br />
            <span className="text-neon">PADEL</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-white/50">
            De votre fichier Excel au dossier complet en PDF — tableaux,
            convocations, planning et classement. En quelques clics.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {features.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
              >
                <FeaturePill>{f}</FeaturePill>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <PrimaryButton onClick={onStart} size="lg">
              Créer mon tournoi →
            </PrimaryButton>
          </motion.div>
        </motion.div>

        {/* Court graphique */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative hidden justify-center lg:flex"
        >
          <div className="absolute inset-0 rounded-full bg-neon/10 blur-3xl" />
          <motion.div
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <CourtGraphic className="relative h-[420px] w-auto drop-shadow-2xl" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function ImportStep({
  form,
  patch,
  preview,
  previewLoading,
  previewError,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
  preview: PreviewResult | null;
  previewLoading: boolean;
  previewError: string | null;
}) {
  return (
    <section className="panel p-8">
      <StepHeader
        num="01"
        title="IMPORT"
        subtitle="Fichier Excel des participants et identité visuelle du club."
      />
      <div className="space-y-6">
        <div>
          <label className="field-label">Fichier Excel</label>
          <FileDrop
            accept=".xlsx"
            file={form.excelFile}
            onFile={(f) => patch({ excelFile: f })}
            title="Glissez votre .xlsx ici"
            hint="Liste des participants — première feuille"
            icon={<IconUpload className="h-7 w-7" />}
          />
          {previewLoading && (
            <p className="mt-3 text-sm text-neon/70">Analyse en cours…</p>
          )}
          {previewError && (
            <p className="mt-3 text-sm text-red-400">{previewError}</p>
          )}
          {preview && !previewLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex flex-wrap gap-2"
            >
              <Badge variant="success">
                {preview.nb_equipes} équipes détectées
              </Badge>
              {!preview.supporte && (
                <Badge variant="warning">
                  Format non supporté — {FORMATS_SUPPORTES.join(", ")} équipes
                </Badge>
              )}
            </motion.div>
          )}
        </div>

        <Toggle
          checked={form.pasDeLogo}
          onChange={(v) => patch({ pasDeLogo: v })}
          label="Pas de logo — saisir le nom du club"
        />

        {form.pasDeLogo ? (
          <div>
            <label className="field-label" htmlFor="club">
              Club organisateur
            </label>
            <input
              id="club"
              className="text-input"
              value={form.club}
              onChange={(e) => patch({ club: e.target.value })}
              placeholder="Padel Club Paris"
            />
          </div>
        ) : (
          <div>
            <label className="field-label">Logo du club</label>
            <FileDrop
              accept=".png,.jpg,.jpeg"
              file={form.logoFile}
              onFile={(f) => patch({ logoFile: f })}
              title="Logo PNG ou JPG"
              hint="Affiché en bas de chaque page du dossier"
              icon={<IconLogo className="h-7 w-7" />}
            />
          </div>
        )}
      </div>
    </section>
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
    <section className="panel p-8">
      <StepHeader
        num="02"
        title="IDENTITÉ"
        subtitle="Date, niveau FFT et catégorie du tournoi."
      />
      <div className="space-y-8">
        <div>
          <label className="field-label" htmlFor="date">
            Date du tournoi
          </label>
          <input
            id="date"
            type="date"
            className="text-input max-w-xs"
            value={form.dateTournoi}
            onChange={(e) => patch({ dateTournoi: e.target.value })}
          />
        </div>

        <div>
          <label className="field-label">Type de tournoi</label>
          <div className="flex flex-wrap gap-2">
            {TYPES_TOURNOI.map((t) => (
              <TypeChip
                key={t}
                label={t}
                active={form.typeTournoi === t}
                onClick={() => patch({ typeTournoi: t })}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Catégorie</label>
          <Segmented
            id="genre"
            value={form.genreTournoi}
            options={[
              { value: "Hommes", label: "Hommes" },
              { value: "Femmes", label: "Femmes" },
              { value: "Mixte", label: "Mixte" },
            ]}
            onChange={(v) => patch({ genreTournoi: v })}
          />
        </div>
      </div>
    </section>
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
  return (
    <section className="panel p-8">
      <StepHeader
        num="03"
        title="FORMAT"
        subtitle={
          nbEquipes > 0
            ? `${nbEquipes} équipes — déroulement et style du dossier.`
            : "Déroulement et style du dossier."
        }
      />
      <div className="space-y-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            active={form.modeTournoi === "Élimination directe"}
            onClick={() => patch({ modeTournoi: "Élimination directe" })}
            title="Élimination directe"
            subtitle="Tableau classique"
            icon={<IconTrophy />}
          />
          <OptionCard
            active={form.modeTournoi === "Poules + tableau final"}
            onClick={() => patch({ modeTournoi: "Poules + tableau final" })}
            title="Poules + tableau final"
            subtitle="20 et 24 équipes uniquement"
            icon={<IconGrid />}
            disabled={!poulesDisponibles}
          />
        </div>

        {form.modeTournoi === "Poules + tableau final" && (
          <div>
            <label className="field-label">Constitution des poules</label>
            <Segmented
              id="poules"
              value={form.methodePoules}
              options={[
                { value: "Méthode du serpentin", label: "Serpentin" },
                { value: "Tirage au sort par rang", label: "Tirage au sort" },
              ]}
              onChange={(v) => patch({ methodePoules: v })}
            />
          </div>
        )}

        <div>
          <label className="field-label">Nombre de jours</label>
          {multiJoursDisponible ? (
            <Segmented
              id="jours"
              value={String(form.nbJours)}
              options={[
                { value: "1", label: "1 jour" },
                { value: "2", label: "2 jours" },
                { value: "3", label: "3 jours" },
              ]}
              onChange={(v) => patch(syncHeures(form, Number(v)))}
            />
          ) : (
            <p className="text-sm text-white/40">
              Formats 8, 12 et 16 équipes : 1 jour uniquement.
            </p>
          )}
        </div>

        <div>
          <label className="field-label">Style du dossier</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              active={form.styleTemplates === "Basic"}
              onClick={() => patch({ styleTemplates: "Basic" })}
              title="Basic"
              subtitle="Templates classiques"
              icon={<span className="text-lg">📄</span>}
            />
            <OptionCard
              active={form.styleTemplates === "Avancé"}
              onClick={() => patch({ styleTemplates: "Avancé" })}
              title="Avancé"
              subtitle="Templates bleus premium"
              icon={<span className="text-lg">✦</span>}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanningStep({
  form,
  patch,
}: {
  form: TournamentForm;
  patch: (p: Partial<TournamentForm>) => void;
}) {
  return (
    <section className="panel p-8">
      <StepHeader
        num="04"
        title="PLANNING"
        subtitle="Horaires, durée des matchs et configuration des terrains."
      />
      <div className="space-y-8">
        {form.heuresDebutJours.map((heure, i) => (
          <div key={i}>
            <label className="field-label" htmlFor={`heure-${i}`}>
              {form.nbJours === 1
                ? "Heure de début"
                : `Heure de début — jour ${i + 1}`}
            </label>
            <div className="flex items-center gap-3">
              <IconClock className="h-5 w-5 text-neon/50" />
              <input
                id={`heure-${i}`}
                className="text-input max-w-[140px]"
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

        <div>
          <label className="field-label">
            Durée d&apos;un match — {form.dureeMatch} min
          </label>
          <input
            type="range"
            min={20}
            max={90}
            step={5}
            value={form.dureeMatch}
            onChange={(e) => patch({ dureeMatch: Number(e.target.value) })}
            className="mt-2 w-full accent-neon"
          />
          <div className="mt-1 flex justify-between text-xs text-white/25">
            <span>20 min</span>
            <span>90 min</span>
          </div>
        </div>

        <div>
          <label className="field-label">Nombre de terrains</label>
          <NumberStepper
            value={form.nbTerrains}
            min={1}
            max={8}
            onChange={(nb) => patch(syncTerrains(form, nb))}
          />
        </div>

        <div className="space-y-3">
          <label className="field-label">Noms des terrains</label>
          {form.terrains.map((nom, i) => (
            <input
              key={i}
              className="text-input"
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

        <div>
          <label className="field-label" htmlFor="terrain-principal">
            Terrain principal — finale
          </label>
          <select
            id="terrain-principal"
            className="text-input"
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
    </section>
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
  const rows = [
    ["Club / Logo", form.pasDeLogo ? form.club : form.logoFile?.name ?? "—"],
    ["Date", formatDateFr(form.dateTournoi)],
    ["Type", `${form.typeTournoi} ${form.genreTournoi}`],
    ["Équipes", preview ? String(preview.nb_equipes) : "—"],
    ["Format", form.modeTournoi],
    ["Jours", String(form.nbJours)],
    ["Terrains", String(form.nbTerrains)],
    ["Style", form.styleTemplates],
  ];

  return (
    <section className="panel p-8">
      <StepHeader
        num="05"
        title="GÉNÉRATION"
        subtitle="Vérifiez le récapitulatif et lancez la production du PDF."
      />

      <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={[
              "flex items-center justify-between gap-4 px-5 py-3.5",
              i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
              i < rows.length - 1 ? "border-b border-white/[0.04]" : "",
            ].join(" ")}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-white/35">
              {label}
            </span>
            <span className="text-right text-sm font-medium text-white/80">
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
    </section>
  );
}

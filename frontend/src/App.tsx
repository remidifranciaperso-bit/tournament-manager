import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { generateTournament, previewExcel } from "./api";
import { FileDrop } from "./components/FileDrop";
import { PadelBall } from "./components/PadelBall";
import { Stepper } from "./components/Stepper";
import {
  GhostButton,
  NumberStepper,
  OptionCard,
  PrimaryButton,
  Segmented,
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
  { key: "import", label: "Import" },
  { key: "identity", label: "Identité" },
  { key: "format", label: "Format" },
  { key: "planning", label: "Planning" },
  { key: "generate", label: "Génération" },
];

function formatDateFr(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function syncTerrains(form: TournamentForm, nb: number): TournamentForm {
  const terrains = [...form.terrains];
  while (terrains.length < nb) {
    terrains.push(`Terrain ${terrains.length + 1}`);
  }
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
          if (result.nb_equipes < 20) {
            next = syncHeures(next, 1);
          }
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
        if (previewError) return false;
        if (!preview?.supporte) return false;
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
        particleCount: 120,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#14a196", "#d7f24e", "#ffffff"],
      });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  return (
    <div className="court-lines flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <PadelBall size={36} />
            <div>
              <div className="font-display text-lg font-bold text-deep-900">
                Padel Tournament Manager
              </div>
              <div className="text-xs text-deep-800/50">
                Générateur de dossier tournoi
              </div>
            </div>
          </div>
          {step > 0 && (
            <span className="rounded-full bg-court-100 px-3 py-1 text-xs font-semibold text-court-700">
              Étape {step}/{STEPS.length - 1}
            </span>
          )}
        </div>
        {step > 0 && (
          <div className="border-t border-white/40 px-4 pb-5 pt-3 sm:px-6">
            <Stepper
              steps={STEPS.slice(1)}
              current={step - 1}
              onGo={(i) => i < step && setStep(i + 1)}
            />
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {step === 0 && <WelcomeStep onStart={() => setStep(1)} />}

            {step === 1 && (
              <ImportStep
                form={form}
                patch={patch}
                preview={preview}
                previewLoading={previewLoading}
                previewError={previewError}
              />
            )}

            {step === 2 && (
              <IdentityStep form={form} patch={patch} />
            )}

            {step === 3 && (
              <FormatStep
                form={form}
                patch={patch}
                nbEquipes={nbEquipes}
                poulesDisponibles={poulesDisponibles}
                multiJoursDisponible={multiJoursDisponible}
              />
            )}

            {step === 4 && (
              <PlanningStep form={form} patch={patch} />
            )}

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

      {step > 0 && (
        <footer className="sticky bottom-0 border-t border-white/50 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            {step > 1 ? (
              <GhostButton onClick={goBack}>Retour</GhostButton>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 ? (
              <PrimaryButton onClick={goNext} disabled={!stepValid}>
                Suivant
              </PrimaryButton>
            ) : (
              <div />
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

function poulesDisponibleFrom(nb: number) {
  return nb === 20 || nb === 24;
}

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex flex-col items-center text-center">
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="mb-8"
      >
        <PadelBall size={80} />
      </motion.div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-deep-900 sm:text-5xl">
        Créez votre dossier
        <span className="block bg-gradient-to-r from-court-500 to-court-700 bg-clip-text text-transparent">
          tournoi padel
        </span>
      </h1>
      <p className="mt-4 max-w-lg text-deep-800/70">
        Importez votre fichier Excel, configurez le tournoi en quelques étapes
        et téléchargez un PDF professionnel prêt à imprimer.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-deep-800/60">
        {["Participants", "Tableaux", "Convocations", "Planning", "Classement"].map(
          (label) => (
            <span
              key={label}
              className="rounded-full border border-court-200 bg-white/60 px-3 py-1 font-medium"
            >
              {label}
            </span>
          )
        )}
      </div>
      <div className="mt-10">
        <PrimaryButton onClick={onStart}>
          Créer mon tournoi
        </PrimaryButton>
      </div>
    </section>
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
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-deep-900">
        Import des fichiers
      </h2>
      <p className="mt-1 text-sm text-deep-800/60">
        Chargez la liste des participants et le logo de votre club.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="field-label">Fichier Excel des participants</label>
          <FileDrop
            accept=".xlsx"
            file={form.excelFile}
            onFile={(f) => patch({ excelFile: f })}
            title="Glissez votre fichier .xlsx ici"
            hint="ou cliquez pour parcourir"
            icon="📊"
          />
          {previewLoading && (
            <p className="mt-2 text-sm text-court-600">Analyse en cours…</p>
          )}
          {previewError && (
            <p className="mt-2 text-sm text-red-600">{previewError}</p>
          )}
          {preview && !previewLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <span className="rounded-full bg-court-500 px-3 py-1 text-sm font-semibold text-white">
                {preview.nb_equipes} équipes détectées
              </span>
              {!preview.supporte && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                  Format non supporté — formats disponibles :{" "}
                  {FORMATS_SUPPORTES.join(", ")}
                </span>
              )}
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Toggle
            checked={form.pasDeLogo}
            onChange={(v) => patch({ pasDeLogo: v })}
            label="Pas de logo à importer"
          />
        </div>

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
              placeholder="Nom du club"
            />
          </div>
        ) : (
          <div>
            <label className="field-label">Logo du club</label>
            <FileDrop
              accept=".png,.jpg,.jpeg"
              file={form.logoFile}
              onFile={(f) => patch({ logoFile: f })}
              title="Glissez votre logo ici"
              hint="PNG ou JPG"
              icon="🏟️"
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
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-deep-900">
        Identité du tournoi
      </h2>
      <p className="mt-1 text-sm text-deep-800/60">
        Date, catégorie et niveau du tournoi.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="field-label" htmlFor="date">
            Date du tournoi
          </label>
          <input
            id="date"
            type="date"
            className="text-input"
            value={form.dateTournoi}
            onChange={(e) => patch({ dateTournoi: e.target.value })}
          />
        </div>

        <div>
          <label className="field-label">Type de tournoi</label>
          <div className="flex flex-wrap gap-2">
            {TYPES_TOURNOI.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => patch({ typeTournoi: t })}
                className={[
                  "rounded-2xl px-4 py-2 font-display text-sm font-bold transition",
                  form.typeTournoi === t
                    ? "bg-gradient-to-r from-court-500 to-court-600 text-white shadow-glow"
                    : "border border-court-100 bg-white/70 text-deep-800/70 hover:border-court-300",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Catégorie</label>
          <Segmented
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
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-deep-900">
        Format sportif
      </h2>
      <p className="mt-1 text-sm text-deep-800/60">
        {nbEquipes > 0
          ? `${nbEquipes} équipes — choisissez le déroulement.`
          : "Choisissez le déroulement du tournoi."}
      </p>

      <div className="mt-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            active={form.modeTournoi === "Élimination directe"}
            onClick={() => patch({ modeTournoi: "Élimination directe" })}
            title="Élimination directe"
            subtitle="Tableau classique"
            icon="🏆"
          />
          <OptionCard
            active={form.modeTournoi === "Poules + tableau final"}
            onClick={() =>
              patch({ modeTournoi: "Poules + tableau final" })
            }
            title="Poules + tableau final"
            subtitle="Disponible pour 20 et 24 équipes"
            icon="📋"
            disabled={!poulesDisponibles}
          />
        </div>

        {form.modeTournoi === "Poules + tableau final" && (
          <div>
            <label className="field-label">Constitution des poules</label>
            <Segmented
              value={form.methodePoules}
              options={[
                {
                  value: "Méthode du serpentin",
                  label: "Serpentin",
                },
                {
                  value: "Tirage au sort par rang",
                  label: "Tirage au sort",
                },
              ]}
              onChange={(v) => patch({ methodePoules: v })}
            />
          </div>
        )}

        <div>
          <label className="field-label">Nombre de jours</label>
          {multiJoursDisponible ? (
            <Segmented
              value={String(form.nbJours) as "1" | "2" | "3"}
              options={[
                { value: "1", label: "1 jour" },
                { value: "2", label: "2 jours" },
                { value: "3", label: "3 jours" },
              ]}
              onChange={(v) =>
                patch(syncHeures(form, Number(v)))
              }
            />
          ) : (
            <p className="text-sm text-deep-800/60">
              Formats 8, 12 et 16 équipes : tournoi sur 1 jour uniquement.
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
              icon="📄"
            />
            <OptionCard
              active={form.styleTemplates === "Avancé"}
              onClick={() => patch({ styleTemplates: "Avancé" })}
              title="Avancé"
              subtitle="Templates bleus premium"
              icon="✨"
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
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-deep-900">
        Planning & terrains
      </h2>
      <p className="mt-1 text-sm text-deep-800/60">
        Horaires, durée des matchs et configuration des terrains.
      </p>

      <div className="mt-6 space-y-6">
        {form.heuresDebutJours.map((heure, i) => (
          <div key={i}>
            <label className="field-label" htmlFor={`heure-${i}`}>
              {form.nbJours === 1
                ? "Heure de début"
                : `Heure de début — jour ${i + 1}`}
            </label>
            <input
              id={`heure-${i}`}
              className="text-input max-w-xs"
              value={heure}
              onChange={(e) => {
                const heures = [...form.heuresDebutJours];
                heures[i] = e.target.value;
                patch({ heuresDebutJours: heures });
              }}
              placeholder="18:00"
            />
          </div>
        ))}

        <div>
          <label className="field-label">
            Durée prévisionnelle d&apos;un match : {form.dureeMatch} min
          </label>
          <input
            type="range"
            min={20}
            max={90}
            step={5}
            value={form.dureeMatch}
            onChange={(e) =>
              patch({ dureeMatch: Number(e.target.value) })
            }
            className="mt-2 w-full accent-court-500"
          />
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
            Terrain principal pour la finale
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
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-deep-900">
        Récapitulatif & génération
      </h2>
      <p className="mt-1 text-sm text-deep-800/60">
        Vérifiez les paramètres puis lancez la génération du PDF.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-court-100">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-court-50 last:border-0">
                <td className="bg-court-50/50 px-4 py-2.5 font-semibold text-deep-800/70">
                  {label}
                </td>
                <td className="px-4 py-2.5 text-deep-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        {generating ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <PadelBall size={56} spinning />
            <p className="font-medium text-court-700">
              Génération du dossier en cours…
            </p>
            <p className="text-sm text-deep-800/50">
              Tableaux, convocations et planning
            </p>
          </div>
        ) : (
          <PrimaryButton onClick={onGenerate} disabled={generating}>
            Générer le tournoi
          </PrimaryButton>
        )}

        {genError && (
          <p className="text-center text-sm text-red-600">{genError}</p>
        )}
      </div>

      {pdfUrl && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-court-700">
              PDF généré avec succès
            </p>
            <a
              href={pdfUrl}
              download={pdfFilename}
              className="inline-flex items-center gap-2 rounded-2xl bg-ball-400 px-5 py-2.5 text-sm font-bold text-deep-900 shadow-glass transition hover:bg-ball-300"
            >
              Télécharger le PDF
            </a>
          </div>
          <iframe
            title="Aperçu PDF"
            src={pdfUrl}
            className="h-[480px] w-full rounded-2xl border border-court-100 bg-white shadow-glass"
          />
        </motion.div>
      )}
    </section>
  );
}

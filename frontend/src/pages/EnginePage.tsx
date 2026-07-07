import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { generateTournament, previewExcel, notifyOwnerAfterDownload, buildTournamentResume } from "../api";
import { CourtBackground } from "../components/CourtBackground";
import { PadelBall } from "../components/PadelBall";
import { RacketProgress } from "../components/RacketProgress";
import { Stepper, StepperMobile } from "../components/Stepper";
import { GhostButton, PrimaryButton } from "../components/ui";
import { defaultForm, type PreviewResult, type TournamentForm } from "../types";
import { poulesDisponibleFrom, syncHeures } from "../wizard/helpers";
import {
  ClubStep,
  EngineWelcomeStep,
  FormatStep,
  GenerationStep,
  IdentityStep,
  ParticipantsStep,
  PlanningStep,
  SummaryStep,
  TerrainsStep,
} from "../wizard/steps";

const ENGINE_BUILD = "2026-07-07a";

const STEPS = [
  { key: "welcome", label: "Accueil" },
  { key: "participants", label: "Participants" },
  { key: "club", label: "Club" },
  { key: "identity", label: "Paramètres" },
  { key: "format", label: "Format" },
  { key: "planning", label: "Planning" },
  { key: "terrains", label: "Terrains" },
  { key: "summary", label: "Résumé" },
  { key: "generate", label: "Génération" },
];

const WIZARD_STEPS = STEPS.slice(1);

export default function EnginePage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TournamentForm>(defaultForm);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("tournoi.pdf");
  const notifyTokenRef = useRef<string | null>(null);
  const genStartedRef = useRef(false);

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
      case 8:
        return true;
      default:
        return false;
    }
  }, [step, form, preview, previewLoading, previewError]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const goHome = () => setStep(0);

  const handleValidateSummary = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setGenError(null);
    genStartedRef.current = false;
    setStep(8);
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    try {
      const { blob, filename, notifyToken } = await generateTournament(form);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(filename);
      notifyTokenRef.current = notifyToken;
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  }, [form, pdfUrl]);

  useEffect(() => {
    if (step !== 8) {
      genStartedRef.current = false;
      return;
    }
    if (genStartedRef.current || generating) return;
    genStartedRef.current = true;
    handleGenerate();
  }, [step, generating, handleGenerate]);

  const handleDownloadNotify = useCallback(() => {
    const token = notifyTokenRef.current;
    if (!token) return;
    notifyOwnerAfterDownload(
      token,
      buildTournamentResume(form, preview, pdfFilename)
    );
    notifyTokenRef.current = null;
  }, [form, preview, pdfFilename]);

  const slideVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  if (step === 0) {
    return (
      <div className="relative flex min-h-full w-full flex-col overflow-x-hidden">
        <CourtBackground />
        <EngineWelcomeStep onStart={() => setStep(1)} />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh overflow-hidden">
      <CourtBackground />

      {/* Sidebar desktop */}
      <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-arena-900/50 p-6 backdrop-blur-xl lg:flex">
        <div className="mb-8 shrink-0 text-center">
          <h2
            className="font-brush text-[clamp(1.35rem,4.5vw,2rem)] leading-[1.05] text-lime"
            style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
          >
            Padel Tournament Engine
          </h2>
          <button
            type="button"
            onClick={goHome}
            className="mx-auto my-4 flex justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/50"
            aria-label="Retour à l'accueil"
          >
            <PadelBall size={40} realistic />
          </button>
          <p className="text-sm font-medium text-white/55">
            Génération tournoi
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-white/25">
            build {ENGINE_BUILD}
          </p>
        </div>
        <Stepper
          steps={WIZARD_STEPS}
          current={step - 1}
          onGo={(i) => i < step - 1 && setStep(i + 1)}
          className="min-h-0 flex-1 overflow-y-auto"
        />
        <div className="shrink-0 pt-3">
          <div className="overflow-visible rounded-xl border border-lime/15 bg-lime/[0.04] px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 flex-col justify-center">
                <div className="text-sm font-medium text-lime">
                  Progression
                </div>
                <div className="mt-2 font-display text-3xl leading-none text-lime">
                  {step}/{WIZARD_STEPS.length}
                </div>
              </div>
              <div className="flex min-h-[4rem] min-w-0 flex-1 items-center justify-center overflow-visible">
                <RacketProgress step={step} total={WIZARD_STEPS.length} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header mobile */}
        <header className="border-b border-white/[0.06] bg-arena-900/40 px-4 py-4 backdrop-blur-xl lg:hidden">
          <StepperMobile steps={WIZARD_STEPS} current={step - 1} />
        </header>

        <main
          className={`mx-auto w-full max-w-2xl flex-1 px-4 sm:px-8 ${
            step === 7
              ? "flex flex-col justify-center overflow-hidden py-4 sm:py-6"
              : "overflow-y-auto py-8 sm:py-10"
          }`}
        >
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
                <SummaryStep form={form} preview={preview} />
              )}
              {step === 8 && (
                <GenerationStep
                  generating={generating}
                  genError={genError}
                  pdfUrl={pdfUrl}
                  pdfFilename={pdfFilename}
                  genreTournoi={form.genreTournoi}
                  onDownload={handleDownloadNotify}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="sticky bottom-0 px-4 py-4 sm:px-8">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            {step > 1 ? (
              <GhostButton onClick={goBack}>← Retour</GhostButton>
            ) : (
              <div />
            )}
            {step < STEPS.length - 1 &&
            step !== 1 &&
            step !== 7 &&
            step !== 8 &&
            (step !== 2 || stepValid) ? (
              <PrimaryButton onClick={goNext} disabled={!stepValid}>
                Continuer →
              </PrimaryButton>
            ) : step === 7 ? (
              <PrimaryButton onClick={handleValidateSummary}>Valider</PrimaryButton>
            ) : (
              <div />
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}


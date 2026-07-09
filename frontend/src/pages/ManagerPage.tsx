import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { previewExcel, generateLiveTournament } from "../api";
import { CourtBackground } from "../components/CourtBackground";
import { PadelBall } from "../components/PadelBall";
import { RacketProgress } from "../components/RacketProgress";
import { Stepper, StepperMobile } from "../components/Stepper";
import { GhostButton, PrimaryButton } from "../components/ui";
import { LiveTournamentView } from "../manager/LiveTournamentView";
import type { LiveTournamentData } from "../manager/liveTypes";
import { ManagerLiveGenerationStep } from "../manager/ManagerLiveGenerationStep";
import { ManagerStartStep } from "../manager/ManagerStartStep";
import { defaultForm, type PreviewResult, type TournamentForm } from "../types";
import { MANAGER_WIZARD_STEPS } from "../wizard/constants";
import { poulesDisponibleFrom, syncHeures } from "../wizard/helpers";
import { matchFormatsStepValid } from "../manager/matchFormats";
import {
  ClubStep,
  FormatStep,
  IdentityStep,
  ManagerWelcomeStep,
  ParticipantsStep,
  PlanningStep,
  SummaryStep,
  TerrainsStep,
} from "../wizard/steps";

const MANAGER_BUILD = "manager-preview-14";

/** 0 accueil · 1 mode · 2-8 paramètres · 9 génération live */
const STEP_PARTICIPANTS = 2;
const STEP_GENERATE = 9;

export default function ManagerPage() {
  const [phase, setPhase] = useState<"setup" | "live">("setup");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TournamentForm>(defaultForm);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [liveReady, setLiveReady] = useState(false);
  const [liveData, setLiveData] = useState<LiveTournamentData | null>(null);
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

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
      case 1:
        return true;
      case 2:
        if (!form.excelFile || previewLoading) return false;
        return !previewError && !!preview?.supporte;
      case 3:
        return (
          form.club.trim() !== "" &&
          (form.pasDeLogo || form.logoFile !== null)
        );
      case 4:
        return form.dateTournoi !== "";
      case 5:
        return matchFormatsStepValid(form);
      case 6:
        return form.heuresDebutJours.every((h) => h.trim() !== "");
      case 7:
        return (
          form.terrains.length > 0 &&
          form.terrains.every((t) => t.trim() !== "")
        );
      case 8:
      case 9:
        return true;
      default:
        return false;
    }
  }, [step, form, preview, previewLoading, previewError]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_GENERATE));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const goHome = () => setStep(0);

  const handleValidateSummary = () => {
    setGenError(null);
    setLiveReady(false);
    setLiveData(null);
    genStartedRef.current = false;
    setStep(STEP_GENERATE);
  };

  const handleGenerateLive = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    setLiveReady(false);
    setLiveData(null);
    try {
      const data = await generateLiveTournament(form);
      setLiveData(data);
      setLiveReady(true);
    } catch (err) {
      setGenError(
        err instanceof Error
          ? err.message
          : "Impossible de préparer le tournoi live."
      );
    } finally {
      setGenerating(false);
    }
  }, [form]);

  useEffect(() => {
    if (step !== STEP_GENERATE) {
      genStartedRef.current = false;
      return;
    }
    if (genStartedRef.current || generating) return;
    genStartedRef.current = true;
    void handleGenerateLive();
  }, [step, generating, handleGenerateLive]);

  const slideVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  const wizardIndex = step - STEP_PARTICIPANTS;
  const inWizard = step >= STEP_PARTICIPANTS && step <= STEP_GENERATE;

  if (phase === "live" && liveData) {
    return (
      <LiveTournamentView
        form={form}
        nbEquipes={preview?.nb_equipes ?? liveData.meta.nb_equipes}
        liveData={liveData}
      />
    );
  }

  if (step === 0) {
    return (
      <div className="relative flex h-dvh w-full flex-col overflow-hidden">
        <CourtBackground />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <ManagerWelcomeStep onStart={() => setStep(1)} />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="relative flex h-dvh w-full flex-col overflow-hidden">
        <CourtBackground />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <ManagerStartStep onExcelStart={() => setStep(STEP_PARTICIPANTS)} />
        </div>
        <div className="absolute bottom-6 left-6 z-20">
          <GhostButton onClick={goBack}>← Retour</GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh overflow-hidden">
      <CourtBackground />

      <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-arena-900/50 p-6 backdrop-blur-xl lg:flex">
        <div className="mb-8 shrink-0 text-center">
          <h2
            className="font-brush text-[clamp(1.35rem,4.5vw,2rem)] leading-[1.05] text-lime"
            style={{ textShadow: "0 0 24px rgba(212,255,74,0.12)" }}
          >
            Padel Tournament Manager
          </h2>
          <button
            type="button"
            onClick={goHome}
            className="mx-auto my-4 flex justify-center rounded-full transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/50"
            aria-label="Retour à l'accueil"
          >
            <PadelBall size={40} realistic />
          </button>
          <p className="text-sm font-medium text-white/55">Tournoi live</p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-white/25">
            build {MANAGER_BUILD}
          </p>
        </div>
        <Stepper
          steps={MANAGER_WIZARD_STEPS}
          current={Math.max(0, wizardIndex)}
          onGo={(i) => i < wizardIndex && setStep(i + STEP_PARTICIPANTS)}
          className="min-h-0 flex-1 overflow-hidden"
        />
        <div className="shrink-0 pt-3">
          <div className="overflow-hidden rounded-xl border border-lime/15 bg-lime/[0.04] px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 flex-col justify-center">
                <div className="text-sm font-medium text-lime">Progression</div>
                <div className="mt-2 font-display text-3xl leading-none text-lime">
                  {Math.max(1, wizardIndex + 1)}/{MANAGER_WIZARD_STEPS.length}
                </div>
              </div>
              <div className="flex min-h-[4rem] min-w-0 flex-1 items-center justify-center overflow-hidden">
                <RacketProgress
                  step={Math.max(1, wizardIndex + 1)}
                  total={MANAGER_WIZARD_STEPS.length}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-white/[0.06] bg-arena-900/40 px-4 py-4 backdrop-blur-xl lg:hidden">
          <StepperMobile
            steps={MANAGER_WIZARD_STEPS}
            current={Math.max(0, wizardIndex)}
          />
        </header>

        <main
          className={`mx-auto w-full flex-1 px-4 sm:px-8 ${
            step === 8
              ? "flex max-w-2xl flex-col justify-center overflow-hidden py-4 sm:py-6"
              : step === 5
                ? "flex max-w-6xl min-h-0 flex-col overflow-hidden py-4 sm:py-5"
                : "max-w-2xl overflow-hidden py-8 sm:py-10"
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
              className="flex h-full min-h-0 flex-col overflow-hidden"
            >
              {step === 2 && (
                <ParticipantsStep
                  form={form}
                  patch={patch}
                  preview={preview}
                  previewLoading={previewLoading}
                  previewError={previewError}
                  onValidate={goNext}
                />
              )}
              {step === 3 && <ClubStep form={form} patch={patch} />}
              {step === 4 && <IdentityStep form={form} patch={patch} />}
              {step === 5 && (
                <FormatStep
                  form={form}
                  patch={patch}
                  nbEquipes={nbEquipes}
                  poulesDisponibles={poulesDisponibles}
                  multiJoursDisponible={multiJoursDisponible}
                  showMatchFormats
                />
              )}
              {step === 6 && <PlanningStep form={form} patch={patch} />}
              {step === 7 && <TerrainsStep form={form} patch={patch} />}
              {step === 8 && (
                <SummaryStep form={form} preview={preview} showMatchFormats />
              )}
              {step === 9 && (
                <ManagerLiveGenerationStep
                  generating={generating}
                  genError={genError}
                  ready={liveReady}
                  genreTournoi={form.genreTournoi}
                  onAccessLive={() => {
                    if (liveData) setPhase("live");
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {inWizard && step !== STEP_GENERATE && (
          <footer className="shrink-0 px-4 py-4 sm:px-8">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
              {step > STEP_PARTICIPANTS ? (
                <GhostButton onClick={goBack}>← Retour</GhostButton>
              ) : (
                <div />
              )}
              {step < 8 && step !== 2 && (step !== 3 || stepValid) ? (
                <PrimaryButton onClick={goNext} disabled={!stepValid}>
                  Continuer →
                </PrimaryButton>
              ) : step === 8 ? (
                <PrimaryButton onClick={handleValidateSummary}>
                  Générer le tournoi live
                </PrimaryButton>
              ) : (
                <div />
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

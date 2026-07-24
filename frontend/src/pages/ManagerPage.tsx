import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  applyFormFormatsToLiveData,
  hydrateFormFromPackMeta,
  matchFormatsStepValid,
  packHasPoules,
  packMatchFormatsComplete,
} from "../manager/matchFormats";
import { ManagerMatchFormatsStep } from "../manager/ManagerMatchFormatsStep";
import { ManagerLiveResumeDialog } from "../manager/ManagerLiveResumeDialog";
import { HUB_CHOOSE_SEARCH } from "./HubPage";
import {
  buildResumeSummary,
  clearLiveSession,
  loadLiveSession,
  saveLiveSession,
  snapshotToForm,
  type StoredLiveSession,
} from "../manager/liveSessionStore";
import {
  ClubStep,
  FormatStep,
  IdentityStep,
  ParticipantsStep,
  PlanningStep,
  SummaryStep,
  TerrainsStep,
} from "../wizard/steps";

const STEP_ENTRY = 1;
const STEP_PARTICIPANTS = 2;
const STEP_GENERATE = 9;
const STEP_PACK_FORMAT = 11;

export default function ManagerPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"setup" | "live">("setup");
  const [step, setStep] = useState(STEP_ENTRY);
  const [form, setForm] = useState<TournamentForm>(defaultForm);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [liveReady, setLiveReady] = useState(false);
  const [liveData, setLiveData] = useState<LiveTournamentData | null>(null);
  const [pendingPackLiveData, setPendingPackLiveData] =
    useState<LiveTournamentData | null>(null);
  const [packHasPoulesFormat, setPackHasPoulesFormat] = useState(false);
  const [resumeSession, setResumeSession] = useState<StoredLiveSession | null>(
    null
  );
  const [resumeChecked, setResumeChecked] = useState(false);
  const genStartedRef = useRef(false);

  useEffect(() => {
    setResumeSession(loadLiveSession());
    setResumeChecked(true);
  }, []);

  const enterLivePhase = useCallback(
    (data: LiveTournamentData, formState: TournamentForm, equipes: number) => {
      saveLiveSession(data, formState, equipes);
      setLiveData(data);
      setResumeSession(null);
      setPhase("live");
    },
    []
  );

  const handleResumeSession = useCallback(async () => {
    if (!resumeSession) return;
    const token = resumeSession.liveData.live_token;
    try {
      const res = await fetch(`/api/live/${token}/status`);
      if (!res.ok) {
        clearLiveSession(token);
        setResumeSession(null);
        setGenError(
          "Session live expirée ou introuvable sur le serveur. Relancez un tournoi."
        );
        return;
      }
    } catch {
      setGenError("Impossible de joindre le serveur live.");
      return;
    }
    setForm(snapshotToForm(resumeSession.form));
    setLiveData(resumeSession.liveData);
    setResumeSession(null);
    setPhase("live");
  }, [resumeSession]);

  const handleDiscardSession = useCallback(() => {
    if (resumeSession) {
      clearLiveSession(resumeSession.liveData.live_token);
    }
    setResumeSession(null);
  }, [resumeSession]);

  const handlePdfExported = useCallback(() => {
    if (liveData) clearLiveSession(liveData.live_token);
    setResumeSession(null);
  }, [liveData]);

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
      case STEP_ENTRY:
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
  const goBack = () => {
    if (step === STEP_PACK_FORMAT) {
      setPendingPackLiveData(null);
      setPackHasPoulesFormat(false);
      setStep(STEP_ENTRY);
      return;
    }
    if (step === STEP_ENTRY) {
      navigate(`/?${HUB_CHOOSE_SEARCH}`);
      return;
    }
    setStep((s) => Math.max(s - 1, STEP_ENTRY));
  };

  const handlePackFormatContinue = () => {
    if (!pendingPackLiveData || !matchFormatsStepValid(form)) return;
    setGenError(null);
    try {
      const data = applyFormFormatsToLiveData(pendingPackLiveData, form);
      setPendingPackLiveData(null);
      setPackHasPoulesFormat(false);
      enterLivePhase(data, form, data.meta.nb_equipes);
    } catch (err) {
      setGenError(
        err instanceof Error
          ? err.message
          : "Impossible d'ouvrir le tournoi live."
      );
      setStep(STEP_PACK_FORMAT);
    }
  };
  const goHome = () => setStep(STEP_ENTRY);

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
        onPdfExported={handlePdfExported}
      />
    );
  }

  if (resumeChecked && resumeSession) {
    return (
      <ManagerLiveResumeDialog
        summary={buildResumeSummary(resumeSession)}
        onResume={handleResumeSession}
        onDiscard={handleDiscardSession}
      />
    );
  }

  if (step === STEP_ENTRY) {
    return (
      <div className="relative flex h-dvh w-full flex-col overflow-hidden">
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <ManagerStartStep
            onPackConfirmed={(data) => {
              const hasPoules = packHasPoules(data);
              const partial = hydrateFormFromPackMeta(data.meta, hasPoules);
              setForm((prev) => {
                const next = { ...prev, ...partial };
                if (packMatchFormatsComplete(data.meta, hasPoules)) {
                  const live = applyFormFormatsToLiveData(data, next);
                  queueMicrotask(() =>
                    enterLivePhase(live, next, data.meta.nb_equipes)
                  );
                }
                return next;
              });
              if (!packMatchFormatsComplete(data.meta, hasPoules)) {
                setPendingPackLiveData(data);
                setPackHasPoulesFormat(hasPoules);
                setStep(STEP_PACK_FORMAT);
              }
            }}
            onExcelFile={(file) => {
              setForm((prev) => ({ ...prev, excelFile: file }));
              setStep(STEP_PARTICIPANTS);
            }}
          />
        </div>
        <div className="absolute bottom-[clamp(4.5rem,9.5vh,6.25rem)] left-6 z-20">
          <GhostButton onClick={goBack}>← Retour</GhostButton>
        </div>
      </div>
    );
  }

  if (step === STEP_PACK_FORMAT && pendingPackLiveData) {
    return (
      <div className="relative flex h-dvh overflow-hidden">
        <CourtBackground />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <main className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-8 sm:py-5">
            <ManagerMatchFormatsStep
              form={form}
              patch={patch}
              club={pendingPackLiveData.meta.club}
              nbEquipes={pendingPackLiveData.meta.nb_equipes}
              showPoules={packHasPoulesFormat}
            />
          </main>

          <footer className="shrink-0 px-4 py-4 sm:px-8">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
              {genError ? (
                <p role="alert" className="text-center text-sm text-red-400">
                  {genError}
                </p>
              ) : null}
              <div className="flex w-full items-center justify-between gap-4">
              <GhostButton onClick={goBack}>← Retour</GhostButton>
              <PrimaryButton
                onClick={handlePackFormatContinue}
                disabled={!matchFormatsStepValid(form)}
              >
                Accéder au tournoi live →
              </PrimaryButton>
              </div>
            </div>
          </footer>
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
                    if (liveData) {
                      enterLivePhase(
                        liveData,
                        form,
                        preview?.nb_equipes ?? liveData.meta.nb_equipes
                      );
                    }
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

import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  generateTournamentV2,
  previewExcel,
  notifyOwnerAfterDownload,
  buildTournamentResume,
  downloadManagerLiveBundle,
  type EngineV2GeneratePhase,
  type EngineV2PrepareResult,
} from "../api";
import { captureManagerExportPages } from "../manager/captureExportPages";
import type { ExportCaptureTarget } from "../manager/exportCapture";
import { CourtBackground } from "../components/CourtBackground";
import { EngineV2ExportCapture } from "./EngineV2ExportCapture";
import { PadelBall } from "../components/PadelBall";
import { RacketProgress } from "../components/RacketProgress";
import { Stepper, StepperMobile } from "../components/Stepper";
import { GhostButton, PrimaryButton } from "../components/ui";
import { defaultForm, type PreviewResult, type TournamentForm } from "../types";
import { poulesDisponibleFrom, syncHeures, normalizeUppercaseFields } from "../wizard/helpers";
import { isPlatformBuild } from "../platform/engineV2ApiBase";
import {
  platformCreateTournament,
  platformFetchClubLogoFile,
  platformFetchMe,
} from "../platform/api";
import { buildPlatformLiveSnapshot } from "../platform/liveSnapshot";
import { PlatformGenerationSuccess } from "../platform/PlatformGenerationSuccess";
import {
  ClubStep,
  FormatStep,
  GenerationStep,
  IdentityStep,
  ParticipantsStep,
  PlanningStep,
  SummaryStep,
  TerrainsStep,
} from "../wizard/steps";

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
const PLATFORM_WIZARD_STEPS = WIZARD_STEPS.filter(
  (step) => step.key !== "club" && step.key !== "terrains"
);
const PLATFORM_NEXT: Record<number, number> = {
  1: 3,
  3: 4,
  4: 5,
  5: 7,
  7: 8,
  8: 8,
};
const PLATFORM_PREV: Record<number, number> = {
  1: 1,
  3: 1,
  4: 3,
  5: 4,
  7: 5,
  8: 7,
};
const PLATFORM_STEP_INDEX: Record<number, number> = {
  1: 0,
  3: 1,
  4: 2,
  5: 3,
  7: 4,
  8: 5,
};

/** 1 = Participants (accueil Engine supprimé, entrée directe depuis le Hub). */
const STEP_ENTRY = 1;
const ENGINE_V2_PARTICIPANTS_PATH = "/engine-v2/participants";

const GENERATE_PHASE_LABELS: Record<EngineV2GeneratePhase, string> = {
  prepare: "Préparation du tournoi…",
  capture: "Capture visuelle Live (tableaux, connecteurs)…",
  export: "Assemblage du PDF final…",
};

function formatPlatformDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function EngineV2Page() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(STEP_ENTRY);
  const [form, setForm] = useState<TournamentForm>(defaultForm);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState<EngineV2GeneratePhase | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("tournoi.pdf");
  const [liveSnapshotAvailable, setLiveSnapshotAvailable] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [managerPackDownloaded, setManagerPackDownloaded] = useState(false);
  const [hasTelecharge, setHasTelecharge] = useState(false);
  const notifyTokenRef = useRef<string | null>(null);
  const notifySentRef = useRef(false);
  const genStartedRef = useRef(false);
  const [exportCaptureTarget, setExportCaptureTarget] =
    useState<ExportCaptureTarget | null>(null);
  const [prepareData, setPrepareData] = useState<EngineV2PrepareResult | null>(
    null
  );
  const prepareDataRef = useRef<EngineV2PrepareResult | null>(null);
  const [platformSaving, setPlatformSaving] = useState(false);
  const [platformSaveError, setPlatformSaveError] = useState<string | null>(null);
  const pendingPlatformSaveRef = useRef<{
    blob: Blob;
    filename: string;
    prepared: EngineV2PrepareResult;
    captures: Record<string, string>;
    crosspageStubs: Record<string, import("../manager/exportCapture").CrossPageStub>;
  } | null>(null);

  const activeWizardSteps = isPlatformBuild ? PLATFORM_WIZARD_STEPS : WIZARD_STEPS;
  const stepperIndex = isPlatformBuild ? (PLATFORM_STEP_INDEX[step] ?? 0) : step - 1;

  const captureExportPages = useCallback(
    (prepared: EngineV2PrepareResult) =>
      captureManagerExportPages(prepared.page_map, {
        showPage: (nextTarget) => {
          flushSync(() => {
            prepareDataRef.current = prepared;
            setPrepareData(prepared);
            setExportCaptureTarget(nextTarget);
          });
        },
        restore: () => {
          flushSync(() => {
            setExportCaptureTarget(null);
          });
        },
      }),
    []
  );

  const resetWizard = useCallback(() => {
    setStep(STEP_ENTRY);
    setForm(defaultForm);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setGenerating(false);
    setGenPhase(null);
    setGenError(null);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPdfFilename("tournoi.pdf");
    setLiveSnapshotAvailable(false);
    setPdfDownloaded(false);
    setManagerPackDownloaded(false);
    setHasTelecharge(false);
    setPrepareData(null);
    prepareDataRef.current = null;
    setExportCaptureTarget(null);
    notifyTokenRef.current = null;
    notifySentRef.current = false;
    genStartedRef.current = false;
  }, []);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    if (path === "/engine-v2") {
      navigate(ENGINE_V2_PARTICIPANTS_PATH, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const state = location.state as { fromHub?: boolean } | null;
    if (!state?.fromHub) return;
    resetWizard();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, resetWizard]);

  const nbEquipes = preview?.nb_equipes ?? 0;
  const poulesDisponibles = nbEquipes === 20 || nbEquipes === 24;
  const multiJoursDisponible = nbEquipes >= 20;

  const patch = useCallback((partial: Partial<TournamentForm>) => {
    setForm((prev) => ({ ...prev, ...normalizeUppercaseFields(partial) }));
  }, []);

  useEffect(() => {
    if (!isPlatformBuild) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await platformFetchMe();
        const profile = me.clubProfile;
        patch({
          club: profile.club,
          nbTerrains: profile.nbTerrains,
          terrains: [...profile.terrains],
          terrainPrincipal: profile.terrainPrincipal,
          pasDeLogo: !profile.hasLogo,
        });
        const logoFile = await platformFetchClubLogoFile(profile.logoPreviewUrl);
        if (logoFile && !cancelled) {
          patch({ logoFile, pasDeLogo: false });
        }
      } catch {
        /* profil indisponible */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patch]);

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

  const goNext = () =>
    setStep((s) => (isPlatformBuild ? PLATFORM_NEXT[s] ?? s : Math.min(s + 1, STEPS.length - 1)));
  const goBack = () =>
    setStep((s) => (isPlatformBuild ? PLATFORM_PREV[s] ?? s : Math.max(s - 1, STEP_ENTRY)));
  const goHome = () => navigate(isPlatformBuild ? "/" : "/");

  const savePlatformTournament = useCallback(
    async (pending: NonNullable<typeof pendingPlatformSaveRef.current>) => {
      const typeLabel = form.typeTournoi.toUpperCase();
      const formatLabel = `${typeLabel} · ${pending.prepared.nb_equipes} équipes`;
      await platformCreateTournament({
        name: pending.prepared.meta.club
          ? `${typeLabel} ${pending.prepared.meta.club}`
          : typeLabel,
        dateLabel: formatPlatformDateLabel(form.dateTournoi),
        formatLabel,
        teams: pending.prepared.nb_equipes,
        liveSnapshot: buildPlatformLiveSnapshot(pending.prepared, {
          captures: pending.captures,
          crosspageStubs: pending.crosspageStubs,
        }),
        pdf: pending.blob,
        pdfFilename: pending.filename,
      });
      setPlatformSaveError(null);
    },
    [form.dateTournoi, form.typeTournoi]
  );

  const retryPlatformSave = useCallback(async () => {
    const pending = pendingPlatformSaveRef.current;
    if (!pending) return;
    setPlatformSaving(true);
    setPlatformSaveError(null);
    try {
      await savePlatformTournament(pending);
    } catch (saveErr) {
      setPlatformSaveError(
        saveErr instanceof Error ? saveErr.message : "Enregistrement Platform impossible"
      );
    } finally {
      setPlatformSaving(false);
    }
  }, [savePlatformTournament]);

  const handleValidateSummary = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setGenError(null);
    setPdfDownloaded(false);
    setManagerPackDownloaded(false);
    setHasTelecharge(false);
    notifySentRef.current = false;
    genStartedRef.current = false;
    setStep(8);
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    setGenPhase("prepare");
    setPdfDownloaded(false);
    setManagerPackDownloaded(false);
    notifySentRef.current = false;
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setLiveSnapshotAvailable(false);
    setPrepareData(null);
    prepareDataRef.current = null;
    setExportCaptureTarget(null);
    try {
      const { blob, filename, notifyToken, liveSnapshotAvailable: snapshot, prepared, captures, crosspageStubs } =
        await generateTournamentV2(
          form,
          captureExportPages,
          setGenPhase,
          (ready) => {
            prepareDataRef.current = ready;
            flushSync(() => setPrepareData(ready));
          }
        );
      prepareDataRef.current = prepared;
      flushSync(() => setPrepareData(prepared));
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(filename);
      notifyTokenRef.current = notifyToken;
      setLiveSnapshotAvailable(snapshot);

      pendingPlatformSaveRef.current = {
        blob,
        filename,
        prepared,
        captures,
        crosspageStubs,
      };

      if (isPlatformBuild) {
        setPlatformSaving(true);
        setPlatformSaveError(null);
        try {
          await savePlatformTournament(pendingPlatformSaveRef.current);
        } catch (saveErr) {
          setPlatformSaveError(
            saveErr instanceof Error ? saveErr.message : "Enregistrement Platform impossible"
          );
        } finally {
          setPlatformSaving(false);
        }
      }

      notifySentRef.current = false;
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
      setGenPhase(null);
      setExportCaptureTarget(null);
    }
  }, [form, pdfUrl, captureExportPages, savePlatformTournament]);

  useEffect(() => {
    if (step !== 8) {
      genStartedRef.current = false;
      setHasTelecharge(false);
      return;
    }
    if (genStartedRef.current || generating) return;
    genStartedRef.current = true;
    handleGenerate();
  }, [step, generating, handleGenerate]);

  const envoyerNotificationUneFois = useCallback(() => {
    const token = notifyTokenRef.current;
    if (!token || notifySentRef.current) return;
    notifySentRef.current = true;
    notifyOwnerAfterDownload(
      token,
      buildTournamentResume(form, preview, pdfFilename)
    );
  }, [form, preview, pdfFilename]);

  const handleDownloadNotify = useCallback(() => {
    if (!notifyTokenRef.current) return;
    setPdfDownloaded(true);
    setHasTelecharge(true);
    envoyerNotificationUneFois();
  }, [envoyerNotificationUneFois]);

  const handleDownloadManagerLive = useCallback(async () => {
    const token = notifyTokenRef.current;
    if (!token) return;
    const base = pdfFilename.replace(/\.pdf$/i, "");
    try {
      await downloadManagerLiveBundle(token, `${base}-manager-live.zip`);
      setManagerPackDownloaded(true);
      setHasTelecharge(true);
      envoyerNotificationUneFois();
    } catch (err) {
      setGenError(
        err instanceof Error
          ? err.message
          : "Impossible de télécharger le pack Manager Live."
      );
    }
  }, [pdfFilename, envoyerNotificationUneFois]);

  const handleRegenerateSame = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

  useEffect(() => {
    if (step !== 8) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [step]);

  const slideVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

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
            {isPlatformBuild ? (
              <span className="text-sm font-semibold text-white/70 transition hover:text-lime">
                ← Retour
              </span>
            ) : (
              <PadelBall size={40} realistic />
            )}
          </button>
          <p className="text-sm font-medium text-white/55">
            Génération tournoi
          </p>
        </div>
        {!isPlatformBuild ? (
          <>
            <Stepper
              steps={activeWizardSteps}
              current={stepperIndex}
              onGo={(i) => {
                if (i < step - 1) setStep(i + 1);
              }}
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
                    <RacketProgress step={stepperIndex + 1} total={activeWizardSteps.length} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1" aria-hidden />
        )}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header mobile */}
        {!isPlatformBuild ? (
          <header className="border-b border-white/[0.06] bg-arena-900/40 px-4 py-4 backdrop-blur-xl lg:hidden">
            <StepperMobile steps={activeWizardSteps} current={stepperIndex} />
          </header>
        ) : null}

        <main
          className={`mx-auto w-full max-w-2xl min-h-0 flex-1 px-4 sm:px-8 ${
            step === 7
              ? "flex flex-col justify-center overflow-hidden py-4 sm:py-6"
              : step === 8
                ? "overflow-hidden py-8 sm:py-10"
                : "overflow-y-auto py-8 sm:py-10"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className={step === 8 ? "min-h-0 w-full overflow-hidden" : undefined}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 8 && isPlatformBuild ? (
                generating || platformSaving ? (
                  <GenerationStep
                    generating={generating || platformSaving}
                    generatingMessage={
                      platformSaving
                        ? "Enregistrement dans votre espace…"
                        : genPhase
                          ? GENERATE_PHASE_LABELS[genPhase]
                          : undefined
                    }
                    genError={genError}
                    pdfUrl={null}
                    pdfFilename={pdfFilename}
                    genreTournoi={form.genreTournoi}
                    hideDownloads
                    hideProgressChrome
                    onDownloadPdf={() => {}}
                  />
                ) : genError ? (
                  <GenerationStep
                    generating={false}
                    genError={genError}
                    pdfUrl={null}
                    pdfFilename={pdfFilename}
                    genreTournoi={form.genreTournoi}
                    hideDownloads
                    hideProgressChrome
                    hasTelecharge
                    onDownloadPdf={() => {}}
                    onRegenerateSame={handleRegenerateSame}
                  />
                ) : (
                  <PlatformGenerationSuccess
                    tournamentName={form.typeTournoi.toUpperCase()}
                    saving={false}
                    saveError={platformSaveError}
                    onRetrySave={
                      platformSaveError ? () => void retryPlatformSave() : undefined
                    }
                    onBackToTournaments={() => navigate("/")}
                  />
                )
              ) : step === 8 ? (
                <GenerationStep
                  generating={generating}
                  generatingMessage={
                    genPhase ? GENERATE_PHASE_LABELS[genPhase] : undefined
                  }
                  genError={genError}
                  pdfUrl={pdfUrl}
                  pdfFilename={pdfFilename}
                  genreTournoi={form.genreTournoi}
                  liveSnapshotAvailable={liveSnapshotAvailable}
                  pdfDownloaded={pdfDownloaded}
                  managerPackDownloaded={managerPackDownloaded}
                  hasTelecharge={hasTelecharge}
                  onDownloadPdf={handleDownloadNotify}
                  onDownloadManagerLive={handleDownloadManagerLive}
                  onRegenerateSame={handleRegenerateSame}
                />
              ) : null}
              {step !== 8 ? (
                <>
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
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>

        {prepareData
          ? createPortal(
              <EngineV2ExportCapture
                target={exportCaptureTarget}
                templateId={prepareData.template_id}
                pageMap={prepareData.page_map}
                matches={prepareData.matches}
                planningLayout={prepareData.planning_layout}
                meta={prepareData.meta}
                fields={prepareData.fields}
              />,
              document.body
            )
          : null}

        <footer
          className={`shrink-0 px-4 sm:px-8 ${
            step === 8 ? "py-2" : "py-4"
          }`}
        >
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


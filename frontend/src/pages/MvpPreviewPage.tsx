import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MvpClubSettingsScreen,
  MvpLoginScreen,
  MvpOwnerImpersonationBanner,
  MvpOwnerUsersScreen,
  MvpPreviewAccountNav,
  MvpTeamChangeScreen,
  MvpTournamentDashboardScreen,
  MvpTournamentsScreen,
  type MvpPreviewScreen,
} from "../preview/mvp/MvpPreviewScreens";
import {
  MOCK_CLUB,
  MOCK_TOURNAMENTS,
  type MvpClubProfile,
  type MvpTournamentSummary,
} from "../preview/mvp/mockMvpData";
import { MVP_PREVIEW_BUILD } from "../preview/mvp/MvpPreviewShell";
import {
  hasPlatformSession,
  platformCancelManagerLive,
  platformClearActAsUser,
  platformFetchMe,
  platformFetchTournaments,
  platformGetActAsUser,
  platformLaunchManagerLive,
  platformLogin,
  platformLogout,
  platformResumeManagerLive,
  platformSetActAsUser,
  platformDeleteTournament,
  platformDownloadClassementFinalPdf,
  platformDownloadConvocationsPdf,
  platformDownloadTournamentPdf,
  PLATFORM_TOURNAMENT_FINISHED_EVENT,
  platformRedrawDraw,
  platformUpdateClubProfile,
  platformUploadLogo,
  platformViewTournamentPdf,
} from "../platform/api";
import { defaultForm } from "../types";
import {
  clearLiveSession,
  LIVE_SESSION_STORAGE_KEY,
  loadLiveSession,
  PLATFORM_TOURNAMENT_FINISHED_KEY,
  platformAnyLiveSessionForTournament,
} from "../manager/liveSessionStore";

const PREVIEW_SCREENS: { id: MvpPreviewScreen; label: string }[] = [
  { id: "login", label: "Connexion" },
  { id: "owner", label: "Propriétaire" },
  { id: "tournaments", label: "Mes tournois" },
  { id: "club", label: "Paramètres club" },
  { id: "tournament", label: "Fiche tournoi" },
  { id: "teams", label: "Modifier équipes" },
];

const usePlatformApi =
  import.meta.env.VITE_DEPLOY_TARGET === "platform" ||
  import.meta.env.VITE_USE_PLATFORM_API === "true";

function emptyClubProfile(): MvpClubProfile {
  return {
    club: "",
    nbTerrains: 4,
    terrains: ["TERRAIN 1", "TERRAIN 2", "TERRAIN 3", "TERRAIN 4"],
    terrainPrincipal: "TERRAIN 1",
    hasLogo: false,
    logoPreviewUrl: null,
  };
}

export default function MvpPreviewPage({ production = false }: { production?: boolean }) {
  const navigate = useNavigate();
  const apiEnabled = production || usePlatformApi;

  const [screen, setScreen] = useState<MvpPreviewScreen>("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [actingAs, setActingAs] = useState<{ userId: string; email: string; club: string } | null>(
    null
  );
  const [clubProfile, setClubProfile] = useState<MvpClubProfile>(
    apiEnabled ? emptyClubProfile() : MOCK_CLUB
  );
  const [tournaments, setTournaments] = useState<MvpTournamentSummary[]>(
    apiEnabled ? [] : MOCK_TOURNAMENTS
  );
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(
    apiEnabled ? null : MOCK_TOURNAMENTS[0]?.id ?? null
  );
  const [navHistory, setNavHistory] = useState<MvpPreviewScreen[]>([]);
  const [booting, setBooting] = useState(apiEnabled);
  const [canResumeLive, setCanResumeLive] = useState(false);
  const [liveActive, setLiveActive] = useState(false);
  const [redrawBusy, setRedrawBusy] = useState(false);
  const [redrawError, setRedrawError] = useState<string | null>(null);

  const activeTournament = useMemo(
    () => tournaments.find((item) => item.id === activeTournamentId) ?? null,
    [activeTournamentId, tournaments]
  );

  const refreshLiveSessionState = useCallback(
    async (
      tournamentId: string | null,
      freshTournaments?: MvpTournamentSummary[]
    ) => {
    if (!tournamentId || !apiEnabled) {
      setCanResumeLive(false);
      setLiveActive(false);
      return;
    }
    const list = freshTournaments ?? tournaments;
    const tournament = list.find((item) => item.id === tournamentId);
    if (tournament?.status === "finished") {
      const stored = loadLiveSession();
      if (stored?.tournamentId === tournamentId) {
        clearLiveSession(stored.liveData.live_token);
      }
      setCanResumeLive(false);
      setLiveActive(false);
      return;
    }
    const stored = loadLiveSession();
    const localSession =
      stored?.tournamentId === tournamentId ? stored : null;
    const dbLive = tournament?.status === "live_active";

    if (!dbLive && !localSession) {
      setCanResumeLive(false);
      setLiveActive(false);
      return;
    }

    if (!localSession) {
      setLiveActive(dbLive);
      setCanResumeLive(false);
      return;
    }

    try {
      const res = await fetch(`/api/live/${localSession.liveData.live_token}/status`);
      if (!res.ok) {
        clearLiveSession(localSession.liveData.live_token);
        setCanResumeLive(false);
        setLiveActive(dbLive);
        return;
      }
      setLiveActive(dbLive || true);
      setCanResumeLive(localSession.formatsConfirmed === true);
    } catch {
      setLiveActive(dbLive || true);
      setCanResumeLive(localSession.formatsConfirmed === true);
    }
  },
    [apiEnabled, tournaments]
  );

  const refreshSession = useCallback(async () => {
    const me = await platformFetchMe();
    const rows = await platformFetchTournaments();
    setUserEmail(me.email);
    setActingAs(me.actingAs);
    setClubProfile(me.clubProfile);
    setTournaments(rows);
    setActiveTournamentId((current) => {
      if (current && rows.some((row) => row.id === current)) return current;
      return rows[0]?.id ?? null;
    });
    setLoggedIn(true);
    return { me, rows };
  }, []);

  useEffect(() => {
    if (screen !== "tournament" || !activeTournamentId) {
      setCanResumeLive(false);
      setLiveActive(false);
      return;
    }
    void refreshLiveSessionState(activeTournamentId);
  }, [screen, activeTournamentId, refreshLiveSessionState]);

  useEffect(() => {
    if (!apiEnabled || screen !== "tournament" || !activeTournamentId) return;

    const syncLiveState = () => {
      void refreshLiveSessionState(activeTournamentId);
      void refreshSession().catch(() => {});
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === LIVE_SESSION_STORAGE_KEY) syncLiveState();
      if (event.key === PLATFORM_TOURNAMENT_FINISHED_KEY && event.newValue) {
        void refreshSession().then(({ rows }) => {
          void refreshLiveSessionState(event.newValue, rows);
          localStorage.removeItem(PLATFORM_TOURNAMENT_FINISHED_KEY);
        });
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", syncLiveState);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", syncLiveState);
    };
  }, [apiEnabled, screen, activeTournamentId, refreshLiveSessionState, refreshSession]);

  useEffect(() => {
    if (!apiEnabled || screen !== "tournament" || !activeTournamentId) return;
    void refreshSession().catch(() => {});
  }, [apiEnabled, screen, activeTournamentId, refreshSession]);

  useEffect(() => {
    if (!apiEnabled || !loggedIn) return;

    const applyFinishedRefresh = (tournamentId: string) => {
      void refreshSession().then(({ rows }) => {
        if (activeTournamentId === tournamentId) {
          void refreshLiveSessionState(tournamentId, rows);
        }
        localStorage.removeItem(PLATFORM_TOURNAMENT_FINISHED_KEY);
      });
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PLATFORM_TOURNAMENT_FINISHED_KEY || !event.newValue) return;
      applyFinishedRefresh(event.newValue);
    };

    const onFinished = (event: Event) => {
      const tournamentId = (event as CustomEvent<string>).detail;
      if (!tournamentId) return;
      applyFinishedRefresh(tournamentId);
    };

    const onFocus = () => {
      void refreshSession().catch(() => {});
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(PLATFORM_TOURNAMENT_FINISHED_EVENT, onFinished);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PLATFORM_TOURNAMENT_FINISHED_EVENT, onFinished);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    apiEnabled,
    loggedIn,
    activeTournamentId,
    refreshLiveSessionState,
    refreshSession,
  ]);

  const showAccountNav = loggedIn && screen !== "login" && devOpen;
  const isLogin = screen === "login";

  const resolvePostLoginScreen = useCallback(
    (me: { role: string }) => {
      if (me.role === "owner" && !platformGetActAsUser()) return "owner" as const;
      return "tournaments" as const;
    },
    []
  );

  useEffect(() => {
    if (!apiEnabled) {
      setBooting(false);
      return;
    }

    if (!hasPlatformSession()) {
      setBooting(false);
      return;
    }

    void refreshSession()
      .then((me) => setScreen(resolvePostLoginScreen(me)))
      .catch(() => {
        platformLogout();
        setLoggedIn(false);
        setScreen("login");
      })
      .finally(() => setBooting(false));
  }, [apiEnabled, refreshSession, resolvePostLoginScreen]);

  const navigateTo = useCallback(
    (next: MvpPreviewScreen) => {
      setNavHistory((prev) => (screen === next ? prev : [...prev, screen]));
      setScreen(next);
    },
    [screen]
  );

  const handleBack = useCallback(() => {
    setNavHistory((prev) => {
      const nextHistory = [...prev];
      const previous = nextHistory.pop();
      if (previous) {
        setScreen(previous);
        return nextHistory;
      }
      if (screen !== "tournaments") {
        setScreen("tournaments");
      }
      return nextHistory;
    });
  }, [screen]);

  const handleExitImpersonation = useCallback(() => {
    platformClearActAsUser();
    setActingAs(null);
    setNavHistory([]);
    void refreshSession().then(() => setScreen("owner"));
  }, [refreshSession]);

  const handleOwnerAwareBack = useCallback(() => {
    if (actingAs && navHistory.length === 0) {
      handleExitImpersonation();
      return;
    }
    handleBack();
  }, [actingAs, navHistory.length, handleBack, handleExitImpersonation]);

  const handleLogout = useCallback(() => {
    if (apiEnabled) {
      platformLogout();
    }
    setLoggedIn(false);
    setUserEmail("");
    setActingAs(null);
    setClubProfile(apiEnabled ? emptyClubProfile() : MOCK_CLUB);
    setTournaments(apiEnabled ? [] : MOCK_TOURNAMENTS);
    setActiveTournamentId(apiEnabled ? null : MOCK_TOURNAMENTS[0]?.id ?? null);
    setNavHistory([]);
    setScreen("login");
  }, [apiEnabled]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      if (apiEnabled) {
        platformClearActAsUser();
        await platformLogin(email, password);
        const { me } = await refreshSession();
        setNavHistory([]);
        setScreen(resolvePostLoginScreen(me));
        return;
      }

      setLoggedIn(true);
      setNavHistory([]);
      setScreen("tournaments");
    },
    [apiEnabled, refreshSession, resolvePostLoginScreen]
  );

  const handleEnterUserAsOwner = useCallback(
    async (userId: string) => {
      platformSetActAsUser(userId);
      await refreshSession();
      setNavHistory([]);
      setScreen("tournaments");
    },
    [refreshSession]
  );

  const handleClubSave = useCallback(
    async (profile: MvpClubProfile, logoFile?: File | null) => {
      if (!apiEnabled) {
        setClubProfile(profile);
        return;
      }

      const saved = await platformUpdateClubProfile({
        club: profile.club,
        nb_terrains: profile.nbTerrains,
        terrains: profile.terrains,
        terrain_principal: profile.terrainPrincipal,
      });

      const withLogo = logoFile ? await platformUploadLogo(logoFile) : saved;
      setClubProfile(withLogo);
    },
    [apiEnabled]
  );

  const handleDeleteTournament = useCallback(
    async (tournamentId: string, tournamentName: string) => {
      if (!apiEnabled) {
        window.alert("Preview : supprimerait ce tournoi.");
        return;
      }
      const confirmed = window.confirm(
        `Supprimer « ${tournamentName} » ? Cette action est définitive (PDF et données Live).`
      );
      if (!confirmed) return;
      try {
        await platformDeleteTournament(tournamentId);
        await refreshSession();
        setActiveTournamentId(null);
        setNavHistory([]);
        setScreen("tournaments");
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Suppression impossible");
      }
    },
    [apiEnabled, refreshSession]
  );

  const handleNewTournament = useCallback(() => {
    if (apiEnabled) {
      navigate("/nouveau-tournoi");
      return;
    }

    window.alert("Preview : ouvrirait le wizard Platform pré-rempli avec le profil club.");
  }, [apiEnabled, navigate]);

  const handleViewPdf = useCallback(
    async (id: string) => {
      if (!apiEnabled) return;
      try {
        await platformViewTournamentPdf(id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "PDF indisponible");
      }
    },
    [apiEnabled]
  );

  const handleDownloadPdf = useCallback(
    async (id: string) => {
      if (!apiEnabled) return;
      try {
        await platformDownloadTournamentPdf(id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "PDF indisponible");
      }
    },
    [apiEnabled]
  );

  const handleExportPartialPdf = useCallback(
    async (tournament: MvpTournamentSummary) => {
      if (!apiEnabled) return;
      try {
        if (tournament.status === "finished") {
          await platformDownloadClassementFinalPdf(tournament.id);
        } else {
          await platformDownloadConvocationsPdf(tournament.id);
        }
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : tournament.status === "finished"
              ? "Classement final indisponible"
              : "Convocations indisponibles"
        );
      }
    },
    [apiEnabled]
  );

  const handleRedrawDraw = useCallback(
    async (tournamentId: string) => {
      if (!apiEnabled) {
        window.alert("Preview : refait un tirage au sort pour ce tournoi.");
        return;
      }
      if (redrawBusy) return;
      setRedrawBusy(true);
      setRedrawError(null);
      try {
        await platformRedrawDraw(tournamentId);
        await refreshSession();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Tirage au sort impossible.";
        setRedrawError(message);
      } finally {
        setRedrawBusy(false);
      }
    },
    [apiEnabled, redrawBusy, refreshSession]
  );

  const patchTournamentStatus = useCallback(
    (tournamentId: string, status: MvpTournamentSummary["status"]) => {
      setTournaments((prev) =>
        prev.map((item) =>
          item.id === tournamentId ? { ...item, status } : item
        )
      );
    },
    []
  );

  const openLiveWindow = useCallback(
    async (prepare: () => Promise<void>, tournamentId?: string) => {
      const liveUrl = `${window.location.href.split("#")[0]}#/manager`;
      const liveWindow = window.open("", "_blank");
      if (!liveWindow) {
        window.alert("Autorisez les pop-ups pour ouvrir le live dans une nouvelle fenêtre.");
        return;
      }
      try {
        await prepare();
        liveWindow.location.href = liveUrl;
        if (tournamentId) {
          patchTournamentStatus(tournamentId, "live_active");
          setLiveActive(true);
          const { rows } = await refreshSession();
          await refreshLiveSessionState(tournamentId, rows);
        }
      } catch (err) {
        liveWindow.close();
        window.alert(err instanceof Error ? err.message : "Live indisponible");
      }
    },
    [patchTournamentStatus, refreshLiveSessionState, refreshSession]
  );

  const handleLaunchLive = useCallback(
    async (tournamentId: string) => {
      if (!apiEnabled) {
        window.alert("Preview : ouvrirait Live V2 avec le snapshot de ce tournoi.");
        return;
      }
      if (liveActive) return;
      await openLiveWindow(async () => {
        const form = {
          ...defaultForm(),
          club: clubProfile.club,
          nbTerrains: clubProfile.nbTerrains,
          terrains: [...clubProfile.terrains],
          terrainPrincipal: clubProfile.terrainPrincipal,
          pasDeLogo: !clubProfile.hasLogo,
        };
        const teams =
          tournaments.find((item) => item.id === tournamentId)?.teams ?? 0;
        await platformLaunchManagerLive(tournamentId, form, teams);
      }, tournamentId);
    },
    [apiEnabled, clubProfile, liveActive, openLiveWindow, tournaments]
  );

  const handleResumeLive = useCallback(
    async (tournamentId: string) => {
      if (!apiEnabled) {
        window.alert("Preview : reprendrait le live de ce tournoi.");
        return;
      }
      await openLiveWindow(async () => {
        await platformResumeManagerLive(tournamentId);
      }, tournamentId);
    },
    [apiEnabled, openLiveWindow]
  );

  const handleCancelLive = useCallback(
    async (tournamentId: string) => {
      if (!apiEnabled) return;
      if (
        !window.confirm(
          "Annuler le live ? Vous pourrez à nouveau modifier les équipes."
        )
      ) {
        return;
      }
      try {
        patchTournamentStatus(tournamentId, "convocations_sent");
        setLiveActive(false);
        setCanResumeLive(false);
        await platformCancelManagerLive(tournamentId);
        const { rows } = await refreshSession();
        await refreshLiveSessionState(tournamentId, rows);
      } catch (err) {
        await refreshSession();
        window.alert(err instanceof Error ? err.message : "Impossible d'annuler le live.");
      }
    },
    [apiEnabled, patchTournamentStatus, refreshLiveSessionState, refreshSession]
  );

  useEffect(() => {
    if (screen !== "teams" || !activeTournamentId || !apiEnabled) return;
    if (platformAnyLiveSessionForTournament(activeTournamentId)) {
      setScreen("tournament");
    }
  }, [screen, activeTournamentId, apiEnabled]);

  if (booting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-arena-950 text-sm text-white/50">
        Chargement…
      </div>
    );
  }

  const impersonationBanner =
    apiEnabled && actingAs ? (
      <div className="mx-auto mb-4 w-full max-w-4xl px-4 pt-2">
        <MvpOwnerImpersonationBanner
          email={actingAs.email}
          club={actingAs.club}
          onExit={handleExitImpersonation}
          showExitButton={navHistory.length > 0}
        />
      </div>
    ) : null;

  const accountBack = actingAs ? handleOwnerAwareBack : handleBack;

  return (
    <div className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-arena-950 text-white">
      {!isLogin && !production && devOpen ? (
        <header className="shrink-0 border-b border-white/10 px-2 py-2">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-lime">
            Preview MVP · {MVP_PREVIEW_BUILD} · {apiEnabled ? "API Platform" : "mock local"}
          </p>
          <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PREVIEW_SCREENS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  if (entry.id !== "login") setLoggedIn(true);
                  setNavHistory([]);
                  setScreen(entry.id);
                }}
                className={[
                  "shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
                  screen === entry.id
                    ? "bg-lime/15 text-lime ring-1 ring-lime/35"
                    : "bg-white/[0.04] text-white/45",
                ].join(" ")}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {showAccountNav ? (
            <div className="mt-1.5">
              <MvpPreviewAccountNav active={screen} onNavigate={navigateTo} />
            </div>
          ) : null}
        </header>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {screen === "login" ? (
          <MvpLoginScreen onLogin={handleLogin} useTestAccounts={apiEnabled} />
        ) : null}

        {screen === "owner" ? (
          <MvpOwnerUsersScreen
            ownerEmail={userEmail}
            onEnterUser={handleEnterUserAsOwner}
            onLogout={handleLogout}
          />
        ) : null}

        {screen === "tournaments" ? (
          <>
            {impersonationBanner}
            <MvpTournamentsScreen
              profile={clubProfile}
              tournaments={tournaments}
              userEmail={apiEnabled ? (actingAs?.email ?? userEmail) : undefined}
              onOpenTournament={(id) => {
                setActiveTournamentId(id);
                navigateTo("tournament");
              }}
              onNewTournament={() => void handleNewTournament()}
              onEditClub={() => navigateTo("club")}
              onDeleteTournament={(id, name) => void handleDeleteTournament(id, name)}
              onBack={accountBack}
              onLogout={handleLogout}
              showBack={Boolean(actingAs)}
            />
          </>
        ) : null}

        {screen === "club" ? (
          <>
            {impersonationBanner}
            <MvpClubSettingsScreen
              profile={clubProfile}
              onSave={handleClubSave}
              onBack={accountBack}
              onLogout={handleLogout}
            />
          </>
        ) : null}

        {screen === "tournament" && activeTournament ? (
          <>
            {impersonationBanner}
            <MvpTournamentDashboardScreen
              tournament={activeTournament}
              onExportPartialPdf={() =>
                void handleExportPartialPdf(activeTournament)
              }
              onViewPdf={() => void handleViewPdf(activeTournament.id)}
              onDownloadPdf={() => void handleDownloadPdf(activeTournament.id)}
              onRedrawDraw={() => void handleRedrawDraw(activeTournament.id)}
              redrawBusy={redrawBusy}
              redrawError={redrawError}
              onModifyTeams={() => {
                if (liveActive) return;
                navigateTo("teams");
              }}
              liveActive={liveActive}
              canResumeLive={canResumeLive}
              onLaunchLive={() => void handleLaunchLive(activeTournament.id)}
              onResumeLive={() => void handleResumeLive(activeTournament.id)}
              onCancelLive={() => void handleCancelLive(activeTournament.id)}
              onDelete={() =>
                void handleDeleteTournament(activeTournament.id, activeTournament.name)
              }
              onBack={accountBack}
              onLogout={handleLogout}
            />
          </>
        ) : null}

        {screen === "teams" && activeTournament ? (
          <>
            {impersonationBanner}
            <MvpTeamChangeScreen
              tournament={activeTournament}
              apiEnabled={apiEnabled}
              onApplied={async () => {
                await refreshSession();
                navigateTo("tournament");
              }}
              onBack={accountBack}
              onLogout={handleLogout}
            />
          </>
        ) : null}
      </div>

      {!isLogin && !production ? (
        <button
          type="button"
          onClick={() => setDevOpen((open) => !open)}
          className="absolute bottom-3 right-3 z-50 rounded-lg border border-white/20 bg-black/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm"
        >
          {devOpen ? "Masquer dev" : "Écrans preview"}
        </button>
      ) : null}
    </div>
  );
}

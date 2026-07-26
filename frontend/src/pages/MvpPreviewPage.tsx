import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MvpClubSettingsScreen,
  MvpLoginScreen,
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
  platformFetchMe,
  platformFetchTournaments,
  platformLaunchManagerLive,
  platformLogin,
  platformLogout,
  platformDownloadConvocationsPdf,
  platformDownloadTournamentPdf,
  platformUpdateClubProfile,
  platformUploadLogo,
  platformViewTournamentPdf,
} from "../platform/api";
import { defaultForm } from "../types";

const PREVIEW_SCREENS: { id: MvpPreviewScreen; label: string }[] = [
  { id: "login", label: "Connexion" },
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

  const activeTournament = useMemo(
    () => tournaments.find((item) => item.id === activeTournamentId) ?? null,
    [activeTournamentId, tournaments]
  );

  const showAccountNav = loggedIn && screen !== "login" && devOpen;
  const isLogin = screen === "login";

  const refreshSession = useCallback(async () => {
    const me = await platformFetchMe();
    const rows = await platformFetchTournaments();
    setUserEmail(me.email);
    setClubProfile(me.clubProfile);
    setTournaments(rows);
    setActiveTournamentId((current) => {
      if (current && rows.some((row) => row.id === current)) return current;
      return rows[0]?.id ?? null;
    });
    setLoggedIn(true);
  }, []);

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
      .then(() => setScreen("tournaments"))
      .catch(() => {
        platformLogout();
        setLoggedIn(false);
        setScreen("login");
      })
      .finally(() => setBooting(false));
  }, [apiEnabled, refreshSession]);

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

  const handleLogout = useCallback(() => {
    if (apiEnabled) {
      platformLogout();
    }
    setLoggedIn(false);
    setUserEmail("");
    setClubProfile(apiEnabled ? emptyClubProfile() : MOCK_CLUB);
    setTournaments(apiEnabled ? [] : MOCK_TOURNAMENTS);
    setActiveTournamentId(apiEnabled ? null : MOCK_TOURNAMENTS[0]?.id ?? null);
    setNavHistory([]);
    setScreen("login");
  }, [apiEnabled]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      if (apiEnabled) {
        await platformLogin(email, password);
        await refreshSession();
        setNavHistory([]);
        setScreen("tournaments");
        return;
      }

      setLoggedIn(true);
      setNavHistory([]);
      setScreen("tournaments");
    },
    [apiEnabled, refreshSession]
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

  const handleExportConvocations = useCallback(
    async (id: string) => {
      if (!apiEnabled) return;
      try {
        await platformDownloadConvocationsPdf(id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Convocations indisponibles");
      }
    },
    [apiEnabled]
  );

  const handleLaunchLive = useCallback(
    async (tournamentId: string) => {
      if (!apiEnabled) {
        window.alert("Preview : ouvrirait Live V2 avec le snapshot de ce tournoi.");
        return;
      }
      try {
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
        navigate("/manager");
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Live indisponible");
      }
    },
    [apiEnabled, clubProfile, navigate, tournaments]
  );

  if (booting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-arena-950 text-sm text-white/50">
        Chargement…
      </div>
    );
  }

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

        {screen === "tournaments" ? (
          <MvpTournamentsScreen
            profile={clubProfile}
            tournaments={tournaments}
            userEmail={apiEnabled ? userEmail : undefined}
            onOpenTournament={(id) => {
              setActiveTournamentId(id);
              navigateTo("tournament");
            }}
            onNewTournament={() => void handleNewTournament()}
            onEditClub={() => navigateTo("club")}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        ) : null}

        {screen === "club" ? (
          <MvpClubSettingsScreen
            profile={clubProfile}
            onSave={handleClubSave}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        ) : null}

        {screen === "tournament" && activeTournament ? (
          <MvpTournamentDashboardScreen
            tournament={activeTournament}
            onExportConvocations={() => void handleExportConvocations(activeTournament.id)}
            onViewPdf={() => void handleViewPdf(activeTournament.id)}
            onDownloadPdf={() => void handleDownloadPdf(activeTournament.id)}
            onModifyTeams={() => navigateTo("teams")}
            onLaunchLive={() => void handleLaunchLive(activeTournament.id)}
            onBack={handleBack}
            onLogout={handleLogout}
          />
        ) : null}

        {screen === "teams" && activeTournament ? (
          <MvpTeamChangeScreen
            tournament={activeTournament}
            onBack={handleBack}
            onLogout={handleLogout}
          />
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

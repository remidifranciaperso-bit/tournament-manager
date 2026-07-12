import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PadelCourtFilled, PadelCourtOutline } from "../components/CourtBackground";
import type { MatchFormatCode } from "./matchFormats";
import type { CourtMatchDisplay } from "./liveCourtMatches";
import { getSetScoreOptions } from "./matchScoreRules";
import type { SetScore } from "./matchScoreRules";
import { hasAnyCourtTeam } from "./courtTeamsReady";
import { isBracketPlaceholder } from "./formatBracketLabel";
import { parseTeamLabel, type ParsedTeam } from "./parseTeamLabel";

/** Décalage vertical des encarts vers le centre (évite le bord des lignes). */
const COURT_TEAM_BADGE_TOP_CLASS = "pb-5";
const COURT_TEAM_BADGE_BOTTOM_CLASS = "pt-5";
export const COURT_WIDTH_PX = 280;
export const COURT_HEIGHT_PX = 560;
/** Largeur uniforme des encarts equipes / gagnants (% du terrain). */
export const COURT_BADGE_WIDTH_CLASS = "w-[78%]";
/** Hauteur fixe sous le terrain (bouton score ou heure prévue). */
export const COURT_FOOTER_MIN_H_PX = 76;
/** Mode compact : Valider + Annuler sur une ligne. */
export const COURT_FOOTER_COMPACT_MIN_H_PX = 44;

/** Hauteur naturelle d'une carte compacte (terrain + match + terrain + footer). */
export const COMPACT_COURT_CARD_HEIGHT_PX =
  22 + 20 + COURT_HEIGHT_PX + 4 + COURT_FOOTER_COMPACT_MIN_H_PX;

export type LiveCourtTheme = "dark" | "light";

export function formatMatchName(match: CourtMatchDisplay): string {
  return `${match.code} — ${match.tour}`;
}

export function CourtFooterSlot({
  children,
  compact = false,
}: {
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "flex w-full max-w-[280px] flex-col justify-start gap-1.5",
        compact ? "mt-1" : "mt-3",
      ].join(" ")}
      style={{
        minHeight: compact ? COURT_FOOTER_COMPACT_MIN_H_PX : COURT_FOOTER_MIN_H_PX,
      }}
    >
      {children}
    </div>
  );
}

export function CourtScheduledTime({
  heure,
  compact = false,
}: {
  heure: string | null;
  compact?: boolean;
}) {
  return (
    <CourtFooterSlot compact={compact}>
      <div className="flex min-h-[41px] w-full items-center justify-center rounded-xl border border-arena-600/30 bg-arena-600/10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-arena-700">
        {heure ? `Prévu ${heure}` : "Heure à confirmer"}
      </div>
    </CourtFooterSlot>
  );
}

const COURT_THEME = {
  dark: {
    terrainLabel:
      "field-label-section max-w-[280px] truncate px-1 text-center",
    matchName:
      "max-w-[280px] truncate px-1 text-center text-[12px] font-medium text-white/65 sm:text-[13px]",
    teamBadge: `${COURT_BADGE_WIDTH_CLASS} relative min-h-[5.5rem] shrink-0 rounded-lg border border-white/30 bg-arena-950/80 shadow-sm`,
    playerName:
      "block max-w-full text-center text-[14px] font-medium leading-snug text-white sm:text-[15px]",
    seed: "text-[11px] font-semibold uppercase tracking-wide text-template-blue sm:text-[12px]",
    gamesSelect:
      "mt-1.5 w-full max-w-[5.5rem] rounded-md border border-lime/30 bg-arena-950/90 px-1.5 py-1 text-center text-[13px] font-semibold text-lime focus:border-lime/50 focus:outline-none",
    vs: "rounded-full border border-lime/35 bg-arena-950/85 px-2.5 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-lime sm:text-base",
    winnerBox: `${COURT_BADGE_WIDTH_CLASS} shrink-0 rounded-xl border border-lime/40 bg-arena-950/90 px-3 py-2 text-center shadow-md`,
    winnerTitle:
      "text-[11px] font-bold uppercase tracking-wide text-lime sm:text-xs",
    winnerNames:
      "mt-0.5 text-[12px] font-semibold leading-snug text-lime sm:text-[13px]",
    empty: "text-center text-sm text-white/35",
    setActive: "bg-lime/15 text-lime ring-1 ring-lime/35",
    setInactive: "bg-white/[0.05] text-white/45 hover:text-white/70",
    court: "outline" as const,
  },
  light: {
    terrainLabel:
      "max-w-[280px] truncate px-1 text-center text-sm font-semibold uppercase tracking-widest text-arena-700 sm:text-base",
    matchName:
      "max-w-[280px] truncate px-1 text-center text-[12px] font-medium text-arena-600 sm:text-[13px]",
    teamBadge: `${COURT_BADGE_WIDTH_CLASS} relative min-h-[5.5rem] shrink-0 rounded-lg border border-arena-600/20 bg-white/95 shadow-sm`,
    playerName:
      "block max-w-full text-center text-[14px] font-medium leading-snug text-arena-800 sm:text-[15px]",
    seed: "text-[11px] font-semibold uppercase tracking-wide text-template-blue sm:text-[12px]",
    gamesSelect:
      "mt-1.5 w-full max-w-[5.5rem] rounded-md border border-arena-600/30 bg-white px-1.5 py-1 text-center text-[13px] font-semibold text-arena-700 focus:border-arena-600/50 focus:outline-none",
    vs: "rounded-full border border-arena-600/35 bg-white px-2.5 py-0.5 font-display text-sm font-bold uppercase tracking-wider text-arena-700 sm:text-base",
    winnerBox:
      `${COURT_BADGE_WIDTH_CLASS} shrink-0 rounded-xl border border-arena-600/35 bg-white px-3 py-2 text-center shadow-md`,
    winnerTitle:
      "text-[11px] font-bold uppercase tracking-wide text-arena-600 sm:text-xs",
    winnerNames:
      "mt-0.5 text-[12px] font-semibold leading-snug text-arena-800 sm:text-[13px]",
    empty: "text-center text-sm text-arena-400",
    setActive: "bg-white text-[#00B0F0] ring-1 ring-white/80 shadow-sm",
    setInactive:
      "bg-white/35 text-white hover:bg-white/50 hover:text-white",
    court: "filled" as const,
  },
} as const;

function GamesSelect({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: number;
  options: number[];
  onChange: (value: number) => void;
  label: string;
  className: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className={className}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function footnoteUsesTwoLines(footnote: string): boolean {
  const terrain = footnote.replace(/^Match en cours\s+/i, "").trim();
  if (/^\d+$/.test(terrain)) return false;
  if (/^terrain\s+\d+$/i.test(terrain)) return false;
  return terrain.length > 14;
}

function TeamBadge({
  team,
  scoringMode,
  games,
  gameOptions,
  onGamesChange,
  theme,
  footnote,
}: {
  team: ParsedTeam;
  scoringMode: boolean;
  games?: number;
  gameOptions?: number[];
  onGamesChange?: (value: number) => void;
  theme: (typeof COURT_THEME)[LiveCourtTheme];
  footnote?: string | null;
}) {
  const centerPlaceholder =
    !scoringMode &&
    !footnote &&
    isBracketPlaceholder(team.player1) &&
    !team.player2 &&
    !team.seed;
  const longFootnote = Boolean(footnote && footnoteUsesTwoLines(footnote));

  if (centerPlaceholder) {
    return (
      <div className={theme.teamBadge}>
        <div className="absolute inset-2 flex items-center justify-center px-1">
          <span className={`${theme.playerName} text-center break-words`}>
            {team.player1}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={theme.teamBadge}>
      <div
        className={[
          "absolute inset-x-2.5 top-2 flex items-center justify-center",
          longFootnote ? "bottom-[3.25rem]" : "bottom-9",
        ].join(" ")}
      >
        <div className="flex max-w-full flex-col items-center gap-0.5">
          <span className={`${theme.playerName} break-words`}>{team.player1}</span>
          {team.player2 && (
            <span className={`${theme.playerName} break-words`}>{team.player2}</span>
          )}
        </div>
      </div>
      <div
        className={[
          "absolute inset-x-0 flex items-center justify-center px-1",
          longFootnote ? "bottom-1.5 min-h-[2.75rem]" : "bottom-2 h-7",
        ].join(" ")}
      >
        {scoringMode && gameOptions && onGamesChange ? (
          <GamesSelect
            value={games ?? 0}
            options={gameOptions}
            onChange={onGamesChange}
            label={`Jeux ${team.player1}`}
            className={`${theme.gamesSelect} mt-0`}
          />
        ) : footnote ? (
          <p
            className={`${theme.seed} max-w-full text-center ${longFootnote ? "leading-tight" : ""}`}
            style={longFootnote ? { fontSize: "10px" } : undefined}
          >
            {footnote}
          </p>
        ) : (
          team.seed && <p className={theme.seed}>{team.seed}</p>
        )}
      </div>
    </div>
  );
}

function WinnerBadge({
  team,
  theme,
}: {
  team: ParsedTeam;
  theme: (typeof COURT_THEME)[LiveCourtTheme];
}) {
  const names = team.player2
    ? `${team.player1} / ${team.player2}`
    : team.player1;

  return (
    <div className={theme.winnerBox}>
      <p className={theme.winnerTitle}>Gagnants :</p>
      <p className={`${theme.winnerNames} break-words`}>{names}</p>
    </div>
  );
}

export interface CourtScoringState {
  format: MatchFormatCode;
  sets: SetScore[];
  activeSetIndex: number;
  setCount: number;
  winnerTeam: ParsedTeam | null;
  onSetChange: (index: number) => void;
  onGamesChange: (
    setIndex: number,
    side: "team1" | "team2",
    value: number
  ) => void;
}

interface LiveCourtCardProps {
  terrainName: string;
  match: CourtMatchDisplay | null;
  footer?: ReactNode;
  emptyLabel?: string;
  scoring?: CourtScoringState;
  theme?: LiveCourtTheme;
  compact?: boolean;
  /** Après validation du score : invite à lancer le match suivant sur ce terrain. */
  terrainLibrePrompt?: {
    onLaunch?: () => void;
    blockedMessage?: string | null;
    noMoreMatches?: boolean;
  };
}

export function LiveCourtCard({
  terrainName,
  match,
  footer,
  emptyLabel = "Aucun match",
  scoring,
  theme: themeName = "dark",
  compact = false,
  terrainLibrePrompt,
}: LiveCourtCardProps) {
  const theme = COURT_THEME[themeName];

  const equipe1 = useMemo(
    () => (match ? parseTeamLabel(match.equipe1) : null),
    [match]
  );
  const equipe2 = useMemo(
    () => (match ? parseTeamLabel(match.equipe2) : null),
    [match]
  );

  const scoringMode = Boolean(scoring);
  const activeSet = scoring?.activeSetIndex ?? 0;
  const activeSetScore = scoring?.sets[activeSet];
  const gameOptions = scoring
    ? getSetScoreOptions(scoring.format, activeSet)
    : [];

  const CourtGraphic =
    theme.court === "filled" ? PadelCourtFilled : PadelCourtOutline;

  const showSetTabs =
    scoringMode && scoring && scoring.setCount > 1;

  return (
    <div className="flex w-[280px] shrink-0 flex-col items-center">
      <p className={`${theme.terrainLabel} w-full shrink-0 text-center`}>
        {terrainName}
      </p>
      <div
        className={[
          "flex w-full shrink-0 items-center justify-center",
          compact ? "h-5" : "mb-2 h-5",
        ].join(" ")}
      >
        <p className={theme.matchName}>
          {match ? formatMatchName(match) : "\u00A0"}
        </p>
      </div>

      <div className="flex w-full flex-col items-center">
        <div
          className="relative shrink-0"
          style={{
            width: COURT_WIDTH_PX,
            height: COURT_HEIGHT_PX,
          }}
        >
        <CourtGraphic className="h-full w-full" />

        {terrainLibrePrompt ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center px-3">
            {terrainLibrePrompt.noMoreMatches ? (
              <div className="flex max-w-[92%] flex-col items-center gap-2 rounded-2xl border border-template-blue/40 bg-white/95 px-5 py-4 text-center shadow-lg">
                <span className="font-brush text-2xl leading-none text-template-blue sm:text-3xl">
                  Terrain libre
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-template-blue/85 sm:text-[11px]">
                  Aucun match à suivre sur ce terrain
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={terrainLibrePrompt.onLaunch}
                className="flex max-w-[92%] flex-col items-center gap-2 rounded-2xl border border-arena-600/25 bg-white/95 px-5 py-4 text-center shadow-lg transition hover:border-arena-600/45 hover:shadow-xl"
              >
                <span className="font-brush text-2xl leading-none text-arena-700 sm:text-3xl">
                  Terrain libre
                </span>
                {terrainLibrePrompt.blockedMessage ? (
                  <span className="max-w-[220px] text-[10px] font-semibold leading-snug text-amber-700 sm:text-[11px]">
                    {terrainLibrePrompt.blockedMessage}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-arena-600/80 sm:text-[11px]">
                    Lancer le match suivant
                  </span>
                )}
              </button>
            )}
          </div>
        ) : match && hasAnyCourtTeam(match.equipe1, match.equipe2) ? (
          <>
            <div
              className={`absolute inset-x-0 top-0 z-10 flex h-1/2 items-center justify-center ${COURT_TEAM_BADGE_TOP_CLASS}`}
            >
              <TeamBadge
                team={equipe1}
                scoringMode={scoringMode}
                games={activeSetScore?.team1}
                gameOptions={gameOptions}
                onGamesChange={
                  scoring
                    ? (value) =>
                        scoring.onGamesChange(activeSet, "team1", value)
                    : undefined
                }
                theme={theme}
                footnote={match.equipe1Footnote}
              />
            </div>

            <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center">
              {scoringMode && scoring?.winnerTeam ? (
                <WinnerBadge team={scoring.winnerTeam} theme={theme} />
              ) : scoringMode && showSetTabs ? (
                <div className="flex flex-wrap justify-center gap-1">
                  {Array.from({ length: scoring!.setCount }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => scoring!.onSetChange(index)}
                      className={[
                        "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition",
                        index === activeSet ? theme.setActive : theme.setInactive,
                      ].join(" ")}
                    >
                      {index === 2 ? "STB" : `Set ${index + 1}`}
                    </button>
                  ))}
                </div>
              ) : (
                !scoringMode && <span className={theme.vs}>vs</span>
              )}
            </div>

            <div
              className={`absolute inset-x-0 bottom-0 z-10 flex h-1/2 items-center justify-center ${COURT_TEAM_BADGE_BOTTOM_CLASS}`}
            >
              <TeamBadge
                team={equipe2}
                scoringMode={scoringMode}
                games={activeSetScore?.team2}
                gameOptions={gameOptions}
                onGamesChange={
                  scoring
                    ? (value) =>
                        scoring.onGamesChange(activeSet, "team2", value)
                    : undefined
                }
                theme={theme}
                footnote={match.equipe2Footnote}
              />
            </div>
          </>
        ) : (
          emptyLabel ? (
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <p className={theme.empty}>{emptyLabel}</p>
            </div>
          ) : null
        )}
      </div>

        {footer ?? <CourtFooterSlot compact={compact} />}
      </div>
    </div>
  );
}

interface LiveCourtsRowProps {
  terrains: string[];
  matchByTerrain: Map<string, CourtMatchDisplay | null>;
  renderFooter?: (terrain: string, match: CourtMatchDisplay | null) => ReactNode;
  getScoring?: (
    terrain: string,
    match: CourtMatchDisplay | null
  ) => CourtScoringState | undefined;
  getTerrainLibrePrompt?: (
    terrain: string
  ) => { onLaunch: () => void; blockedMessage?: string | null } | undefined;
  emptyLabel?: string;
  theme?: LiveCourtTheme;
  compact?: boolean;
}

export function LiveCourtsRow({
  terrains,
  matchByTerrain,
  renderFooter,
  getScoring,
  getTerrainLibrePrompt,
  emptyLabel,
  theme = "dark",
  compact = false,
}: LiveCourtsRowProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;
    if (!compact) {
      setScale(1);
      return;
    }
    const height = slot.clientHeight;
    if (height <= 0) return;
    setScale(Math.min(1, height / COMPACT_COURT_CARD_HEIGHT_PX));
  }, [compact]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(slot);
    return () => observer.disconnect();
  }, [updateScale]);

  const scaledHeight = COMPACT_COURT_CARD_HEIGHT_PX * scale;

  return (
    <div
      ref={slotRef}
      className={[
        "flex min-h-0 flex-1 justify-center overflow-hidden px-4 sm:px-8",
        compact ? "items-start pt-0" : "items-center py-6",
      ].join(" ")}
    >
      <div
        className={[
          "flex w-full justify-center overflow-x-auto overscroll-x-contain",
          compact ? "overflow-y-hidden" : "",
        ].join(" ")}
        style={compact ? { height: scaledHeight } : undefined}
      >
        <div
          className="flex shrink-0 items-start justify-center gap-8 transition-none sm:gap-12"
          style={
            compact
              ? {
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                }
              : undefined
          }
        >
          {terrains.map((name) => {
            const match = matchByTerrain.get(name) ?? null;
            const terrainLibrePrompt = getTerrainLibrePrompt?.(name);
            return (
              <LiveCourtCard
                key={name}
                terrainName={name}
                match={match}
                emptyLabel={emptyLabel}
                scoring={
                  terrainLibrePrompt
                    ? undefined
                    : getScoring?.(name, match)
                }
                footer={renderFooter?.(name, match)}
                theme={theme}
                compact={compact}
                terrainLibrePrompt={terrainLibrePrompt}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function useScoreFormToggle() {
  const [openTerrain, setOpenTerrain] = useState<string | null>(null);

  return {
    openTerrain,
    open: (terrain: string) => setOpenTerrain(terrain),
    close: () => setOpenTerrain(null),
    isOpen: (terrain: string) => openTerrain === terrain,
  };
}

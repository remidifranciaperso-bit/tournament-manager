import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { SLIDE_ASPECT } from "./bracketSlideLayout";
import { STANDARD_MATCH_BOX } from "./bracketTemplateMetrics";
import { TemplateMatchBox } from "./LiveBracketSlide";
import { formatTeamWithInitials } from "./formatBracketLabel";
import {
  buildPoolStandings,
  poolLetters,
  poolMatches,
} from "./buildPoolStandings";
import type { LiveMatch } from "./liveTypes";
import type { StoredMatchResult } from "./useLiveProgress";
import {
  LIVE_TABLE,
  LIVE_TABLE_CARD,
  LIVE_TABLE_CELL_NOTO,
  LIVE_TABLE_CELL_TSL_BOLD,
  LIVE_TABLE_HEAD,
  LIVE_TABLE_ROW,
  liveTeamTextClass,
} from "./liveDataTable";

/** Largeur de référence de la page poule (avant mise à l'échelle). */
const POOL_BASE_WIDTH = 920;
const NOMINAL_SLIDE_H = POOL_BASE_WIDTH / SLIDE_ASPECT;
const BOX_W = (STANDARD_MATCH_BOX.widthPct / 100) * POOL_BASE_WIDTH;
const BOX_H = (STANDARD_MATCH_BOX.heightPct / 100) * NOMINAL_SLIDE_H;

export type LivePoolsView = "composition" | { letter: string };

interface LivePoolsTabProps {
  view: LivePoolsView;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  fields: Record<string, string>;
}

/** Roster d'une poule (équipes uniques, ordre d'apparition). */
function poolRoster(matches: LiveMatch[], letter: string): string[] {
  const roster: string[] = [];
  for (const match of poolMatches(matches, letter)) {
    for (const team of [match.equipe1, match.equipe2]) {
      if (team && !roster.includes(team)) roster.push(team);
    }
  }
  return roster;
}

function exemptTeams(fields: Record<string, string>): string[] {
  const teams: string[] = [];
  for (let i = 1; i <= 32; i += 1) {
    const value = fields[`EXEMPT_${i}_EQ`];
    if (value == null) {
      if (i > 1) break;
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) teams.push(trimmed);
  }
  return teams;
}

function useFitScale(rows: number) {
  const pageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const card = cardRef.current;
    if (!page || !card) return;

    const apply = () => {
      const availW = page.clientWidth;
      const availH = page.clientHeight;
      const naturalH = card.offsetHeight;
      if (availW <= 0 || availH <= 0 || naturalH <= 0) return;
      const nextScale = Math.min(1, availW / POOL_BASE_WIDTH, availH / naturalH);
      setScale((prev) => (prev === nextScale ? prev : nextScale));
      setNaturalHeight((prev) => (prev === naturalH ? prev : naturalH));
    };

    apply();
    const observer = new ResizeObserver(() => apply());
    observer.observe(page);
    observer.observe(card);
    return () => observer.disconnect();
  }, [rows]);

  return { pageRef, cardRef, scale, naturalHeight };
}

function ScaledPage({
  rows,
  children,
}: {
  rows: number;
  children: React.ReactNode;
}) {
  const { pageRef, cardRef, scale, naturalHeight } = useFitScale(rows);
  return (
    <div
      ref={pageRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6 sm:py-6"
    >
      <div
        className="relative shrink-0"
        style={{
          width: POOL_BASE_WIDTH * scale,
          height: naturalHeight * scale || undefined,
        }}
      >
        <div
          ref={cardRef}
          className="absolute left-0 top-0"
          style={{
            width: POOL_BASE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function RosterCard({
  title,
  teams,
}: {
  title: string;
  teams: string[];
}) {
  return (
    <div className={LIVE_TABLE_CARD}>
      <table className={LIVE_TABLE}>
        <thead>
          <tr className="bg-template-blue text-white">
            <th className={LIVE_TABLE_HEAD}>{title}</th>
          </tr>
        </thead>
        <tbody>
          {teams.length === 0 ? (
            <tr className={LIVE_TABLE_ROW}>
              <td className={LIVE_TABLE_CELL_NOTO}>
                <span className="text-arena-600/35">—</span>
              </td>
            </tr>
          ) : (
            teams.map((team, index) => {
              const label = formatTeamWithInitials(team);
              return (
                <tr key={`${team}-${index}`} className={LIVE_TABLE_ROW}>
                  <td
                    className={`${LIVE_TABLE_CELL_NOTO} ${liveTeamTextClass(label)}`}
                  >
                    {label}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function CompositionView({
  matches,
  fields,
}: {
  matches: LiveMatch[];
  fields: Record<string, string>;
}) {
  const letters = useMemo(() => poolLetters(matches), [matches]);
  const exempts = useMemo(() => exemptTeams(fields), [fields]);

  return (
    <ScaledPage rows={letters.length + exempts.length}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          {letters.map((letter) => (
            <RosterCard
              key={letter}
              title={`Poule ${letter}`}
              teams={poolRoster(matches, letter)}
            />
          ))}
        </div>
        {exempts.length > 0 ? (
          <RosterCard title="Têtes de série (exemptées)" teams={exempts} />
        ) : null}
      </div>
    </ScaledPage>
  );
}

function PoolView({
  letter,
  matches,
  matchResults,
}: {
  letter: string;
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
}) {
  const pool = useMemo(() => poolMatches(matches, letter), [matches, letter]);
  const standings = useMemo(
    () => buildPoolStandings(pool, matchResults),
    [pool, matchResults]
  );

  const columns = 3;

  return (
    <ScaledPage rows={pool.length + standings.length}>
      <div className="flex flex-col gap-5">
        <div
          className="mx-auto grid justify-center gap-x-6 gap-y-8"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${BOX_W}px)`,
          }}
        >
          {pool.map((match) => {
            const result = matchResults[match.code];
            return (
              <div
                key={match.code}
                className="relative"
                style={{ width: BOX_W, height: BOX_H }}
              >
                <TemplateMatchBox
                  match={match}
                  box={{ left: 0, top: 0, width: 100, height: 100 }}
                  team1={formatTeamWithInitials(match.equipe1)}
                  team2={formatTeamWithInitials(match.equipe2)}
                  score={result?.display ?? null}
                  winnerSide={result?.winner ?? null}
                  scaleH={NOMINAL_SLIDE_H}
                  placementLabel={null}
                  splitMainBracket={false}
                />
              </div>
            );
          })}
        </div>

        <div className={LIVE_TABLE_CARD}>
          <table className={LIVE_TABLE}>
            <thead>
              <tr className="bg-template-blue text-white">
                <th className={LIVE_TABLE_HEAD}>Équipe</th>
                <th className={`w-[14%] text-center ${LIVE_TABLE_HEAD}`}>
                  Victoires
                </th>
                <th className={`w-[14%] text-center ${LIVE_TABLE_HEAD}`}>
                  Défaites
                </th>
                <th className={`w-[14%] text-center ${LIVE_TABLE_HEAD}`}>Jeux</th>
                <th className={`w-[16%] text-center ${LIVE_TABLE_HEAD}`}>
                  Classement
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const label = formatTeamWithInitials(row.team);
                const diff =
                  row.gameDiff > 0 ? `+${row.gameDiff}` : String(row.gameDiff);
                return (
                  <tr key={row.team} className={LIVE_TABLE_ROW}>
                    <td
                      className={`${LIVE_TABLE_CELL_NOTO} ${liveTeamTextClass(label)}`}
                    >
                      {label}
                    </td>
                    <td className={`${LIVE_TABLE_CELL_TSL_BOLD} text-center`}>
                      {row.wins}
                    </td>
                    <td className={`${LIVE_TABLE_CELL_TSL_BOLD} text-center`}>
                      {row.losses}
                    </td>
                    <td className={`${LIVE_TABLE_CELL_TSL_BOLD} text-center`}>
                      {row.played > 0 ? diff : "—"}
                    </td>
                    <td className={`${LIVE_TABLE_CELL_TSL_BOLD} text-center`}>
                      {row.rank}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ScaledPage>
  );
}

export function LivePoolsTab({
  view,
  matches,
  matchResults,
  fields,
}: LivePoolsTabProps) {
  if (view === "composition") {
    return <CompositionView matches={matches} fields={fields} />;
  }
  return (
    <PoolView
      letter={view.letter}
      matches={matches}
      matchResults={matchResults}
    />
  );
}

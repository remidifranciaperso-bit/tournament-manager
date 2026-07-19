import { useMemo } from "react";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";
import {
  parseBracketSlide,
  SLIDE_ASPECT,
} from "./bracketSlideLayout";
import {
  inferSplitMainBracketHalf,
  resolveMatchBoxLayouts,
} from "./bracketBoxLayout";
import { buildBracketConnectors, getViewportCrossPageStub } from "./bracketConnectors";
import { mapFieldToProjection, type BoxRectPct } from "./bracketGeometry";
import {
  ptOnSlide,
  TEMPLATE_PT,
} from "./bracketTemplateMetrics";
import {
  feedKeyFromTeamLabel,
  formatBracketTeamDisplay,
  formatFeedKey,
  formatTeamSlot,
  formatTeamWithInitials,
  isBracketPlaceholder,
  isUnresolvedTeamLabel,
} from "./formatBracketLabel";
import {
  buildMatchesByCode,
  resolveTeamLabelDeep,
} from "./resolveTeamLabel";
import { buildPoolQualifierMap } from "./buildPoolStandings";
import { LIVE_BRUSH_LABEL_CLASS } from "./LiveTabTitle";
import { matchPlacementLabel } from "./matchPlacementLabel";
import type { StoredMatchResult } from "./useLiveProgress";

function resolveFeedContent(
  key: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>,
  poolQualifiers: Map<string, string>
): string {
  const win = key.match(/^WIN_(.+)$/);
  const lose = key.match(/^LOSE_(.+)$/);
  const parentCode = win?.[1] ?? lose?.[1];
  if (!parentCode) return formatFeedKey(key);

  const parent = matchesByCode.get(parentCode);
  const result = matchResults[parentCode];
  if (!parent || !result) return formatFeedKey(key);

  const side = win ? result.winner : result.loser;
  const raw = side === 1 ? parent.equipe1 : parent.equipe2;
  const resolved = resolveTeamLabelDeep(
    raw,
    matchesByCode,
    matchResults,
    poolQualifiers
  );
  const text = resolved || formatFeedKey(key);
  if (isBracketPlaceholder(text) || /^Vainqueur\s+/i.test(text) || /^Perdant\s+/i.test(text)) {
    return formatTeamSlot(text);
  }
  return formatTeamWithInitials(text);
}

function resolveTeamDisplay(
  label: string,
  matchesByCode: Map<string, LiveMatch>,
  matchResults: Record<string, StoredMatchResult>,
  poolQualifiers: Map<string, string>
): string {
  const raw = label.trim();
  if (!raw) return "—";
  if (isUnresolvedTeamLabel(raw)) {
    return formatTeamSlot(raw);
  }
  const resolved = resolveTeamLabelDeep(
    label,
    matchesByCode,
    matchResults,
    poolQualifiers
  );
  return formatBracketTeamDisplay(label, resolved);
}

function teamFontSize(text: string, scaleH: number): number {
  const pt = isBracketPlaceholder(text)
    ? TEMPLATE_PT.teamPlaceholder
    : TEMPLATE_PT.team;
  return ptOnSlide(pt, scaleH);
}

export function TemplateMatchBox({
  match,
  box,
  team1,
  team2,
  score,
  winnerSide,
  scaleH,
  placementLabel,
  splitMainBracket,
}: {
  match: LiveMatch;
  box: BoxRectPct;
  team1: string;
  team2: string;
  score: string | null;
  winnerSide: 1 | 2 | null;
  scaleH: number;
  placementLabel: string | null;
  splitMainBracket: boolean;
}) {
  const codePx = ptOnSlide(TEMPLATE_PT.matchCode, scaleH);
  const team1Px = teamFontSize(team1, scaleH);
  const team2Px = teamFontSize(team2, scaleH);
  const vsPx = ptOnSlide(TEMPLATE_PT.vs, scaleH);
  const scorePx = ptOnSlide(TEMPLATE_PT.score, scaleH);
  const team1Weight =
    winnerSide == null || winnerSide === 1 ? "font-semibold" : "font-normal";
  const team2Weight =
    winnerSide == null || winnerSide === 2 ? "font-semibold" : "font-normal";
  const team1Font = isBracketPlaceholder(team1) ? "font-tsl" : "font-noto";
  const team2Font = isBracketPlaceholder(team2) ? "font-tsl" : "font-noto";
  const team1Align = isBracketPlaceholder(team1)
    ? "justify-start text-left overflow-visible"
    : "justify-center text-center";
  const team2Align = isBracketPlaceholder(team2)
    ? "justify-start text-left overflow-visible"
    : "justify-center text-center";

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }}
    >
      {placementLabel && (
        <p
          className={`pointer-events-none absolute bottom-full w-max max-w-[220%] -translate-x-1/2 truncate pb-0.5 text-center ${
            // Finale (1-2) : excentrée un peu à droite quand le tableau principal
            // est sur deux pages (16/20/24 éq.), centrée sinon (8/12). Le 3-4
            // reste centré dans tous les cas.
            placementLabel === "1-2" && splitMainBracket
              ? "left-[72%]"
              : "left-1/2"
          } ${LIVE_BRUSH_LABEL_CLASS}`}
        >
          {placementLabel}
        </p>
      )}

      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-template-blue/40 bg-white shadow-sm">
      <div
        className="relative shrink-0 rounded-t-lg bg-template-blue px-[0.4em] font-tsl leading-none text-white"
        style={{
          height: score ? "20%" : "22%",
          fontSize: codePx,
        }}
      >
        <span className="absolute inset-0 flex items-center justify-center px-1 text-center font-noto font-bold leading-none">
          {match.terrain ?? ""}
        </span>
        <div className="relative z-10 flex h-full items-center justify-between gap-1">
          <span className="max-w-[42%] shrink-0 truncate bg-template-blue pr-0.5 text-left font-semibold">
            {match.code}
          </span>
          <span className="max-w-[42%] shrink-0 truncate bg-template-blue pl-0.5 text-right font-semibold">
            {match.heure ?? ""}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={`flex flex-1 items-center px-1.5 leading-tight text-arena-800 ${team1Font} ${team1Weight} ${team1Align} ${isBracketPlaceholder(team1) ? "whitespace-nowrap" : "overflow-hidden"}`}
          style={{ fontSize: team1Px }}
        >
          <span className={isBracketPlaceholder(team1) ? "shrink-0" : "line-clamp-2 break-words"}>{team1}</span>
        </div>
        <div
          className="flex shrink-0 items-center justify-center font-noto font-semibold text-arena-600"
          style={{ height: "11%", fontSize: vsPx }}
        >
          vs
        </div>
        <div
          className={`flex flex-1 items-center px-1.5 leading-tight text-arena-800 ${team2Font} ${team2Weight} ${team2Align} ${isBracketPlaceholder(team2) ? "whitespace-nowrap" : "overflow-hidden"}`}
          style={{ fontSize: team2Px }}
        >
          <span className={isBracketPlaceholder(team2) ? "shrink-0" : "line-clamp-2 break-words"}>{team2}</span>
        </div>
      </div>

      {score ? (
        <div
          className="flex shrink-0 items-center justify-center rounded-b-lg border-t border-template-blue/25 bg-template-blue/[0.07] font-tsl font-semibold text-template-blue"
          style={{ height: "18%", fontSize: scorePx }}
        >
          {score}
        </div>
      ) : (
        <div
          className="shrink-0 rounded-b-lg border-t border-dashed border-template-blue/15"
          style={{ height: "14%" }}
          aria-hidden
        />
      )}
      </div>
    </div>
  );
}

function FeedLabel({
  field,
  text,
  scaleH,
}: {
  field: LiveLayoutField;
  text: string;
  scaleH: number;
}) {
  const mapped = mapFieldToProjection(field);
  const fontPx = ptOnSlide(
    isBracketPlaceholder(text) ? TEMPLATE_PT.teamPlaceholder : TEMPLATE_PT.team,
    scaleH
  );

  return (
    <div
      className="absolute z-10 flex items-center overflow-hidden rounded-md border border-template-blue/35 bg-template-blue/10 px-[0.3em] font-noto font-medium leading-tight text-arena-800"
      style={{
        left: `${mapped.left}%`,
        top: `${mapped.top}%`,
        width: `${mapped.width}%`,
        height: `${mapped.height}%`,
        fontSize: fontPx,
      }}
    >
      <span className={isBracketPlaceholder(text) ? "whitespace-nowrap" : "line-clamp-2 break-words"}>{text}</span>
    </div>
  );
}

function pathPctToPx(d: string, width: number, height: number): string {
  const sx = width / 100;
  const sy = height / 100;
  return d.replace(
    /([MHVL])\s*(-?\d*\.?\d+)(?:\s+(-?\d*\.?\d+))?/g,
    (_, cmd: string, a: string, b?: string) => {
      if (cmd === "H") return `H ${parseFloat(a) * sx}`;
      if (cmd === "V") return `V ${parseFloat(a) * sy}`;
      return `${cmd} ${parseFloat(a) * sx} ${parseFloat(b ?? "0") * sy}`;
    }
  );
}

function BracketConnectors({
  paths,
  width,
  height,
}: {
  paths: string[];
  width: number;
  height: number;
}) {
  if (paths.length === 0) return null;

  const scaledPaths = useMemo(
    () => paths.map((path) => pathPctToPx(path, width, height)),
    [paths, width, height]
  );

  const strokeWidth = Math.max(0.3, width * 0.0008);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-[5] block"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height }}
      aria-hidden
    >
      {scaledPaths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="#00B0F0"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="butt"
          shapeRendering="geometricPrecision"
        />
      ))}
    </svg>
  );
}

interface LiveBracketSlideProps {
  fields: LiveLayoutField[];
  matches: LiveMatch[];
  matchResults: Record<string, StoredMatchResult>;
  renderWidth: number;
}

export function LiveBracketSlide({
  fields,
  matches,
  matchResults,
  renderWidth,
}: LiveBracketSlideProps) {
  const parsed = useMemo(() => parseBracketSlide(fields), [fields]);
  const matchesByCode = useMemo(() => buildMatchesByCode(matches), [matches]);
  const poolQualifiers = useMemo(
    () => buildPoolQualifierMap(matches, matchResults),
    [matches, matchResults]
  );

  const renderHeight = Math.round(renderWidth / SLIDE_ASPECT);
  const consumedFeeds = useMemo(() => {
    const set = new Set<string>();
    for (const slot of parsed.matches) {
      const match = matchesByCode.get(slot.code);
      if (!match) continue;
      const feed1 = feedKeyFromTeamLabel(match.equipe1);
      const feed2 = feedKeyFromTeamLabel(match.equipe2);
      if (feed1) set.add(feed1);
      if (feed2) set.add(feed2);
    }
    return set;
  }, [parsed.matches, matchesByCode]);

  const boxLayouts = useMemo(
    () =>
      resolveMatchBoxLayouts(parsed.matches, {
        matchCodes: matches.map((match) => match.code),
      }),
    [parsed.matches, matches]
  );

  const splitMainBracket = useMemo(() => {
    const slideCodes = new Set(parsed.matches.map((slot) => slot.code));
    const allCodes = new Set(matches.map((match) => match.code));
    return inferSplitMainBracketHalf(slideCodes, allCodes) != null;
  }, [parsed.matches, matches]);

  const connectorPaths = useMemo(() => {
    const isClassementSlide =
      parsed.matches.length > 0 &&
      parsed.matches.every((slot) => /^C[\d_]+$/.test(slot.code));

    return buildBracketConnectors(
      parsed.matches,
      parsed.feeds,
      matchesByCode,
      consumedFeeds,
      boxLayouts,
      { includeFeedConnectors: !isClassementSlide }
    );
  }, [parsed.matches, parsed.feeds, matchesByCode, consumedFeeds, boxLayouts]);

  const viewportCrossPageStub = useMemo(
    () => getViewportCrossPageStub(parsed.matches, boxLayouts),
    [parsed.matches, boxLayouts]
  );

  return (
    <div
      data-bracket-slide
      data-capture-width={renderWidth}
      data-capture-height={renderHeight}
      data-crosspage-midx={
        viewportCrossPageStub ? viewportCrossPageStub.midXSlidePct : undefined
      }
      data-crosspage-dir={
        viewportCrossPageStub ? viewportCrossPageStub.direction : undefined
      }
      className="relative shrink-0 overflow-hidden bg-white"
      style={{ width: renderWidth, height: renderHeight }}
    >
      <BracketConnectors
        paths={connectorPaths}
        width={renderWidth}
        height={renderHeight}
      />

      {parsed.matches.map((slot) => {
        const match = matchesByCode.get(slot.code);
        if (!match) return null;

        const box = boxLayouts.get(slot.code);
        if (!box) return null;

        const result = matchResults[match.code];

        return (
          <TemplateMatchBox
            key={slot.code}
            match={match}
            box={box}
            team1={resolveTeamDisplay(
              match.equipe1,
              matchesByCode,
              matchResults,
              poolQualifiers
            )}
            team2={resolveTeamDisplay(
              match.equipe2,
              matchesByCode,
              matchResults,
              poolQualifiers
            )}
            score={result?.display ?? null}
            winnerSide={result?.winner ?? null}
            scaleH={renderHeight}
            placementLabel={matchPlacementLabel(match.tour)}
            splitMainBracket={splitMainBracket}
          />
        );
      })}

      {parsed.feeds
        .filter((field) => !consumedFeeds.has(field.key))
        .map((field) => (
          <FeedLabel
            key={field.key}
            field={field}
            text={resolveFeedContent(
              field.key,
              matchesByCode,
              matchResults,
              poolQualifiers
            )}
            scaleH={renderHeight}
          />
        ))}
    </div>
  );
}

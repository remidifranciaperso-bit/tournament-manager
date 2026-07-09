import { feedKeyFromTeamLabel } from "./formatBracketLabel";
import {
  childInlet,
  feedAnchor,
  parentOutlet,
  type BoxRectPct,
  type PointPct,
} from "./bracketGeometry";
import type { ParsedMatchSlot } from "./bracketSlideLayout";
import type { LiveLayoutField, LiveMatch } from "./liveTypes";

function parentCodeFromLabel(label: string): string | null {
  const feed = feedKeyFromTeamLabel(label);
  if (!feed) return null;
  return feed.replace(/^(WIN|LOSE|SECOND|THIRD)_/, "");
}

function connectorMidX(parentRight: number, childLeft: number): number {
  return parentRight + (childLeft - parentRight) * 0.5;
}

/** Traits horizontaux depuis le milieu des parents, verticaux qui se rejoignent, puis trait unique vers le milieu de l'enfant. */
function bracketPathsToChild(
  parentRects: BoxRectPct[],
  childRect: BoxRectPct
): string[] {
  if (parentRects.length === 0) return [];

  const child = childInlet(childRect);
  const outlets = parentRects.map((rect) => parentOutlet(rect));
  const midX = connectorMidX(
    Math.max(...outlets.map((point) => point.x)),
    child.x
  );

  const paths: string[] = [];

  for (const outlet of outlets) {
    paths.push(`M ${outlet.x} ${outlet.y} L ${midX} ${outlet.y}`);
  }

  const junctionYs = [...outlets.map((point) => point.y), child.y];
  const yMin = Math.min(...junctionYs);
  const yMax = Math.max(...junctionYs);

  if (yMax - yMin > 0.05) {
    paths.push(`M ${midX} ${yMin} L ${midX} ${yMax}`);
  }

  paths.push(`M ${midX} ${child.y} L ${child.x} ${child.y}`);

  return paths;
}

function feedBracketPath(from: PointPct, to: PointPct): string {
  const gap = to.x - from.x;
  if (gap <= 0.2) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  const midX = from.x + gap * 0.5;
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

export function buildBracketConnectors(
  slots: ParsedMatchSlot[],
  feeds: LiveLayoutField[],
  matchesByCode: Map<string, LiveMatch>,
  consumedFeeds: Set<string>,
  boxLayouts: Map<string, BoxRectPct>,
  options?: { includeFeedConnectors?: boolean }
): string[] {
  const includeFeedConnectors = options?.includeFeedConnectors ?? true;
  const slotByCode = new Map(slots.map((slot) => [slot.code, slot]));
  const feedByKey = new Map(feeds.map((field) => [field.key, field]));
  const paths: string[] = [];

  const parentsByChild = new Map<string, BoxRectPct[]>();
  const feedToChildLinks: Array<{ from: PointPct; to: PointPct }> = [];

  for (const slot of slots) {
    if (slot.code === "PF") continue;

    const match = matchesByCode.get(slot.code);
    if (!match) continue;

    const childRect = boxLayouts.get(slot.code);
    if (!childRect) continue;
    const childPoint = childInlet(childRect);

    const parentCodes: string[] = [];
    const p1 = parentCodeFromLabel(match.equipe1) ?? match.parents[0];
    const p2 = parentCodeFromLabel(match.equipe2) ?? match.parents[1];

    if (p1) parentCodes.push(p1);
    if (p2 && p2 !== p1) parentCodes.push(p2);

    for (const parentCode of parentCodes) {
      const parentSlot = slotByCode.get(parentCode);
      const parentRect = boxLayouts.get(parentCode);

      if (parentSlot && parentRect) {
        const list = parentsByChild.get(slot.code) ?? [];
        list.push(parentRect);
        parentsByChild.set(slot.code, list);
        continue;
      }

      const feedKey =
        parentCodeFromLabel(match.equipe1) === parentCode
          ? feedKeyFromTeamLabel(match.equipe1)
          : feedKeyFromTeamLabel(match.equipe2);
      const winKey = `WIN_${parentCode}`;
      const loseKey = `LOSE_${parentCode}`;
      const feedField =
        feedKey && !consumedFeeds.has(feedKey)
          ? feedByKey.get(feedKey)
          : feedByKey.get(winKey) ?? feedByKey.get(loseKey);

      if (feedField && includeFeedConnectors) {
        feedToChildLinks.push({
          from: feedAnchor(feedField, "left"),
          to: childPoint,
        });
      }
    }
  }

  for (const [childCode, parentRects] of parentsByChild) {
    const childRect = boxLayouts.get(childCode);
    if (!childRect) continue;
    paths.push(...bracketPathsToChild(parentRects, childRect));
  }

  for (const { from, to } of feedToChildLinks) {
    paths.push(feedBracketPath(from, to));
  }

  if (!includeFeedConnectors) {
    return paths;
  }

  for (const field of feeds) {
    if (consumedFeeds.has(field.key)) continue;

    const code = field.key.replace(/^(WIN|LOSE|SECOND|THIRD)_/, "");
    if (code === "PF") continue;

    const parentSlot = slotByCode.get(code);
    if (!parentSlot) continue;

    const parentRect = boxLayouts.get(code);
    if (!parentRect) continue;

    const from = parentOutlet(parentRect);
    const to = feedAnchor(field, "right");
    if (to.x > from.x) {
      paths.push(feedBracketPath(from, to));
    }
  }

  return paths;
}

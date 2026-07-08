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

function bracketPath(from: PointPct, to: PointPct): string {
  const gap = to.x - from.x;
  if (gap <= 0.2) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  const midX = from.x + gap * 0.5;
  return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`;
}

export function buildBracketConnectors(
  slots: ParsedMatchSlot[],
  feeds: LiveLayoutField[],
  matchesByCode: Map<string, LiveMatch>,
  consumedFeeds: Set<string>,
  boxLayouts: Map<string, BoxRectPct>
): string[] {
  const slotByCode = new Map(slots.map((s) => [s.code, s]));
  const feedByKey = new Map(feeds.map((f) => [f.key, f]));
  const paths: string[] = [];

  for (const slot of slots) {
    const match = matchesByCode.get(slot.code);
    if (!match) continue;

    const childRect = boxLayouts.get(slot.code);
    if (!childRect) continue;
    const links: Array<{ parentCode: string; team: 1 | 2 }> = [];

    const p1 = parentCodeFromLabel(match.equipe1) ?? match.parents[0];
    const p2 = parentCodeFromLabel(match.equipe2) ?? match.parents[1];

    if (p1) links.push({ parentCode: p1, team: 1 });
    if (p2 && p2 !== p1) links.push({ parentCode: p2, team: 2 });

    for (const { parentCode, team } of links) {
      const parentSlot = slotByCode.get(parentCode);
      const to = childInlet(childRect, team);

      if (parentSlot) {
        const parentRect = boxLayouts.get(parentCode);
        if (!parentRect) continue;
        const from = parentOutlet(parentRect);
        paths.push(bracketPath(from, to));
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

      if (feedField) {
        const from = feedAnchor(feedField, "left");
        paths.push(bracketPath(from, to));
      }
    }
  }

  for (const field of feeds) {
    if (consumedFeeds.has(field.key)) continue;

    const code = field.key.replace(/^(WIN|LOSE|SECOND|THIRD)_/, "");
    const parentSlot = slotByCode.get(code);
    if (!parentSlot) continue;

    const parentRect = boxLayouts.get(code);
    if (!parentRect) continue;

    const from = parentOutlet(parentRect);
    const to = feedAnchor(field, "right");
    if (to.x > from.x) {
      paths.push(bracketPath(from, to));
    }
  }

  return paths;
}

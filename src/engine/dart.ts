import type { Point } from "./types";
import { dist, lerp, unitVector } from "./curves";

export interface ComputedDart {
  legStart: Point;
  legEnd: Point;
  apex: Point;
  width: number;
}

/**
 * Generic dart solver: given the straight edge a dart interrupts (from
 * `lineFrom` toward `lineTo`), a position along it, an intake width, and a
 * target the apex should aim toward, produce the two leg points and the
 * apex. Everything is expressed relative to the (possibly user-dragged)
 * current endpoints, so a dart stays correctly anchored and proportioned
 * even after `lineFrom`/`lineTo` move.
 *
 * `legStart` sits nearer `lineFrom` (t=0 side), `legEnd` nearer `lineTo`
 * (t=1 side) — callers rely on this to stitch the dart into the boundary
 * walk in the right order.
 */
export function computeDart(opts: {
  lineFrom: Point;
  lineTo: Point;
  position: number;
  width: number;
  apexTarget: Point;
  apexRatio: number;
  minApexGap?: number;
  maxWidthFraction?: number;
}): ComputedDart {
  const { lineFrom, lineTo, position, apexTarget, apexRatio } = opts;
  const lineLen = dist(lineFrom, lineTo);
  const maxWidthFraction = opts.maxWidthFraction ?? 0.7;
  const width = Math.max(0, Math.min(opts.width, lineLen * maxWidthFraction));

  const dir = unitVector(lineFrom, lineTo);
  // Clamp the dart's position so both legs stay strictly within the edge.
  const halfT = lineLen > 0 ? width / 2 / lineLen : 0;
  const t = Math.min(1 - halfT, Math.max(halfT, position));
  const center = lerp(lineFrom, lineTo, t);

  const legStart: Point = { x: center.x - dir.x * (width / 2), y: center.y - dir.y * (width / 2) };
  const legEnd: Point = { x: center.x + dir.x * (width / 2), y: center.y + dir.y * (width / 2) };

  let apex = lerp(center, apexTarget, apexRatio);
  const minApexGap = opts.minApexGap ?? 0;
  if (minApexGap > 0) {
    const gap = dist(apex, apexTarget);
    if (gap < minApexGap) {
      const targetDist = dist(center, apexTarget);
      const safeRatio = targetDist > 0 ? Math.max(0, (targetDist - minApexGap) / targetDist) : 0;
      apex = lerp(center, apexTarget, safeRatio);
    }
  }

  return { legStart, legEnd, apex, width };
}

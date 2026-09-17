import type { Point } from "./types";

/** Distance between two points. */
export function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Unit vector from a to b (zero vector if coincident). */
export function unitVector(a: Point, b: Point): Point {
  const d = dist(a, b);
  if (d === 0) return { x: 0, y: 0 };
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

/** Rotate a vector by degrees (clockwise, since SVG y grows downward). */
export function rotateDeg(v: Point, deg: number): Point {
  const r = (deg * Math.PI) / 180;
  return {
    x: v.x * Math.cos(r) - v.y * Math.sin(r),
    y: v.x * Math.sin(r) + v.y * Math.cos(r),
  };
}

/**
 * Build a cubic Bezier control point that pulls the curve toward a target
 * "width" point, anchored a fraction of the way from `from`.
 *
 * This is the shared helper for armhole/neckline curves: rather than
 * hand-placing four coordinates per curve, each curve is defined by its two
 * endpoints plus one guide point the curve should bulge toward (e.g. the
 * across-back width point), and `reach` controls how strongly the curve is
 * pulled toward that guide relative to a straight chord.
 */
export function controlTowardGuide(
  from: Point,
  to: Point,
  guide: Point,
  reach: number,
): Point {
  const chord = lerp(from, to, 0.5);
  return {
    x: chord.x + (guide.x - chord.x) * reach,
    y: chord.y + (guide.y - chord.y) * reach,
  };
}

/**
 * Build both control points of a cubic Bezier that bulges from `from` to
 * `to` out toward a guide point (e.g. the across-back width point for an
 * armhole curve). Each endpoint's control point is pulled a fraction
 * (`reach`) of the way toward the guide, which keeps the curve tangent
 * roughly aligned with the shape it is meant to approximate.
 */
export function curveControlsTowardGuide(
  from: Point,
  to: Point,
  guide: Point,
  reach: number,
): { control1: Point; control2: Point } {
  return {
    control1: lerp(from, guide, reach),
    control2: lerp(to, guide, reach),
  };
}

/**
 * Build the two control points for a neckline-style curve: horizontal
 * tangent at `start`, vertical tangent at `end` (or vice-versa), matching
 * the classic quarter-ellipse approximation used for front/back necklines.
 */
export function neckCurveControls(
  start: Point,
  end: Point,
  reach: number,
): { control1: Point; control2: Point } {
  return {
    control1: { x: start.x + (end.x - start.x) * reach, y: start.y },
    control2: { x: end.x, y: end.y - (end.y - start.y) * reach },
  };
}

/** Evaluate a cubic Bezier at parameter t in [0,1]. */
export function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/**
 * Core geometry/data model for the pattern engine.
 *
 * A PatternPiece is a structured graph of named points ("nodes"), the edges
 * that connect them (straight lines or cubic Bezier curves), darts, and
 * annotation elements (construction lines, grainline, labels). Nothing here
 * is drawn directly — the renderer walks this data to build SVG markup, and
 * the export modules walk the same data to build standalone SVG/PDF files.
 */

export interface Point {
  x: number;
  y: number;
}

/** A named, addressable point in a pattern piece. */
export interface PatternNode extends Point {
  id: string;
  /** Human-readable role, shown in tooltips / dev tooling. */
  label?: string;
  /** Whether this node may be selected and dragged by the user. */
  editable?: boolean;
}

export type EdgeKind = "boundary" | "construction" | "grainline" | "dart";

/** A straight segment between two nodes. */
export interface LineEdge {
  type: "line";
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
}

/** A cubic Bezier segment. Control points are stored as absolute coordinates
 * (not deltas) so they can be independently addressed/edited if needed. */
export interface CurveEdge {
  type: "curve";
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  control1: Point;
  control2: Point;
}

export type Edge = LineEdge | CurveEdge;

/** A single tailoring dart: two legs converging on an apex. Rendered as a
 * notch cut into whichever boundary edge it interrupts. */
export interface Dart {
  id: string;
  label?: string;
  apex: Point;
  /** The two points on the parent boundary where the dart legs begin. */
  legStart: Point;
  legEnd: Point;
  /** Intake width at the boundary (distance between legStart/legEnd). */
  width: number;
  /** Which boundary edge this dart interrupts, by node id pair. */
  interrupts: { from: string; to: string };
}

export interface GrainLine {
  id: string;
  from: Point;
  to: Point;
}

export interface TextLabel {
  id: string;
  text: string;
  position: Point;
  /** Rotation in degrees, for labels aligned to grainline etc. */
  rotation?: number;
  size?: "sm" | "md" | "lg";
}

export type PieceId = "front" | "back";

/** A complete drafted pattern piece: everything needed to render, edit,
 * save, and export it. */
export interface PatternPiece {
  id: PieceId;
  name: string;
  nodes: Record<string, PatternNode>;
  /** Ordered boundary edges forming the closed cutting line. */
  boundary: Edge[];
  /** Non-boundary reference lines (chest line, waist guide, etc.). */
  construction: LineEdge[];
  darts: Dart[];
  grainline: GrainLine;
  labels: TextLabel[];
  /** Bounding box in pattern-space units (cm), used for fit-to-view. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface BodicePattern {
  front: PatternPiece;
  back: PatternPiece;
}

/** Per-node position overrides applied after the parametric draft, keyed by
 * piece id then node id. This is how manual drag-editing coexists with
 * measurement-driven recalculation: the draft engine computes every node
 * from scratch on every change, then overrides are re-applied on top. */
export type NodeOverrides = Partial<Record<PieceId, Record<string, Point>>>;

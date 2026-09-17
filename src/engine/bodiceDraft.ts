/**
 * The parametric bodice drafting engine.
 *
 * `draftBodice()` is the single entry point: given measurements, a drafting
 * configuration, and any user-applied node overrides, it returns a complete
 * BodicePattern (front + back PatternPiece) as structured geometry — no
 * rendering concerns live here at all.
 *
 * Every point is computed in dependency order (neck -> shoulder -> armhole
 * -> waist), and immediately after each point is computed it is passed
 * through `resolve()`, which swaps in a user override when one exists. All
 * downstream math reads the *resolved* value, so dragging a node reshapes
 * everything that depends on it — curve control points, dart legs, the
 * boundary itself — rather than leaving the underlying draft untouched.
 */

import type { DraftingConfig } from "./draftingConfig";
import { DEFAULT_DRAFTING_CONFIG } from "./draftingConfig";
import type { Measurements } from "./measurements";
import { computeDart } from "./dart";
import { neckCurveControls, curveControlsTowardGuide, unitVector, rotateDeg, lerp } from "./curves";
import type {
  BodicePattern,
  CurveEdge,
  Dart,
  Edge,
  GrainLine,
  LineEdge,
  NodeOverrides,
  PatternNode,
  PatternPiece,
  Point,
  TextLabel,
} from "./types";

interface Derived {
  bustWithEase: number;
  waistWithEase: number;
  quarterBust: number;
  quarterWaist: number;
  armholeDepth: number;
  backWidthLineY: number;
  chestWidthLineY: number;
  halfAcrossBack: number;
  halfAcrossChest: number;
  neckWidth: number;
  backNeckDrop: number;
  frontNeckDrop: number;
  frontDartWidth: number;
  backDartWidth: number;
  backShoulderDartWidth: number;
  frontSideIntake: number;
  backSideIntake: number;
}

function computeDerived(m: Measurements, c: DraftingConfig): Derived {
  const bustWithEase = m.bust + c.easeBust;
  const waistWithEase = m.waist + c.easeWaist;
  const quarterBust = bustWithEase / 4;
  const quarterWaist = waistWithEase / 4;
  const armholeDepth = quarterBust * c.scyeDepthFactor + c.scyeDepthAdd;

  const halfBust = bustWithEase / 2;
  const halfWaist = waistWithEase / 2;
  const totalReductionHalf = Math.max(0, halfBust - halfWaist);

  const acrossChest = Math.max(m.acrossBack + c.acrossChestOffset, m.acrossBack * 0.7);

  return {
    bustWithEase,
    waistWithEase,
    quarterBust,
    quarterWaist,
    armholeDepth,
    backWidthLineY: armholeDepth * c.backWidthLineRatio,
    chestWidthLineY: armholeDepth * c.chestWidthLineRatio,
    halfAcrossBack: m.acrossBack / 2,
    halfAcrossChest: acrossChest / 2,
    neckWidth: quarterBust * c.neckWidthFactor,
    backNeckDrop: quarterBust * c.neckWidthFactor * c.backNeckDropFactor,
    frontNeckDrop: quarterBust * c.neckWidthFactor * c.frontNeckDropFactor,
    frontDartWidth: totalReductionHalf * c.frontDartShare,
    backDartWidth: totalReductionHalf * c.backDartShare,
    backShoulderDartWidth: totalReductionHalf * c.backShoulderDartShare,
    frontSideIntake: (totalReductionHalf * c.sideSeamShare) / 2,
    backSideIntake: (totalReductionHalf * c.sideSeamShare) / 2,
  };
}

/** Small builder that accumulates nodes/edges for one piece while applying
 * node overrides as each point is placed. */
class PieceBuilder {
  nodes: Record<string, PatternNode> = {};
  boundary: Edge[] = [];
  construction: LineEdge[] = [];
  darts: Dart[] = [];
  private overrides: Record<string, Point>;
  private edgeCounter = 0;
  private pieceId: "front" | "back";

  constructor(pieceId: "front" | "back", overrides: NodeOverrides | undefined) {
    this.pieceId = pieceId;
    this.overrides = (overrides?.[pieceId] ?? {}) as Record<string, Point>;
  }

  /** Place a node: compute -> apply override -> store -> return resolved point. */
  place(id: string, computed: Point, opts?: { label?: string; editable?: boolean }): PatternNode {
    const override = this.overrides[id];
    const resolved: PatternNode = {
      id,
      x: override ? override.x : computed.x,
      y: override ? override.y : computed.y,
      label: opts?.label,
      editable: opts?.editable ?? false,
    };
    this.nodes[id] = resolved;
    return resolved;
  }

  /** Place a node whose coordinates are never user-editable (a pure
   * construction/guide point) — still stored so edges can reference it. */
  guide(id: string, computed: Point, label?: string): PatternNode {
    const node: PatternNode = { id, x: computed.x, y: computed.y, label, editable: false };
    this.nodes[id] = node;
    return node;
  }

  line(from: string, to: string, kind: Edge["kind"] = "boundary"): LineEdge {
    const edge: LineEdge = { type: "line", id: `${this.pieceId}-e${this.edgeCounter++}`, kind, from, to };
    return edge;
  }

  curve(from: string, to: string, control1: Point, control2: Point, kind: Edge["kind"] = "boundary"): CurveEdge {
    const edge: CurveEdge = {
      type: "curve",
      id: `${this.pieceId}-e${this.edgeCounter++}`,
      kind,
      from,
      to,
      control1,
      control2,
    };
    return edge;
  }
}

function addDartToBuilder(
  b: PieceBuilder,
  idPrefix: string,
  lineFromId: string,
  lineToId: string,
  d: ReturnType<typeof computeDart>,
  label: string,
): { legStartId: string; legEndId: string } {
  const legStartId = `${idPrefix}-legStart`;
  const legEndId = `${idPrefix}-legEnd`;
  const apexId = `${idPrefix}-apex`;
  b.guide(legStartId, d.legStart);
  b.guide(apexId, d.apex);
  b.guide(legEndId, d.legEnd);
  b.darts.push({
    id: idPrefix,
    label,
    apex: d.apex,
    legStart: d.legStart,
    legEnd: d.legEnd,
    width: d.width,
    interrupts: { from: lineFromId, to: lineToId },
  });
  return { legStartId, legEndId };
}

function boundsOf(nodes: Record<string, PatternNode>): PatternPiece["bounds"] {
  const xs = Object.values(nodes).map((n) => n.x);
  const ys = Object.values(nodes).map((n) => n.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function draftBack(m: Measurements, c: DraftingConfig, d: Derived, overrides?: NodeOverrides): PatternPiece {
  const b = new PieceBuilder("back", overrides);

  const nape = b.place("nape", { x: 0, y: 0 }, { label: "Center Back Neck" });
  const snp = b.place("backNeck", { x: d.neckWidth, y: d.backNeckDrop }, { label: "Shoulder Neck Point", editable: true });

  const backWidthGuide = b.guide("backWidthGuide", { x: d.halfAcrossBack, y: d.backWidthLineY }, "Across Back");

  const idealShoulderLen = m.shoulderWidth + d.backShoulderDartWidth;
  const shoulderDir = { x: Math.cos((c.backShoulderSlopeDeg * Math.PI) / 180), y: Math.sin((c.backShoulderSlopeDeg * Math.PI) / 180) };
  const idealSP: Point = { x: snp.x + shoulderDir.x * idealShoulderLen, y: snp.y + shoulderDir.y * idealShoulderLen };
  const sp = b.place("shoulderTip", idealSP, { label: "Shoulder Point", editable: true });

  const actualShoulderDir = unitVector(snp, sp);
  const shoulderPerp = rotateDeg(actualShoulderDir, 90);
  // Apex target/ratio are placeholders here — the real apex (which depends
  // on shoulder-blade depth, not a fraction of the shoulder line) is
  // computed below and substituted in.
  const shoulderDart = computeDart({
    lineFrom: snp,
    lineTo: sp,
    position: c.backShoulderDartPosition,
    width: d.backShoulderDartWidth,
    apexTarget: sp,
    apexRatio: 0,
    maxWidthFraction: 0.5,
  });
  const rawShoulderDartDepth =
    c.backShoulderDartBaseDepth + Math.max(0, m.backWaistLength - m.frontWaistLength) * c.backShoulderDartLengthGain;
  // Guard against unusually large back/front length differences producing a
  // dart that overruns the piece — cap it relative to the piece's own scale.
  const shoulderDartDepth = Math.min(rawShoulderDartDepth, d.quarterBust * 0.5);
  const shoulderDartMid = lerp(shoulderDart.legStart, shoulderDart.legEnd, 0.5);
  const shoulderApex = { x: shoulderDartMid.x + shoulderPerp.x * shoulderDartDepth, y: shoulderDartMid.y + shoulderPerp.y * shoulderDartDepth };
  // Boundary is walked shoulder-tip -> neck, so "legEnd" (near SP) comes first.
  const { legStartId: shLegStartId, legEndId: shLegEndId } = addDartToBuilder(
    b,
    "backShoulderDart",
    "backNeck",
    "shoulderTip",
    { ...shoulderDart, apex: shoulderApex },
    "Shoulder Dart",
  );

  const underarm = b.place("underarm", { x: d.quarterBust, y: d.armholeDepth }, { label: "Underarm Point", editable: true });

  const cbWaist = b.place("cbWaist", { x: 0, y: m.backWaistLength }, { label: "Center Back Waist" });
  const waistEdgeX = Math.max(0.5, d.quarterWaist - d.backSideIntake + d.backDartWidth);
  const ws = b.place("waistSide", { x: waistEdgeX, y: m.backWaistLength }, { label: "Side Waist Corner", editable: true });

  const waistDart = computeDart({
    lineFrom: cbWaist,
    lineTo: ws,
    position: c.backWaistDartPosition,
    width: d.backDartWidth,
    apexTarget: { x: cbWaist.x + (ws.x - cbWaist.x) * c.backWaistDartPosition, y: d.armholeDepth },
    apexRatio: c.backWaistDartApexRatio,
  });
  const { legStartId: wLegStartId, legEndId: wLegEndId } = addDartToBuilder(
    b,
    "backWaistDart",
    "cbWaist",
    "waistSide",
    waistDart,
    "Back Waist Dart",
  );

  // Construction lines.
  b.guide("chestLineEnd", { x: d.quarterBust, y: d.armholeDepth });
  b.construction.push(b.line("nape", "chestLineEnd", "construction"));
  b.guide("waistRefEnd", { x: d.quarterWaist, y: m.backWaistLength });
  b.construction.push(b.line("cbWaist", "waistRefEnd", "construction"));
  b.construction.push(b.line("nape", "backWidthGuide", "construction"));

  // Boundary walk.
  b.boundary.push(b.line("nape", "cbWaist"));
  b.boundary.push(b.line("cbWaist", wLegStartId));
  b.boundary.push(b.line(wLegStartId, "backWaistDart-apex", "dart"));
  b.boundary.push(b.line("backWaistDart-apex", wLegEndId, "dart"));
  b.boundary.push(b.line(wLegEndId, "waistSide"));
  b.boundary.push(b.line("waistSide", "underarm"));
  {
    const { control1, control2 } = curveControlsTowardGuide(underarm, sp, backWidthGuide, c.armholeCurveReach);
    b.boundary.push(b.curve("underarm", "shoulderTip", control1, control2));
  }
  b.boundary.push(b.line("shoulderTip", shLegEndId));
  b.boundary.push(b.line(shLegEndId, "backShoulderDart-apex", "dart"));
  b.boundary.push(b.line("backShoulderDart-apex", shLegStartId, "dart"));
  b.boundary.push(b.line(shLegStartId, "backNeck"));
  {
    const { control1, control2 } = neckCurveControls(snp, nape, c.necklineCurveReach);
    b.boundary.push(b.curve("backNeck", "nape", control1, control2));
  }

  const bounds = boundsOf(b.nodes);
  const grainline: GrainLine = {
    id: "back-grainline",
    from: { x: bounds.minX + (bounds.maxX - bounds.minX) * 0.72, y: bounds.minY + (bounds.maxY - bounds.minY) * c.grainlineTopInset },
    to: { x: bounds.minX + (bounds.maxX - bounds.minX) * 0.72, y: bounds.maxY - (bounds.maxY - bounds.minY) * c.grainlineBottomInset },
  };

  const labels: TextLabel[] = [
    {
      id: "back-title",
      text: "Back Bodice",
      position: { x: d.quarterBust * 0.32, y: m.backWaistLength * 0.5 },
      size: "md",
    },
    {
      id: "back-subtitle",
      text: "Cut 1 on Fold",
      position: { x: d.quarterBust * 0.32, y: m.backWaistLength * 0.5 + 3.2 },
      size: "sm",
    },
    { id: "back-cb", text: "CB — place on fold", position: { x: -1, y: m.backWaistLength / 2 }, rotation: -90, size: "sm" },
  ];

  return {
    id: "back",
    name: "Back Bodice",
    nodes: b.nodes,
    boundary: b.boundary,
    construction: b.construction,
    darts: b.darts,
    grainline,
    labels,
    bounds,
  };
}

function draftFront(m: Measurements, c: DraftingConfig, d: Derived, overrides?: NodeOverrides): PatternPiece {
  const b = new PieceBuilder("front", overrides);

  const cfTop = b.place("cfNeck", { x: 0, y: 0 }, { label: "Center Front Neck" });
  const snp = b.place("frontNeck", { x: d.neckWidth, y: d.frontNeckDrop }, { label: "Shoulder Neck Point", editable: true });

  const chestWidthGuide = b.guide("chestWidthGuide", { x: d.halfAcrossChest, y: d.chestWidthLineY }, "Across Chest");

  const shoulderDir = { x: Math.cos((c.frontShoulderSlopeDeg * Math.PI) / 180), y: Math.sin((c.frontShoulderSlopeDeg * Math.PI) / 180) };
  const idealSP: Point = { x: snp.x + shoulderDir.x * m.shoulderWidth, y: snp.y + shoulderDir.y * m.shoulderWidth };
  const sp = b.place("shoulderTip", idealSP, { label: "Shoulder Point", editable: true });

  const underarm = b.place("underarm", { x: d.quarterBust, y: d.armholeDepth }, { label: "Underarm Point", editable: true });

  const bustPoint = b.guide("bustPoint", { x: d.quarterBust * c.bustPointXFactor, y: d.armholeDepth * c.bustPointYFactor }, "Bust Point");

  const cfWaist = b.place("cfWaist", { x: 0, y: m.frontWaistLength }, { label: "Center Front Waist" });
  const waistEdgeX = Math.max(0.5, d.quarterWaist - d.frontSideIntake + d.frontDartWidth);
  const ws = b.place("waistSide", { x: waistEdgeX, y: m.frontWaistLength }, { label: "Side Waist Corner", editable: true });

  const waistDart = computeDart({
    lineFrom: cfWaist,
    lineTo: ws,
    position: c.frontWaistDartPosition,
    width: d.frontDartWidth,
    apexTarget: bustPoint,
    apexRatio: c.frontWaistDartApexRatio,
    minApexGap: c.frontDartApexGap,
  });
  const { legStartId: wLegStartId, legEndId: wLegEndId } = addDartToBuilder(
    b,
    "frontWaistDart",
    "cfWaist",
    "waistSide",
    waistDart,
    "Front Waist Dart",
  );

  // Construction lines.
  b.guide("chestLineEnd", { x: d.quarterBust, y: d.armholeDepth });
  b.construction.push(b.line("cfNeck", "chestLineEnd", "construction"));
  b.guide("waistRefEnd", { x: d.quarterWaist, y: m.frontWaistLength });
  b.construction.push(b.line("cfWaist", "waistRefEnd", "construction"));
  b.construction.push(b.line("cfNeck", "chestWidthGuide", "construction"));

  // Boundary walk.
  b.boundary.push(b.line("cfNeck", "cfWaist"));
  b.boundary.push(b.line("cfWaist", wLegStartId));
  b.boundary.push(b.line(wLegStartId, "frontWaistDart-apex", "dart"));
  b.boundary.push(b.line("frontWaistDart-apex", wLegEndId, "dart"));
  b.boundary.push(b.line(wLegEndId, "waistSide"));
  b.boundary.push(b.line("waistSide", "underarm"));
  {
    const { control1, control2 } = curveControlsTowardGuide(underarm, sp, chestWidthGuide, c.armholeCurveReach);
    b.boundary.push(b.curve("underarm", "shoulderTip", control1, control2));
  }
  b.boundary.push(b.line("shoulderTip", "frontNeck"));
  {
    const { control1, control2 } = neckCurveControls(snp, cfTop, c.necklineCurveReach);
    b.boundary.push(b.curve("frontNeck", "cfNeck", control1, control2));
  }

  const bounds = boundsOf(b.nodes);
  const grainline: GrainLine = {
    id: "front-grainline",
    from: { x: bounds.minX + (bounds.maxX - bounds.minX) * 0.6, y: bounds.minY + (bounds.maxY - bounds.minY) * c.grainlineTopInset },
    to: { x: bounds.minX + (bounds.maxX - bounds.minX) * 0.6, y: bounds.maxY - (bounds.maxY - bounds.minY) * c.grainlineBottomInset },
  };

  const labels: TextLabel[] = [
    { id: "front-title", text: "Front Bodice", position: { x: d.quarterBust * 0.28, y: m.frontWaistLength * 0.42 }, size: "md" },
    { id: "front-subtitle", text: "Cut 2", position: { x: d.quarterBust * 0.28, y: m.frontWaistLength * 0.42 + 3.2 }, size: "sm" },
    { id: "front-cf", text: "CF", position: { x: -1, y: m.frontWaistLength / 2 }, rotation: -90, size: "sm" },
  ];

  return {
    id: "front",
    name: "Front Bodice",
    nodes: b.nodes,
    boundary: b.boundary,
    construction: b.construction,
    darts: b.darts,
    grainline,
    labels,
    bounds,
  };
}

export function draftBodice(
  measurements: Measurements,
  config: DraftingConfig = DEFAULT_DRAFTING_CONFIG,
  overrides?: NodeOverrides,
): BodicePattern {
  const derived = computeDerived(measurements, config);
  return {
    front: draftFront(measurements, config, derived, overrides),
    back: draftBack(measurements, config, derived, overrides),
  };
}

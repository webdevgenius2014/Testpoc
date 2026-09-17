/**
 * Builds a fully standalone SVG document directly from pattern geometry —
 * no reference to the live React tree or DOM state of the interactive
 * workspace. This is what both the "Export SVG" and "Export PDF" actions
 * consume, so the exported file always reflects the true geometry model,
 * never a snapshot of on-screen pixels.
 */
import type { BodicePattern, PatternPiece } from "../engine/types";
import { edgePath, boundaryPath } from "../engine/patternToPath";
import { PATTERN_STYLE } from "../rendering/style";
import { computeLayout } from "../rendering/layout";
import type { Measurements } from "../engine/measurements";

const SVG_NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | undefined> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

function renderPiece(root: SVGGElement, piece: PatternPiece, offsetX: number) {
  const group = el("g", { transform: `translate(${offsetX}, 0)`, "data-piece": piece.id });

  // Construction lines first (drawn underneath the boundary).
  for (const line of piece.construction) {
    group.appendChild(
      el("path", {
        d: edgePath([line], piece.nodes),
        fill: "none",
        stroke: PATTERN_STYLE.construction.stroke,
        "stroke-width": PATTERN_STYLE.construction.width,
        "stroke-dasharray": PATTERN_STYLE.construction.dash,
      }),
    );
  }

  // Main cutting boundary (includes dart notches as real edges).
  group.appendChild(
    el("path", {
      d: boundaryPath(piece.boundary, piece.nodes),
      fill: PATTERN_STYLE.background,
      stroke: PATTERN_STYLE.boundary.stroke,
      "stroke-width": PATTERN_STYLE.boundary.width,
      "stroke-linejoin": "round",
    }),
  );

  // Dart legs are re-stroked on top in the accent color so they read
  // clearly against the boundary stroke.
  for (const dart of piece.darts) {
    const path = `M ${dart.legStart.x.toFixed(3)} ${dart.legStart.y.toFixed(3)} L ${dart.apex.x.toFixed(3)} ${dart.apex.y.toFixed(3)} L ${dart.legEnd.x.toFixed(3)} ${dart.legEnd.y.toFixed(3)}`;
    group.appendChild(
      el("path", { d: path, fill: "none", stroke: PATTERN_STYLE.dart.stroke, "stroke-width": PATTERN_STYLE.dart.width }),
    );
  }

  // Grainline with arrowheads on both ends.
  const gl = piece.grainline;
  group.appendChild(
    el("line", {
      x1: gl.from.x,
      y1: gl.from.y,
      x2: gl.to.x,
      y2: gl.to.y,
      stroke: PATTERN_STYLE.grainline.stroke,
      "stroke-width": PATTERN_STYLE.grainline.width,
      "marker-start": "url(#arrow-start)",
      "marker-end": "url(#arrow-end)",
    }),
  );

  // Labels.
  for (const label of piece.labels) {
    const t = el("text", {
      x: label.position.x,
      y: label.position.y,
      fill: PATTERN_STYLE.labelColor,
      "font-size": PATTERN_STYLE.labelSizes[label.size ?? "sm"],
      "font-family": "'Segoe UI', Helvetica, Arial, sans-serif",
      "font-weight": label.size === "md" ? "700" : "500",
      transform: label.rotation ? `rotate(${label.rotation} ${label.position.x} ${label.position.y})` : undefined,
    });
    t.textContent = label.text;
    group.appendChild(t);
  }

  // Reference dots at editable construction points (not draggable here —
  // purely informative in a static export).
  for (const node of Object.values(piece.nodes)) {
    if (!node.editable) continue;
    group.appendChild(
      el("circle", {
        cx: node.x,
        cy: node.y,
        r: PATTERN_STYLE.nodeRadius * 0.8,
        fill: "none",
        stroke: PATTERN_STYLE.nodeStroke,
        "stroke-width": 0.05,
      }),
    );
  }

  root.appendChild(group);
}

export interface StandaloneSvgOptions {
  measurements: Measurements;
  title?: string;
}

/** Rough monospace-ish width estimate (no canvas access needed at export
 * time) — just enough to make sure the header text never overruns the
 * page width the pattern pieces would otherwise dictate. */
function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.56;
}

export function buildStandaloneSvgElement(pattern: BodicePattern, opts: StandaloneSvgOptions): SVGSVGElement {
  const layout = computeLayout(pattern);
  const m = opts.measurements;

  const headerH = 18;
  const margin = 4;
  const subtitleFontSize = 1.5;
  const subtitleLines = [
    `Bust ${m.bust}cm · Waist ${m.waist}cm · Back Waist Length ${m.backWaistLength}cm`,
    `Front Waist Length ${m.frontWaistLength}cm · Shoulder ${m.shoulderWidth}cm · Across Back ${m.acrossBack}cm — 1:1 scale`,
  ];
  const widestSubtitle = Math.max(...subtitleLines.map((line) => estimateTextWidth(line, subtitleFontSize)));

  const totalW = Math.max(layout.totalWidth, widestSubtitle) + margin * 2;
  const totalH = layout.totalHeight + headerH + margin * 2;

  const svg = el("svg", {
    xmlns: SVG_NS,
    viewBox: `0 0 ${totalW} ${totalH}`,
    width: `${totalW}cm`,
    height: `${totalH}cm`,
  });

  const defs = el("defs");
  const arrowStart = el("marker", {
    id: "arrow-start",
    markerWidth: 4,
    markerHeight: 4,
    refX: 0.5,
    refY: 2,
    orient: "auto-start-reverse",
  });
  arrowStart.appendChild(el("path", { d: "M0,0 L4,2 L0,4 Z", fill: PATTERN_STYLE.grainline.stroke }));
  const arrowEnd = el("marker", {
    id: "arrow-end",
    markerWidth: 4,
    markerHeight: 4,
    refX: 0.5,
    refY: 2,
    orient: "auto-start-reverse",
  });
  arrowEnd.appendChild(el("path", { d: "M0,0 L4,2 L0,4 Z", fill: PATTERN_STYLE.grainline.stroke }));
  defs.appendChild(arrowStart);
  defs.appendChild(arrowEnd);
  svg.appendChild(defs);

  svg.appendChild(
    el("rect", { x: 0, y: 0, width: totalW, height: totalH, fill: "#ffffff" }),
  );

  const header = el("text", {
    x: margin,
    y: margin + 3,
    "font-family": "'Segoe UI', Helvetica, Arial, sans-serif",
    "font-size": 3,
    "font-weight": "700",
    fill: PATTERN_STYLE.labelColor,
  });
  header.textContent = opts.title ?? "Basic Bodice Block";
  svg.appendChild(header);

  subtitleLines.forEach((line, i) => {
    const sub = el("text", {
      x: margin,
      y: margin + 6.6 + i * (subtitleFontSize + 0.8),
      "font-family": "'Segoe UI', Helvetica, Arial, sans-serif",
      "font-size": subtitleFontSize,
      fill: "#5b6470",
    });
    sub.textContent = line;
    svg.appendChild(sub);
  });

  const contentGroup = el("g", { transform: `translate(${margin}, ${headerH + margin})` });
  renderPiece(contentGroup, pattern.front, layout.frontOffsetX);
  renderPiece(contentGroup, pattern.back, layout.backOffsetX);
  svg.appendChild(contentGroup);

  return svg;
}

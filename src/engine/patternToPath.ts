/**
 * Converts structured geometry (nodes + edges) into SVG path data. Kept
 * separate from both the draft engine and the renderer so the exact same
 * function can build the on-screen SVG and the exported standalone SVG.
 */

import type { Edge, PatternNode } from "./types";

function edgesToPath(edges: Edge[], nodes: Record<string, PatternNode>): string {
  if (edges.length === 0) return "";
  const start = nodes[edges[0].from];
  const parts: string[] = [`M ${fmt(start.x)} ${fmt(start.y)}`];
  for (const edge of edges) {
    const to = nodes[edge.to];
    if (edge.type === "line") {
      parts.push(`L ${fmt(to.x)} ${fmt(to.y)}`);
    } else {
      parts.push(
        `C ${fmt(edge.control1.x)} ${fmt(edge.control1.y)} ${fmt(edge.control2.x)} ${fmt(edge.control2.y)} ${fmt(to.x)} ${fmt(to.y)}`,
      );
    }
  }
  return parts.join(" ");
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(3) : "0";
}

export function boundaryPath(edges: Edge[], nodes: Record<string, PatternNode>): string {
  return `${edgesToPath(edges, nodes)} Z`;
}

export function edgePath(edges: Edge[], nodes: Record<string, PatternNode>): string {
  return edgesToPath(edges, nodes);
}

export function singleEdgePath(edge: Edge, nodes: Record<string, PatternNode>): string {
  return edgesToPath([edge], nodes);
}

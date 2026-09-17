/**
 * Shared visual constants for the pattern. Used by both the interactive
 * workspace renderer and the standalone export builder, so an exported file
 * always matches what was on screen.
 */
export const PATTERN_STYLE = {
  boundary: { stroke: "#1a2332", width: 0.09, fill: "none" },
  construction: { stroke: "#7a8699", width: 0.045, dash: "0.5,0.4" },
  dart: { stroke: "#c2410c", width: 0.07 },
  dartFill: "#fed7aa",
  grainline: { stroke: "#1d4ed8", width: 0.07 },
  nodeRadius: 0.42,
  nodeFill: "#ffffff",
  nodeStroke: "#1a2332",
  nodeEditableFill: "#2563eb",
  nodeSelectedFill: "#dc2626",
  guideFill: "#94a3b8",
  labelColor: "#1a2332",
  labelSizes: { sm: 1.9, md: 2.6, lg: 3.4 },
  background: "#f7f5f2",
} as const;

export const PIECE_GAP_CM = 12;

import type { BodicePattern } from "../engine/types";
import type { Measurements } from "../engine/measurements";
import { buildStandaloneSvgElement } from "./standaloneSvg";

export function exportPatternAsSvg(pattern: BodicePattern, measurements: Measurements, filename = "bodice-pattern.svg"): void {
  const svg = buildStandaloneSvgElement(pattern, { measurements });
  const serialized = new XMLSerializer().serializeToString(svg);
  const withHeader = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
  const blob = new Blob([withHeader], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

import { jsPDF } from "jspdf";
import "svg2pdf.js";
import type { BodicePattern } from "../engine/types";
import type { Measurements } from "../engine/measurements";
import { buildStandaloneSvgElement } from "./standaloneSvg";

export async function exportPatternAsPdf(
  pattern: BodicePattern,
  measurements: Measurements,
  filename = "bodice-pattern.pdf",
): Promise<void> {
  const svg = buildStandaloneSvgElement(pattern, { measurements });
  const widthCm = parseFloat(svg.getAttribute("width") ?? "0");
  const heightCm = parseFloat(svg.getAttribute("height") ?? "0");

  const orientation = widthCm >= heightCm ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "cm",
    format: [widthCm, heightCm],
  });

  // svg2pdf needs the element attached to a document to measure text/layout.
  svg.style.position = "fixed";
  svg.style.left = "-99999px";
  document.body.appendChild(svg);
  try {
    await pdf.svg(svg, { x: 0, y: 0, width: widthCm, height: heightCm });
  } finally {
    document.body.removeChild(svg);
  }

  pdf.save(filename);
}

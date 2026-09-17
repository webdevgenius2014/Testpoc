# Bodice Block Studio

Bodice Block Studio is a browser-based application for drafting a basic
bodice sewing pattern from body measurements. Measurements are converted
into a front and back pattern piece using parametric drafting rules, and
the result is rendered as precise, editable vector geometry rather than a
fixed illustration.

The pattern is backed by structured geometric data at every stage: entering
measurements recalculates the underlying nodes, curves, and darts, and
editing a point on the canvas reshapes that same underlying data. The
application is built as a focused prototype for the basic bodice block, on
an architecture intended to extend to additional measurements, drafting
rules, and garment types (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

## Capabilities

- **Parametric pattern generation** — front and back bodice pieces are
  calculated from six body measurements, including neckline, shoulder,
  armhole, side seam, and waistline.
- **Functional darts** — a front waist dart, a back waist dart, and a back
  shoulder dart, each computed from the measurements and represented as
  real notches in the cutting boundary rather than decorative shapes.
- **Construction detail** — internal guide lines (chest line, waist
  reference line, width guides), a grainline on each piece, and standard
  piece labels ("Front Bodice — Cut 2", "Back Bodice — Cut 1 on Fold").
- **Interactive SVG workspace** — pan, zoom (cursor-anchored), fit-to-screen,
  and reset-view controls for inspecting detail areas such as the neckline,
  armhole, and darts at any scale.
- **Direct point editing** — key construction points (shoulder point,
  underarm point, side waist corner, and others) can be selected and
  dragged, or edited by exact coordinate, with all connected lines, curves,
  and darts updating immediately to preserve the piece's geometry.
- **Save and restore** — the current measurements, drafting configuration,
  and any manual point adjustments can be saved and restored later, so work
  in progress is never lost.
- **Vector export** — the drafted pattern can be exported as scalable
  vector SVG or as a vector PDF, independent of the on-screen canvas.

## Supported measurements

| Measurement | Description |
|---|---|
| Bust Circumference | Full circumference at the fullest point of the bust |
| Waist Circumference | Full circumference at the natural waistline |
| Back Waist Length | Center back neck (nape) straight down to the waistline |
| Front Waist Length | Center front neck point straight down to the waistline |
| Shoulder Width | Single shoulder seam length, neck point to shoulder tip |
| Across Back | Shoulder-blade level width, armscye seam to armscye seam |

Each field has sensible minimum/maximum bounds and updates the pattern
immediately on change. The application loads with a representative set of
default measurements.

## Interactive SVG functionality

The pattern workspace is a live SVG canvas, not a static image:

- **Pan** by dragging the background; **zoom** with the scroll wheel,
  anchored under the cursor, or with the toolbar's zoom controls.
- **Fit to Screen** frames both pattern pieces in the current view; **Reset
  View** returns to the initial framing.
- **Select and drag** any highlighted construction point directly on the
  canvas. Dependent geometry — the curves and straight edges attached to
  that point, and any dart anchored to it — recalculates in real time.
- The **Pattern Details** panel shows the currently selected point's exact
  coordinates, editable as numbers, alongside a summary of current dart
  measurements and a legend for the canvas's visual styles.

## Save and restore

The **Save** action captures the current measurements, drafting
configuration, and any manual point adjustments as a single JSON document.
It is written to local browser storage and also offered as a downloadable
`.json` file. The **Load** action restores the most recently saved state
from local storage, or accepts a previously exported `.json` file, returning
the pattern to exactly the state it was saved in.

## SVG/PDF export

**Export SVG** produces a standalone, self-contained SVG file built
directly from the pattern's geometric data — cutting boundaries, darts,
construction lines, grainlines, and labels — independent of the
application's on-screen rendering.

**Export PDF** converts that same vector geometry into a PDF document,
preserving true vector paths and text rather than a rasterized image. Both
exports produce scalable vector output suitable for further
pattern-development workflows (printing at scale, import into vector or
CAD tooling, etc.).

## Technology stack

- **React** with **TypeScript**, built using **Vite**
- Native SVG rendering — no external charting/drawing library — for full
  control over the pattern's geometry and interaction behavior
- **Zustand** for application state (measurements, drafting configuration,
  manual point overrides, and the derived pattern)
- **jsPDF** with **svg2pdf.js** for vector PDF export

## Setup and run

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (typically `http://localhost:5173`).

Other available scripts:

```bash
npm run build     # type-check and produce a production build in dist/
npm run preview   # serve the production build locally
npm run lint      # run static analysis
```

## Basic usage

1. Adjust any measurement in the **Measurements** panel; the pattern
   recalculates immediately.
2. Use the **Workspace** to pan, zoom, and inspect the front and back
   pieces. Click a highlighted point to select it, then drag it — or edit
   its coordinates in the **Pattern Details** panel — to adjust the
   pattern directly.
3. Use the toolbar to **Regenerate** (redraft from the current
   measurements, discarding manual point edits), **Reset** (restore the
   default measurements), control the **view**, **Save**/**Load** the
   current state, or **Export** the pattern as SVG or PDF.

## Project structure

```
project-root/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md      # technical architecture and data model
│   └── MATH.md              # drafting formulas and assumptions
├── src/
│   ├── engine/        pattern drafting math — pure functions, no UI
│   ├── state/         application state and save/restore persistence
│   ├── rendering/     shared layout and style constants
│   ├── interaction/   pan/zoom viewport behavior
│   ├── components/    React UI (measurement panel, workspace, toolbar, info panel)
│   └── export/        standalone SVG builder and SVG/PDF export
└── package.json
```

## Further documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application architecture,
  layer separation, the geometry data model, and how the system is designed
  to extend to new measurements, drafting rules, and garment types.
- [`docs/MATH.md`](docs/MATH.md) — the drafting formulas used to convert
  measurements into pattern geometry, with a clear distinction between
  direct measurement inputs, general geometric relationships, and
  configurable drafting assumptions.

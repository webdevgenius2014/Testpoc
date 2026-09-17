# Architecture

This document describes the technical architecture of Bodice Block Studio:
how the application is layered, how the pattern is represented as data, and
how that design supports future extension. For the drafting formulas
themselves — what each number means and where it comes from — see
[`MATH.md`](MATH.md).

## 1. Layered overview

```
Measurement state
      │
      ▼
Pattern engine        (src/engine/)          — pure functions, no DOM, no React
      │  produces a BodicePattern: nodes, edges, darts, labels — plain data
      ▼
Rendering             (src/rendering/, src/components/)
      │  walks that data into <svg> elements
      ▼
Interaction            (src/interaction/, src/components/Workspace.tsx)
      │  pan/zoom and point dragging; drag edits feed back into state
      ▼
Export                (src/export/)           — walks the same data into a
                                                  standalone SVG/PDF file
```

The central design principle is **one geometry model, several independent
consumers**. The pattern engine has no knowledge of React, the DOM, or SVG
markup — it only produces a structured description of the pattern. The live
canvas renderer and the file exporter each convert that same structure into
markup independently, using shared path-building helpers. This is what
keeps an exported file consistent with what is shown on screen, and what
would let a further consumer (for example, a print-layout view) be added
without changing the pattern engine at all.

## 2. Measurement state

`src/engine/measurements.ts` defines the `Measurements` type, the default
values the application loads with, the field metadata used to generate the
measurement panel (label, unit, min/max/step, help text), and validation
that produces non-blocking warnings (for example, when the waist
measurement exceeds the bust measurement). The measurement panel UI is
generated from this field list rather than hand-coded per input, so adding
a new measurement is a single addition to this list plus its use in the
drafting formulas.

## 3. Pattern engine

The pattern engine lives entirely in `src/engine/` and exposes one entry
point:

```ts
draftBodice(measurements, config, overrides) → BodicePattern
```

- **`draftingConfig.ts`** collects every configurable drafting constant
  (ease amounts, dart distribution shares, shoulder slope, curve shape,
  and similar values) in one place, each documented with what it controls.
  This is the layer that isolates drafting-style decisions from the
  geometry code that uses them — see `MATH.md` for what each constant
  means and why it is configurable rather than derived.
- **`curves.ts`** provides generic vector helpers (`lerp`, `unitVector`,
  `rotateDeg`) and two curve-construction helpers used for every neckline
  and armhole curve in the pattern.
- **`dart.ts`** implements a single, generic dart solver used identically
  for all three darts (front waist, back waist, back shoulder). It works
  purely in terms of the edge a dart interrupts and a target its apex
  should aim toward, with no knowledge of which specific dart it is
  computing.
- **`bodiceDraft.ts`** is the orchestrator. It computes shared derived
  values once (eased circumferences, armhole depth, dart-width budget),
  then builds the front and back pieces through an internal `PieceBuilder`
  that places nodes, applies any manual overrides, and accumulates the
  edges and darts in the order the cutting boundary should be walked.
- **`patternToPath.ts`** converts an ordered edge list and its node map
  into an SVG path `d` string. It is used identically by the live `<path>`
  elements in the workspace and by the standalone export builder, which is
  what guarantees the two stay visually consistent.

The engine is deliberately **stateless and non-incremental**: every call to
`draftBodice()` recomputes the full pattern from its inputs rather than
patching a previous result. For a pattern of this size that is comfortably
fast enough to run on every keystroke, and it removes an entire category of
staleness bugs — there is no manual invalidation logic that could be
incomplete, because every point, curve, and dart is always derived fresh,
in dependency order, from the current measurements and overrides.

## 4. Geometry / data model

A `PatternPiece` (`src/engine/types.ts`) is a graph, not a drawing:

- **`nodes`** — a flat map of id → point, where each node also records a
  human-readable label and whether it is user-editable.
- **`boundary`** — an *ordered* array of edges (straight lines or cubic
  Bézier curves), each referencing two node ids. Walking this array in
  order and emitting the corresponding SVG path commands reconstructs the
  entire cutting line, including where a dart interrupts it.
- **`construction`** — the same edge shape, used for non-boundary
  reference lines (chest line, waist reference line, width guides),
  rendered in a distinct visual style.
- **`darts`** — an apex point, two leg points, and an intake width for
  each dart, referencing the same node ids that appear in the boundary.
- **`grainline`** and **`labels`** — simple geometric annotations.
- **`bounds`** — the piece's bounding box, used both for framing the
  workspace view and for sizing the exported page.

### Nodes and edges

Every coordinate that matters — a shoulder point, an underarm point, a
dart's apex — is a first-class node with a stable id, not an inline
coordinate baked into a path string. Edges reference nodes by id rather
than storing coordinates directly, so a single node update (whether from a
measurement change or a manual drag) is automatically reflected everywhere
that node is referenced.

### Bézier curves

Necklines and armholes are represented as cubic Bézier edges (two
endpoints, two control points). Both curve types are built from a small,
shared construction: a neckline curve is built to be tangent to the
center line at one end and tangent to the shoulder line at the other; an
armhole curve is built to bow outward toward a body-width guide point (the
across-back or across-chest position). Because these are ordinary
geometric constructions rather than hard-coded coordinates, the resulting
curves reshape correctly whenever their endpoints move.

### Darts

A dart is not drawn as a shape layered on top of the boundary — its two leg
points are genuine nodes spliced into the boundary's edge sequence at the
point it interrupts (for example, the waistline boundary routes through
`centerWaist → legStart → apex → legEnd → sideWaist` instead of a single
straight line). This mirrors how a real paper pattern's cutting line looks
before a dart is sewn closed, and it means a dart's notch and the boundary
it interrupts can never disagree, because they are the same data.

## 5. Pattern rendering

`src/components/PatternPieceView.tsx` is a presentational component: given
a `PatternPiece`, it renders the boundary path, construction lines, dart
legs, grainline, labels, and draggable node circles. It has no measurement
or drafting logic of its own — it is purely a function of the data model.
Shared visual constants (colors, the export stroke widths used for a
faithful printed line weight) live in `src/rendering/style.ts`; shared
piece placement (front and back side by side, with a fixed gap) lives in
`src/rendering/layout.ts` and is used by both the live workspace and the
export builder.

On screen, stroked elements use `vector-effect="non-scaling-stroke"` so
line weight reads consistently at any zoom level — the pattern's own
coordinates are never rescaled, only the viewing window onto them, which
keeps the underlying geometry precise regardless of zoom.

## 6. Interaction system

`src/interaction/useViewport.ts` owns the SVG `viewBox` as plain numeric
state: zoom (anchored at the cursor position), pan, fit-to-bounds, and
reset. `src/components/Workspace.tsx` composes this viewport state with
node-drag handling and hosts the actual `<svg>` element.

### Node dragging

A pointer-down on a draggable node circle captures the pointer and records
which node is being dragged. Subsequent pointer-move events convert the
client (mouse) coordinates into the SVG's own user-space coordinates (via
the element's screen transform matrix) and write that position into state
as a per-node override. Because the pattern engine re-resolves every node
against the current override map on each recomputation, the moved node —
and everything computed from it afterward, such as curve control points
and dart leg placement — updates in the same pass, in real time.

### Pan and zoom

Panning translates the viewBox; zooming scales it around the cursor
position (or the viewport center, for the toolbar's zoom buttons), clamped
to a sensible range. "Fit to Screen" frames both pieces' combined bounds;
"Reset View" returns to that same framing after a manual pan/zoom.

## 7. State management

`src/state/patternStore.ts` is a small Zustand store holding exactly four
pieces of state: the current `measurements`, the `config` (drafting
constants), any `overrides` (manual node adjustments), and the derived
`pattern`, recomputed synchronously whenever any of the first three change.
Zustand was chosen because the pattern needs to be read and written from
several unrelated parts of the component tree (the measurement panel, the
canvas's drag handling, the toolbar, the details panel) without prop
drilling, and its selector model means a component that only reads
`measurements` does not re-render when only `overrides` changes.

### Save and restore

`src/state/persistence.ts` implements the save/restore mechanics as plain
functions over a `SavedState` shape (`{ measurements, config, overrides,
savedAt }`): writing to `localStorage`, offering a downloadable JSON file,
and reading an uploaded JSON file back into that same shape. Restoring a
saved state calls the same `draftBodice()` entry point the rest of the
application uses, so a restored pattern is indistinguishable from one
freshly drafted from the same inputs.

## 8. Export

### SVG export

`src/export/standaloneSvg.ts` builds a detached `SVGSVGElement` directly
from a `BodicePattern` and the current measurements, using
`document.createElementNS` — it does not read from or clone the live
workspace DOM. `src/export/exportSvg.ts` serializes that element to a file.
Because this builder consumes the same geometry model as the live
renderer, the exported file reflects the pattern's true geometry rather
than a snapshot of on-screen pixels.

### PDF export

`src/export/exportPdf.ts` feeds the same standalone SVG element to
`svg2pdf.js`, which draws the underlying paths, curves, and text into a
`jsPDF` document as real vector content rather than a rasterized image.
The PDF-generation dependency is loaded via a dynamic import from the
toolbar's "Export PDF" action, so it is only fetched when a PDF is
actually requested.

## 9. Technology choices

| Concern | Choice | Rationale |
|---|---|---|
| UI framework | React with TypeScript, via Vite | A fast development loop and a component model well suited to a panel-based editing tool of this size, without requiring a larger application framework. |
| Rendering | Native SVG (JSX elements), no charting/drawing library | The pattern's geometry (Bézier construction, node-drag-to-position mapping) is implemented directly for precise control and to keep the render layer a thin, auditable function of one data model, rather than maintaining a second, parallel scene-graph representation inside a general-purpose drawing library. |
| State management | Zustand | Minimal boilerplate, selector-based re-renders, and no provider tree — appropriate for a single shared document read and written from several sibling panels. |
| PDF export | jsPDF with svg2pdf.js | Produces genuine vector PDF output from the same SVG structure used for SVG export, rather than rasterizing a canvas snapshot. |
| Build tooling | Vite | Fast local development server and a straightforward static production build. |

## 10. Why the geometry engine is independent of the UI

Every function in `src/engine/` takes plain data in and returns plain data
out — no component references, no DOM access, no dependency on how (or
whether) the result is displayed. This separation is what makes the rest of
the architecture possible:

- The **same** geometry powers the live canvas and the exported file,
  because both are built from one `BodicePattern`.
- The engine can be tested, reasoned about, or reused (for example, from a
  future non-visual context, such as a batch export tool) without any UI
  present.
- Extending the drafting logic — a new dart rule, a new construction
  curve — never requires touching rendering, interaction, persistence, or
  export code, because none of those layers make assumptions about *how*
  the geometry was produced, only about its shape (`PatternPiece`).

## 11. Supporting future extensions

The data model was written to describe "a piece is a graph of nodes,
edges, and darts," not "a bodice has a neckline and an armhole," which is
what allows the following to be added without restructuring the
application:

- **Additional measurements or drafting rules** — a new field in
  `measurements.ts`, and a new formula in `bodiceDraft.ts` or
  `draftingConfig.ts` that uses it. The measurement panel and validation
  are generated from the field list, so they require no separate UI work.
- **Size grading** — because every coordinate is already a function of the
  measurement set and the drafting configuration, proportional grading is,
  architecturally, "call `draftBodice()` again with a scaled measurement
  set." A grading rule table for non-linear adjustments (where, for
  example, the neck does not scale at the same rate as the bust) would
  plug in as an additional input to the derived-values computation,
  without changing the node/edge/dart model itself.
- **Additional garment types** (skirts, trousers, sleeves, and similar) —
  each would add its own measurement set and its own drafting module that
  produces the same `PatternPiece` shape. The renderer, interaction layer,
  save/restore mechanism, and export modules operate purely on that shape
  and would require no changes to support a new garment type.
- **Alternative drafting systems** — because every stylistic assumption is
  isolated in `draftingConfig.ts`, an alternative set of drafting rules is,
  in the simplest case, an alternative configuration; a more substantial
  alternative system would be a new drafting module alongside
  `bodiceDraft.ts` that still emits the same `PatternPiece` shape.

See `MATH.md` for the specific formulas and assumptions currently
implemented, and its "Known Limitations and Future Extensions" section for
the specific gaps this scope intentionally leaves open.

# Pattern Mathematics

This document explains how the application converts six body measurements
into the coordinates, curves, and darts that make up the front and back
bodice pieces. The corresponding implementation lives in `src/engine/`,
primarily `bodiceDraft.ts` (the formulas), `draftingConfig.ts` (the
configurable constants each formula reads), `dart.ts` (dart geometry), and
`curves.ts` (curve construction).

Every numeric value below is labeled as one of:

- **(A) Input** — supplied directly by the user as a measurement.
- **(B) Geometric relationship** — a general vector/trigonometric
  construction that follows from the shape being built, not specific to
  this prototype's styling.
- **(C) Configurable assumption** — a drafting-style choice made to fill a
  gap the six input measurements do not define. These live in
  `draftingConfig.ts` as named constants and can be changed independently
  of the rest of the application.

## Drafting model and assumptions

The application implements one configurable basic-bodice drafting model,
not a survey of professional pattern-making systems. The six captured
measurements (bust, waist, back waist length, front waist length, shoulder
width, across back) are sufficient to describe the main proportions of a
bodice block, but they do not fully determine every construction value a
real drafting system might use — for example, they say nothing about how
much ease to add, how a dart's width should be shared between the front,
back, and side seam, how steep a shoulder slope to draft, or exactly where
a curve should bow outward.

Where a value is not derivable from the supplied measurements, the
implementation uses a fixed, explicit assumption rather than an undeclared
constant buried in the geometry code. All such assumptions are collected in
`src/engine/draftingConfig.ts`, each with a short comment describing what it
controls; this document explains the reasoning behind each default. Because
they are isolated in one configuration object, they can be retuned — or
later exposed as user-facing style controls — without changing the
rendering, interaction, persistence, or export layers, and without
restructuring the geometry code that consumes them.

This scope is intentionally a basic bodice block. See "Known Limitations
and Future Extensions" at the end of this document for what is out of
scope today.

## 1. Coordinate system

The engine works in a flat, per-piece coordinate system, in centimeters:

- The front piece and the back piece are each drafted independently as
  **one half of the body** — center front or center back at `x = 0`, the
  side seam at positive `x`. This is the standard flat-pattern convention:
  a symmetric garment half is drafted once and either cut twice
  (front — "Cut 2") or cut once on a folded edge (back — "Cut 1 on Fold").
- `x` increases outward from the center line; `y` increases downward from
  the neck toward the waist.
- Both pieces share the same coordinate convention but are positioned side
  by side (with a fixed gap) only when laid out for display or export —
  see `src/rendering/layout.ts`. The drafting math itself never depends on
  that placement.

## 2. Measurement inputs (A)

| Measurement | Field | Default |
|---|---|---|
| Bust Circumference | `bust` | 63 cm |
| Waist Circumference | `waist` | 50 cm |
| Back Waist Length | `backWaistLength` | 53 cm |
| Front Waist Length | `frontWaistLength` | 43 cm |
| Shoulder Width | `shoulderWidth` | 12 cm |
| Across Back | `acrossBack` | 34 cm |

Shoulder Width is treated as a single shoulder seam length (neck point to
shoulder tip), consistent with its default value; a full shoulder-to-
shoulder span would be roughly double that figure.

## 3. Ease and the quarter-body split

```
bustWithEase   = bust  + easeBust      (C: easeBust  = 6 cm)
waistWithEase  = waist + easeWaist     (C: easeWaist = 4 cm)
quarterBust    = bustWithEase  / 4     (B)
quarterWaist   = waistWithEase / 4     (B)
```

**(B)** A garment needs to be looser than the body it is measured from, and
splitting an eased circumference into quarters so that two front-half
pieces plus one back-half piece (on the fold) reconstruct the full eased
circumference is the standard basic-block convention.

**(C)** The specific ease amounts (6 cm at the bust, 4 cm at the waist) are
a styling choice for a close-fitting woven bodice, not a value derived from
the input measurements. A looser garment would use larger values.

## 4. Scye (armhole) depth

```
armholeDepth = quarterBust * scyeDepthFactor + scyeDepthAdd     (C)
             = quarterBust * 1.0 + 4 cm
```

**(C)** The input measurements do not include a separate scye-depth
measurement, so the vertical distance from the neck down to the underarm
level is derived from the bust quarter instead. `scyeDepthFactor` and
`scyeDepthAdd` are configurable constants; a system that captured scye
depth directly as an eighth measurement would not need this derivation.

`armholeDepth` anchors the horizontal chest-line construction guide and the
top of each side seam (the underarm point).

## 5. Neckline

```
neckWidth     = quarterBust * neckWidthFactor        (C: neckWidthFactor = 0.2)
backNeckDrop  = neckWidth   * backNeckDropFactor      (C: 0.33)
frontNeckDrop = neckWidth   * frontNeckDropFactor     (C: 1.15)
```

**(C)** None of these proportions are supplied by the input measurements.
`neckWidth` is shared by both pieces (a simplifying assumption — a system
with a dedicated neck measurement could let them differ). The front neck
drop is set considerably larger than the back neck drop, matching the fact
that a front neckline sits lower than the back on a real body, but the
specific factors are style choices, not derived values.

The neckline curve itself is one cubic Bézier per piece, built with:

```
control1 = { x: start.x + (end.x - start.x) * reach, y: start.y }   (B, given a chosen reach)
control2 = { x: end.x,   y: end.y - (end.y - start.y) * reach }
```

where `start` is the shoulder/neck point and `end` is the center point
(nape or center front), and `reach` is `necklineCurveReach` (C: 0.55).

**(B)** This construction is a standard technique for approximating a
smooth curve between two points with known tangent directions: it places
the curve's tangent at the shoulder/neck point horizontal, and its tangent
at the center point vertical, using a single cubic Bézier (a
"quarter-ellipse-style" approximation, commonly used in both hand and CAD
pattern drafting because it avoids true elliptical-arc math).

**(C)** Which end gets which tangent orientation, and how strongly the
curve is pulled toward it (`reach`), are choices tuned to produce a plain,
smooth curved neckline for this prototype — not a requirement of the
technique itself.

## 6. Shoulder line and shoulder slope

```
shoulderDir = (cos(slopeDeg), sin(slopeDeg))                      (B)
shoulderTip = neckPoint + shoulderDir * length                    (B)
```

**(B)** Given a slope angle and a length, placing the shoulder tip by
simple trigonometry from the neck point is a direct geometric construction.

**(C)** The slope angles themselves — `backShoulderSlopeDeg` (20°) and
`frontShoulderSlopeDeg` (23°, slightly steeper than the back) — are
configurable style choices; the input measurements do not specify a
shoulder slope.

The front shoulder is drafted at exactly `shoulderWidth` (A, the measured
input). The back shoulder is drafted *longer*, by exactly the width of its
own dart:

```
backShoulderLength = shoulderWidth + backShoulderDartWidth        (B, given the dart width)
```

**(B)** This is a direct consequence of how the back shoulder dart is
sized (§7): drafting the back shoulder edge longer by the dart's width
means that once the dart is folded closed in construction, the back and
front shoulder seams match — a standard tailoring relationship, not an
independent assumption.

## 7. The dart budget

Dart sizing is expressed as a percentage of the circumference and length
differences between bust and waist, implemented as follows.

```
totalReductionHalf = max(0, bustWithEase/2 - waistWithEase/2)     (B)
```

**(B)** This is the total amount of fabric width that must be removed
between the bust level and the waist level, across one half of the body
(front-half plus back-half combined) — a direct consequence of the bust
and waist measurements once eased.

That total is then split four ways by configured shares:

```
frontDartWidth        = totalReductionHalf * frontDartShare          (C: 0.45)
backDartWidth         = totalReductionHalf * backDartShare           (C: 0.30)
backShoulderDartWidth = totalReductionHalf * backShoulderDartShare   (C: 0.15)
sideSeamShare (×2, split evenly between the two side seams)          (C: 0.10)
```

(These four shares sum to 1.0 in the current configuration.)

**(C)** This distribution is the single largest styling decision in the
engine, and is entirely a configurable assumption: the front dart is given
the largest share because the front of the body needs the most shaping
around the bust; a back shoulder dart is included as a companion to the
back waist dart for shaping around the shoulder blade; a small remainder is
left to the side seams so the waist is not shaped by darts alone. There is
no measurement input that mandates this specific split — a different
drafting style would use different shares.

Each piece's flat waist edge is then drawn wider than its finished waist
target by exactly its own dart's width:

```
waistEdgeX = quarterWaist - sideIntake + dartWidth      (B, given the dart width and side intake)
```

**(B)** so that folding the dart closed lands the flat pattern exactly on
the intended finished waist measurement — a direct consequence of how a
dart removes fabric, not an independent assumption.

The back shoulder dart's depth (how far its apex extends from the shoulder
line) additionally grows with how much longer the back waist length is
than the front waist length:

```
rawDepth = backShoulderDartBaseDepth + max(0, BWL − FWL) * backShoulderDartLengthGain
shoulderDartDepth = min(rawDepth, quarterBust * 0.5)
```

with `backShoulderDartBaseDepth = 5 cm` and `backShoulderDartLengthGain =
0.12` **(C)**. A larger back/front length difference implies more curvature
to absorb over the shoulder blade, so the dart is drafted deeper — this
directly answers the requirement that dart sizing reflect "length
differences," but the specific base depth and gain factor are configurable
style choices. The `quarterBust * 0.5` clamp **(C)** is a safety bound: it
keeps the dart from extending an unreasonable distance into the piece for
measurement combinations with an unusually large back/front length gap,
rather than assuming input measurements will always be typical.

## 8. Dart geometry: legs, apex, and position

A single generic solver (`computeDart` in `dart.ts`) computes every dart —
front waist, back waist, and back shoulder — from four inputs: the edge it
interrupts, a position along that edge, an intake width, and a point its
apex should aim toward.

```
direction   = unit vector from the edge's start point to its end point   (B)
center      = point at `position` along the edge, using that direction   (B)
legStart    = center − direction * (width / 2)                            (B)
legEnd      = center + direction * (width / 2)                            (B)
apex        = center + (apexTarget − center) * apexRatio                  (B, given apexRatio)
```

**(B)** All of the above is direct vector geometry once the inputs
(position, width, apex target, apex ratio) are chosen — the leg points are
placed symmetrically around the center point using the edge's own
direction (not assumed to be horizontal or vertical), which is what keeps a
dart correctly angled even if the nodes at either end of its edge are later
moved.

**(C)** The specific inputs each dart is given are configurable choices:

- **Position along the edge** — `frontWaistDartPosition` (0.55),
  `backWaistDartPosition` (0.45), `backShoulderDartPosition` (0.4).
- **Apex target** — the front waist dart aims toward a bust point, derived
  as `(quarterBust * bustPointXFactor, armholeDepth * bustPointYFactor)`
  (C: 0.86, 0.98) since bust-point location is not a captured measurement;
  the back waist dart aims toward a point on the chest/armhole-depth line
  directly above its own position; the back shoulder dart aims along the
  perpendicular of the (possibly redrawn) shoulder line, by the depth
  described in §7.
- **Apex ratio** — how far toward that target the apex actually reaches:
  `frontWaistDartApexRatio` (0.9), `backWaistDartApexRatio` (0.75).

For the front waist dart specifically, the apex is also kept at least
`frontDartApexGap` (C: 2.5 cm) away from the bust point itself, even if
that means reducing the effective apex ratio for a particular measurement
set. **(B)** A dart that terminates exactly on the body's high point
produces a visible pucker in real fabric, so stopping short of it is a
direct, physically motivated adjustment; the specific 2.5 cm gap is a
configurable choice **(C)**.

## 9. Armhole curve

Each armhole is a single cubic Bézier from the shoulder point to the
underarm point, with both control points pulled toward a shared guide
point:

```
control1 = lerp(shoulderPoint, guide, reach)     (B, given reach and guide)
control2 = lerp(underarmPoint, guide, reach)
```

using `armholeCurveReach` (C: 0.55) and a guide point derived from the
across-back measurement (for the back piece) or a derived across-chest
value (for the front piece, since across-chest is not a captured
measurement: `acrossChest = acrossBack + acrossChestOffset`, C: −2 cm).

**(B)** Pulling both control points toward one shared guide point is a
straightforward way to make a curve bow outward through a target width —
here, the across-back/across-chest position — using a single Bézier
segment.

**(C)** This is a simplified, single-guide-point construction, chosen to
stay fully parametric using only the measurements captured by this
prototype. It is not equivalent to the multi-point armhole templates used
in more detailed professional drafting systems, which typically place
several intermediate construction points derived from additional body
measurements.

## 10. How a measurement change propagates

The engine recomputes every node for both pieces on every call — there is
no incremental patching. Changing "Bust Circumference," for example,
changes `quarterBust`, which changes `armholeDepth`, `neckWidth`, every
dart width, the underarm point, the guide points the armhole curves reach
toward, and the grainline position, all within one synchronous pass. This
is why the displayed pattern updates immediately and consistently on every
measurement edit, rather than requiring a separate recalculation step.

## 11. How a dragged node propagates

Manual point editing uses the same recomputation, not a separate code
path. Every node is placed through one internal helper that checks for a
user-supplied override immediately after computing that node's default
position; everything computed afterward — curve control points, dart leg
placement, dependent points — reads that possibly-overridden value. So,
for example, dragging the shoulder point changes the direction and length
used to place the back shoulder dart's legs and the armhole curve's control
points in that same pass, because those are computed from the shoulder
point's current (possibly overridden) position, not from a value captured
before the drag.

## Known limitations and future extensions

This prototype is intentionally scoped to a single basic bodice block
drafted from six measurements, using one configurable set of drafting
assumptions. It does not represent every professional pattern-making
methodology, and several refinements are out of scope for the current
implementation:

- **Bust-point separation** is not a captured measurement; bust-point
  location is currently derived as a proportion of bust width and armhole
  depth (§8) rather than measured directly.
- **Additional body measurements** — such as a direct scye depth,
  across-chest, or neck measurement — would let several currently derived
  values (§4, §5, §9) be replaced with direct inputs.
- **More detailed armhole construction** — a multi-point armhole template
  (as used in several professional drafting systems) would replace the
  single-guide-point curve described in §9.
- **Alternative drafting systems** — the specific ease amounts, dart
  distribution, shoulder slope, and curve proportions described throughout
  this document represent one drafting style. Because they are isolated in
  `draftingConfig.ts`, an alternative style can be introduced as a
  different configuration, or as an alternative drafting module, without
  changing the rendering, interaction, persistence, or export layers.
- **Advanced body-shape adjustments** (posture, cup size, asymmetry, and
  similar refinements) are not modeled.
- **Size grading** — proportional grading (redrafting at a scaled
  measurement set) is already possible using the existing engine; a
  grading rule table for non-proportional adjustments (where different
  parts of the body scale at different rates) is not yet implemented.
- **Additional garment types** (skirts, trousers, sleeves, jackets, and
  similar) would each require their own measurement set and drafting
  formulas, following the same `PatternPiece` data model this bodice
  implementation already uses — see `docs/ARCHITECTURE.md` for how that
  extension point is structured.

None of these extensions require restructuring the rendering, interaction,
persistence, or export layers described in `docs/ARCHITECTURE.md`, since
those layers operate on the same general pattern data model regardless of
which drafting formulas produced it.

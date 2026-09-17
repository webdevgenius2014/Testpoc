/**
 * Drafting configuration: every constant here is a drafting-system CHOICE,
 * not a derived fact and not an industry-mandated rule. The specification
 * deliberately leaves several formulas undefined (exact ease, exact dart
 * split, exact shoulder slope, etc.); rather than burying magic numbers
 * throughout bodiceDraft.ts, every such assumption is named and collected
 * in this one module so it can be retuned or exposed as a UI control later
 * without touching the geometry code.
 *
 * See docs/MATH.md for the reasoning behind each default.
 */

export interface DraftingConfig {
  /** Circumference ease added before quartering the bust/waist. */
  easeBust: number;
  easeWaist: number;

  /** Scye (armhole) depth = quarterBust * scyeDepthFactor + scyeDepthAdd. */
  scyeDepthFactor: number;
  scyeDepthAdd: number;

  /** Height (fraction of scye depth) at which the across-back/across-chest
   * width line sits, measured down from the neck. */
  backWidthLineRatio: number;
  chestWidthLineRatio: number;

  /** Across-chest isn't a captured measurement, so it is derived from
   * across-back with a fixed offset (front is typically narrower). */
  acrossChestOffset: number;

  /** Neck width as a fraction of quarterBust, applied to both pieces. */
  neckWidthFactor: number;
  /** Back neck drop, as a fraction of back neck width. */
  backNeckDropFactor: number;
  /** Front neck drop, as a fraction of front neck width. */
  frontNeckDropFactor: number;

  /** Shoulder slope, in degrees below horizontal, each piece. */
  backShoulderSlopeDeg: number;
  frontShoulderSlopeDeg: number;

  /** How the bust/waist circumference difference (per half-body) is split
   * across the four waist-shaping mechanisms. Must sum to 1. */
  frontDartShare: number;
  backDartShare: number;
  backShoulderDartShare: number;
  sideSeamShare: number;

  /** Bust point location, as a fraction of (front width, scye depth). */
  bustPointXFactor: number;
  bustPointYFactor: number;
  /** Front dart apex stops short of the bust point by this many cm. */
  frontDartApexGap: number;

  /** Back shoulder dart placement along the shoulder seam (0 = neck end,
   * 1 = shoulder tip) and its depth into the piece. */
  backShoulderDartPosition: number;
  backShoulderDartBaseDepth: number;
  /** Extra shoulder-dart depth per cm that back waist length exceeds front
   * waist length (captures shoulder-blade curvature). */
  backShoulderDartLengthGain: number;

  /** Waist dart apex height, as a fraction of the distance from the waist
   * line up to the scye depth line. */
  frontWaistDartApexRatio: number;
  backWaistDartApexRatio: number;

  /** Horizontal position of each waist dart, as a fraction of that piece's
   * half-width at the waist. */
  frontWaistDartPosition: number;
  backWaistDartPosition: number;

  /** Bezier control point "reach" for armhole curves, as a fraction of the
   * straight-line distance the curve spans. */
  armholeCurveReach: number;
  /** Neckline curve control point reach, as a fraction of neck width. */
  necklineCurveReach: number;

  /** Grainline placement, as a fraction of the piece width, and vertical
   * inset as a fraction of piece height. */
  grainlineXRatio: number;
  grainlineTopInset: number;
  grainlineBottomInset: number;
}

export const DEFAULT_DRAFTING_CONFIG: DraftingConfig = {
  easeBust: 6,
  easeWaist: 4,

  scyeDepthFactor: 1.0,
  scyeDepthAdd: 4,

  backWidthLineRatio: 0.5,
  chestWidthLineRatio: 0.45,
  acrossChestOffset: -2,

  neckWidthFactor: 0.2,
  backNeckDropFactor: 0.33,
  frontNeckDropFactor: 1.15,

  backShoulderSlopeDeg: 20,
  frontShoulderSlopeDeg: 23,

  frontDartShare: 0.45,
  backDartShare: 0.3,
  backShoulderDartShare: 0.15,
  sideSeamShare: 0.1,

  bustPointXFactor: 0.86,
  bustPointYFactor: 0.98,
  frontDartApexGap: 2.5,

  backShoulderDartPosition: 0.4,
  backShoulderDartBaseDepth: 5,
  backShoulderDartLengthGain: 0.12,

  frontWaistDartApexRatio: 0.9,
  backWaistDartApexRatio: 0.75,

  frontWaistDartPosition: 0.55,
  backWaistDartPosition: 0.45,

  armholeCurveReach: 0.55,
  necklineCurveReach: 0.55,

  grainlineXRatio: 0.5,
  grainlineTopInset: 0.08,
  grainlineBottomInset: 0.05,
};

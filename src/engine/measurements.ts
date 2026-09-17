/**
 * Measurement input model: field definitions, default (test) values,
 * and validation bounds. This is intentionally decoupled from the drafting
 * math in bodiceDraft.ts so the input surface can grow (grading, new
 * garment types) without touching the UI.
 */

export interface Measurements {
  bust: number;
  waist: number;
  backWaistLength: number;
  frontWaistLength: number;
  shoulderWidth: number;
  acrossBack: number;
}

export interface MeasurementField {
  key: keyof Measurements;
  label: string;
  unit: "cm";
  min: number;
  max: number;
  step: number;
  help: string;
}

/** Test values from the assessment specification. */
export const DEFAULT_MEASUREMENTS: Measurements = {
  bust: 63,
  waist: 50,
  backWaistLength: 53,
  frontWaistLength: 43,
  shoulderWidth: 12,
  acrossBack: 34,
};

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  {
    key: "bust",
    label: "Bust Circumference",
    unit: "cm",
    min: 40,
    max: 160,
    step: 0.5,
    help: "Full circumference at the fullest point of the bust.",
  },
  {
    key: "waist",
    label: "Waist Circumference",
    unit: "cm",
    min: 30,
    max: 150,
    step: 0.5,
    help: "Full circumference at the natural waistline.",
  },
  {
    key: "backWaistLength",
    label: "Back Waist Length",
    unit: "cm",
    min: 25,
    max: 60,
    step: 0.5,
    help: "Nape (center back neck) straight down to the waistline.",
  },
  {
    key: "frontWaistLength",
    label: "Front Waist Length",
    unit: "cm",
    min: 20,
    max: 55,
    step: 0.5,
    help: "Center front neck point straight down to the waistline.",
  },
  {
    key: "shoulderWidth",
    label: "Shoulder Width",
    unit: "cm",
    min: 6,
    max: 20,
    step: 0.25,
    help: "Single shoulder seam length, neck point to shoulder tip.",
  },
  {
    key: "acrossBack",
    label: "Across Back",
    unit: "cm",
    min: 20,
    max: 55,
    step: 0.5,
    help: "Shoulder-blade level width, armscye seam to armscye seam.",
  },
];

export function clampMeasurement(key: keyof Measurements, value: number): number {
  const field = MEASUREMENT_FIELDS.find((f) => f.key === key);
  if (!field) return value;
  if (Number.isNaN(value)) return field.min;
  return Math.min(field.max, Math.max(field.min, value));
}

export function validateMeasurements(m: Measurements): string[] {
  const warnings: string[] = [];
  if (m.waist > m.bust) {
    warnings.push("Waist is larger than bust — waist darts will be omitted rather than negative.");
  }
  if (m.backWaistLength < m.frontWaistLength) {
    warnings.push("Back waist length is shorter than front waist length, which is unusual.");
  }
  return warnings;
}

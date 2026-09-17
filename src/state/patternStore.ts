/**
 * Application state store. This is the single place where measurement
 * inputs, drafting configuration, and manual node-position overrides are
 * combined into the current BodicePattern — every UI surface (measurement
 * panel, workspace, toolbar) reads from and writes to this store so they
 * stay in sync without prop-drilling.
 */

import { create } from "zustand";
import type { BodicePattern, NodeOverrides, PieceId, Point } from "../engine/types";
import { draftBodice } from "../engine/bodiceDraft";
import { DEFAULT_DRAFTING_CONFIG, type DraftingConfig } from "../engine/draftingConfig";
import { DEFAULT_MEASUREMENTS, clampMeasurement, type Measurements } from "../engine/measurements";

export interface SavedState {
  version: 1;
  savedAt: string;
  measurements: Measurements;
  config: DraftingConfig;
  overrides: NodeOverrides;
}

interface PatternStoreState {
  measurements: Measurements;
  config: DraftingConfig;
  overrides: NodeOverrides;
  pattern: BodicePattern;
  selectedNode: { piece: PieceId; nodeId: string } | null;
  lastSavedAt: string | null;

  setMeasurement: (key: keyof Measurements, value: number) => void;
  setMeasurements: (m: Measurements) => void;
  moveNode: (piece: PieceId, nodeId: string, point: Point) => void;
  selectNode: (selection: { piece: PieceId; nodeId: string } | null) => void;
  regenerateFromMeasurements: () => void;
  resetPattern: () => void;
  buildSaveState: () => SavedState;
  restoreState: (state: SavedState) => void;
}

function recompute(measurements: Measurements, config: DraftingConfig, overrides: NodeOverrides): BodicePattern {
  return draftBodice(measurements, config, overrides);
}

export const usePatternStore = create<PatternStoreState>((set, get) => ({
  measurements: DEFAULT_MEASUREMENTS,
  config: DEFAULT_DRAFTING_CONFIG,
  overrides: {},
  pattern: recompute(DEFAULT_MEASUREMENTS, DEFAULT_DRAFTING_CONFIG, {}),
  selectedNode: null,
  lastSavedAt: null,

  setMeasurement: (key, value) => {
    const clamped = clampMeasurement(key, value);
    const measurements = { ...get().measurements, [key]: clamped };
    set({ measurements, pattern: recompute(measurements, get().config, get().overrides) });
  },

  setMeasurements: (measurements) => {
    set({ measurements, pattern: recompute(measurements, get().config, get().overrides) });
  },

  moveNode: (piece, nodeId, point) => {
    const overrides: NodeOverrides = {
      ...get().overrides,
      [piece]: { ...(get().overrides[piece] ?? {}), [nodeId]: point },
    };
    set({ overrides, pattern: recompute(get().measurements, get().config, overrides) });
  },

  selectNode: (selection) => set({ selectedNode: selection }),

  regenerateFromMeasurements: () => {
    set({
      overrides: {},
      selectedNode: null,
      pattern: recompute(get().measurements, get().config, {}),
    });
  },

  resetPattern: () => {
    set({
      measurements: DEFAULT_MEASUREMENTS,
      overrides: {},
      selectedNode: null,
      pattern: recompute(DEFAULT_MEASUREMENTS, get().config, {}),
    });
  },

  buildSaveState: () => ({
    version: 1,
    savedAt: new Date().toISOString(),
    measurements: get().measurements,
    config: get().config,
    overrides: get().overrides,
  }),

  restoreState: (state) => {
    const pattern = recompute(state.measurements, state.config, state.overrides);
    set({
      measurements: state.measurements,
      config: state.config,
      overrides: state.overrides,
      pattern,
      selectedNode: null,
      lastSavedAt: state.savedAt,
    });
  },
}));

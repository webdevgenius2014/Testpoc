/**
 * Shared workspace layout: where the front and back pieces sit relative to
 * each other. Used by both the live interactive canvas and the standalone
 * export builder so the two always agree on placement.
 */
import type { BodicePattern } from "../engine/types";
import { PIECE_GAP_CM } from "./style";

export interface PatternLayout {
  frontOffsetX: number;
  backOffsetX: number;
  totalWidth: number;
  totalHeight: number;
  minY: number;
}

export function computeLayout(pattern: BodicePattern): PatternLayout {
  const frontW = pattern.front.bounds.maxX - pattern.front.bounds.minX;
  const backW = pattern.back.bounds.maxX - pattern.back.bounds.minX;
  const minY = Math.min(pattern.front.bounds.minY, pattern.back.bounds.minY);
  const maxY = Math.max(pattern.front.bounds.maxY, pattern.back.bounds.maxY);

  const frontOffsetX = -pattern.front.bounds.minX;
  const backOffsetX = frontW + PIECE_GAP_CM - pattern.back.bounds.minX;

  return {
    frontOffsetX,
    backOffsetX,
    totalWidth: frontW + backW + PIECE_GAP_CM,
    totalHeight: maxY - minY,
    minY,
  };
}

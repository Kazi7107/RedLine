/**
 * Used-vehicle depreciation curve.
 *
 * Annual loss of value by vehicle age, drawn from typical used-market curves
 * (fast early decline that flattens out). Brand and powertrain modifiers reflect
 * historically stronger/weaker resale. Applied to the *purchase price*, so a
 * buyer who overpays sees that loss show up as depreciation.
 */
import type { Powertrain } from "../types";
import { HIGH_RETENTION_MAKES, LOW_RETENTION_MAKES } from "./segments";

export function annualDepreciationRate(age: number): number {
  if (age < 1) return 0.2;
  if (age < 3) return 0.15;
  if (age < 6) return 0.12;
  if (age < 10) return 0.09;
  return 0.06;
}

export function brandModifier(make: string): number {
  if (HIGH_RETENTION_MAKES.has(make)) return 0.82;
  if (LOW_RETENTION_MAKES.has(make)) return 1.2;
  return 1.0;
}

export const POWERTRAIN_MODIFIER: Record<Powertrain, number> = {
  gas: 1.0,
  diesel: 0.95,
  hybrid: 0.9,
  phev: 1.1,
  ev: 1.2,
};

/** Extra loss for above-average mileage (per 10k miles/yr above 12k). */
export const HIGH_MILEAGE_PENALTY_PER_10K = 0.01;
/** Cars rarely sell below this fraction of what was paid in 5 years for a running vehicle. */
export const MIN_RESIDUAL_FRACTION = 0.15;

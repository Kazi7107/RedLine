/**
 * Annual auto insurance premium estimate for Washington drivers.
 *
 * Basis: published average full-coverage premiums for WA (~$1,700–$2,000/yr in
 * 2025–2026 consumer surveys) and AAA "Your Driving Costs" category ratios.
 * These multipliers are coarse and meant for comparing cars, not quoting a policy.
 */
import type { Coverage, DriverAgeBand } from "../types";
import type { VehicleSegment } from "./segments";

export const WA_BASE_FULL_COVERAGE = 1850;

export const SEGMENT_FACTOR: Record<VehicleSegment, number> = {
  compact: 0.92,
  midsize: 1.0,
  large: 1.05,
  sports: 1.35,
  luxury: 1.3,
  suv: 1.0,
  pickup: 1.02,
  minivan: 0.9,
  ev: 1.15,
};

export const AGE_FACTOR: Record<DriverAgeBand, number> = {
  under25: 1.7,
  "25to64": 1.0,
  "65plus": 1.08,
};

/** Liability-only costs a fraction of full coverage and doesn't fall with car value. */
export const COVERAGE_FACTOR: Record<Coverage, number> = { full: 1.0, liability: 0.42 };

/** Collision/comprehensive shrink as the car ages; applied per year of vehicle age past 3. */
export const FULL_COVERAGE_AGE_DECLINE = 0.025;
export const FULL_COVERAGE_FLOOR = 0.7;

/** Annual premium inflation (insurance has outpaced CPI recently). */
export const PREMIUM_INFLATION = 0.04;

/**
 * Maintenance + repair cost per mile.
 *
 * Basis: AAA "Your Driving Costs" (maintenance, repair & tires ≈ 9–11¢/mile for
 * newer vehicles), scaled up with age because AAA's figures assume a new car,
 * and used cars leave warranty coverage. EVs have fewer wear items.
 */
import type { VehicleSegment } from "./segments";

/** Cents per mile for a vehicle under ~3 years old. */
export const BASE_CENTS_PER_MILE: Record<VehicleSegment, number> = {
  compact: 9.0,
  midsize: 9.8,
  large: 10.5,
  sports: 12.0,
  luxury: 13.5,
  suv: 10.6,
  pickup: 11.0,
  minivan: 10.2,
  ev: 7.0,
};

/** Multiplier by vehicle age (years) — warranty expiry and wear items. */
export function ageMultiplier(age: number): number {
  if (age <= 3) return 1.0;
  if (age <= 5) return 1.15;
  if (age <= 8) return 1.35;
  if (age <= 11) return 1.55;
  return 1.75;
}

/** Extra multiplier for very high mileage (odometer at start of the year). */
export function mileageMultiplier(odometer: number): number {
  if (odometer < 60_000) return 1.0;
  if (odometer < 100_000) return 1.05;
  if (odometer < 150_000) return 1.15;
  return 1.25;
}

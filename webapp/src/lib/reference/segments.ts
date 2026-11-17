/**
 * Maps EPA vehicle class + make to a cost segment used by the reference tables.
 */
import type { VehicleSpec } from "../types";

export type VehicleSegment = "compact" | "midsize" | "large" | "sports" | "luxury" | "suv" | "pickup" | "minivan" | "ev";

export const LUXURY_MAKES = new Set([
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Cadillac", "Genesis", "Infiniti", "Jaguar",
  "Land Rover", "Lexus", "Lincoln", "Maserati", "Mercedes-Benz", "Porsche", "Rolls-Royce", "Volvo", "Lucid",
]);

/** Brands with historically strong resale (slower depreciation). */
export const HIGH_RETENTION_MAKES = new Set(["Toyota", "Honda", "Subaru", "Lexus", "Mazda", "Porsche"]);

/** Brands with historically weak resale (faster depreciation). */
export const LOW_RETENTION_MAKES = new Set([
  "Maserati", "Jaguar", "Land Rover", "Alfa Romeo", "BMW", "Mercedes-Benz", "Infiniti", "Lincoln", "Cadillac", "Fiat", "Mitsubishi",
]);

export function segmentFor(v: Pick<VehicleSpec, "vehicleClass" | "make" | "powertrain">): VehicleSegment {
  const c = v.vehicleClass.toLowerCase();
  if (v.powertrain === "ev") return "ev";
  if (c.includes("two seater") || c.includes("minicompact")) return "sports";
  if (LUXURY_MAKES.has(v.make)) return "luxury";
  if (c.includes("pickup")) return "pickup";
  if (c.includes("minivan")) return "minivan";
  if (c.includes("sport utility") || c.includes("special purpose") || c.includes("van")) return "suv";
  if (c.includes("large")) return "large";
  if (c.includes("midsize")) return "midsize";
  return "compact";
}

export const isLightTruck = (vehicleClass: string) => /pickup|sport utility|van|special purpose/i.test(vehicleClass);

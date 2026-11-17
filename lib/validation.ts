/** Field validation shared by the add-car form (client) and /api/estimate (server). */
import { LIMITS } from "./share";

export function isWashingtonZip(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) return false;
  const n = Number(zip);
  return n >= 98001 && n <= 99403;
}

export function zipError(zip: string): string | null {
  if (!zip) return "Enter the ZIP where you'll register the car.";
  if (!/^\d{5}$/.test(zip)) return "ZIP codes are 5 digits.";
  if (!isWashingtonZip(zip)) return "Redline only covers Washington for now. Try a WA ZIP (98001 to 99403).";
  return null;
}

export function mileageError(n: number | null): string | null {
  if (n === null) return "Enter the odometer reading from the listing.";
  if (n > LIMITS.mileage.max) return "That's more miles than we can estimate. Double-check the listing.";
  return null;
}

export function priceError(n: number | null): string | null {
  if (n === null) return "Enter the asking price.";
  if (n < LIMITS.price.min) return "That price looks too low. Enter the full asking price.";
  if (n > LIMITS.price.max) return "That's above what we can estimate. Double-check the price.";
  return null;
}

export function annualMilesError(n: number | null): string | null {
  if (n === null) return "Enter how far you drive in a year. Most people drive about 12,000 miles.";
  if (n < LIMITS.annualMiles.min || n > LIMITS.annualMiles.max) return "Pick something between 1,000 and 60,000 miles.";
  return null;
}

/** VINs are 17 characters and never use I, O or Q. */
export function vinError(vin: string): string | null {
  const v = vin.trim().toUpperCase();
  if (!v) return null;
  if (v.length !== 17) return `VINs are 17 characters. This one has ${v.length}.`;
  if (/[IOQ]/.test(v)) return "VINs never use the letters I, O or Q. Check for a 1 or 0.";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) return "VINs only use letters and numbers.";
  return null;
}

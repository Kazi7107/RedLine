/**
 * A comparison lives entirely in the URL so it can be shared:
 *
 *   /compare?cars=2016-toyota-corolla-le.74200.14200~2015-ford-focus-se.81500.8900&zip=98201&miles=12000
 *
 * Each car is `<key>.<mileage>.<price>`. The key is either a trim key
 * (2016-toyota-corolla-le) or a model key (2016-toyota-corolla) when the
 * buyer picked "Not sure" for trim. Keys are slugs, so they never contain
 * `.` or `~`.
 */

export const MAX_CARS = 3;
export const DEFAULT_ANNUAL_MILES = 12000;
export const LIMITS = {
  mileage: { min: 0, max: 400000 },
  price: { min: 500, max: 250000 },
  annualMiles: { min: 1000, max: 60000 },
} as const;

export interface CarEntry {
  key: string;
  mileage: number;
  price: number;
}

export interface Comparison {
  cars: CarEntry[];
  zip: string;
  annualMiles: number;
}

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ZIP_RE = /^\d{5}$/;

const inRange = (n: number, { min, max }: { min: number; max: number }) =>
  Number.isInteger(n) && n >= min && n <= max;

export function isValidKey(key: string): boolean {
  return key.length <= 80 && KEY_RE.test(key);
}

export function encodeCar(car: CarEntry): string {
  return `${car.key}.${Math.round(car.mileage)}.${Math.round(car.price)}`;
}

export function decodeCar(token: string): CarEntry | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [key, m, p] = parts;
  if (!isValidKey(key) || !/^\d+$/.test(m) || !/^\d+$/.test(p)) return null;
  const mileage = Number(m);
  const price = Number(p);
  if (!inRange(mileage, LIMITS.mileage) || !inRange(price, LIMITS.price)) return null;
  return { key, mileage, price };
}

/** Query string (no leading `?`). Order is stable so the same comparison gives the same link. */
export function encodeComparison(c: Comparison): string {
  const params = new URLSearchParams();
  params.set("cars", c.cars.slice(0, MAX_CARS).map(encodeCar).join("~"));
  params.set("zip", c.zip);
  if (c.annualMiles !== DEFAULT_ANNUAL_MILES) params.set("miles", String(Math.round(c.annualMiles)));
  // URLSearchParams escapes `~`; it's URL-safe, so put it back for a readable link.
  return params.toString().replace(/%7E/gi, "~");
}

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(src: ParamSource, name: string): string | undefined {
  if (src instanceof URLSearchParams) return src.get(name) ?? undefined;
  const v = src[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Lenient decode: bad car tokens are dropped rather than failing the whole link,
 * so a half-mangled link pasted into a group chat still shows what it can.
 */
export function decodeComparison(src: ParamSource): Comparison {
  const carsRaw = read(src, "cars") ?? "";
  const cars = carsRaw
    .split("~")
    .filter(Boolean)
    .map(decodeCar)
    .filter((c): c is CarEntry => c !== null)
    .slice(0, MAX_CARS);
  const zipRaw = read(src, "zip") ?? "";
  const milesRaw = Number(read(src, "miles"));
  return {
    cars,
    zip: ZIP_RE.test(zipRaw) ? zipRaw : "",
    annualMiles: inRange(milesRaw, LIMITS.annualMiles) ? milesRaw : DEFAULT_ANNUAL_MILES,
  };
}

export function comparisonPath(c: Comparison): string {
  return `/compare?${encodeComparison(c)}`;
}

/** Link to one car's detail page, carrying the same inputs. */
export function detailPath(car: CarEntry, zip: string, annualMiles: number): string {
  const params = new URLSearchParams({ mileage: String(car.mileage), price: String(car.price), zip });
  if (annualMiles !== DEFAULT_ANNUAL_MILES) params.set("miles", String(annualMiles));
  return `/car/${car.key}?${params.toString()}`;
}

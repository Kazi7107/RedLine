/**
 * Reference data: the curated catalog and the facts no free API provides
 * (vehicle class, resale factor, units sold, risk flags, typical listings).
 * Both DataSources read it. The mock source uses it for everything; the live
 * source uses it for these facts and as the fallback when an API is down.
 *
 * TODO(db): this mirrors the vehicle_models / vehicle_trims / risk_flags
 * reference tables in supabase/migrations/0001_init.sql.
 */
import type { CategoryKey } from "../cost/types";
import type { CatalogModel, PricePoint, SafetyData, SourceId, SourceStamp, VehicleRecord } from "./types";
import { SEED, type SeedModel, type SeedTrim } from "./mock/seed";

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\+/g, " plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const SOURCE_NAMES: Record<SourceId, string> = {
  nhtsa: "NHTSA",
  fueleconomy: "FuelEconomy.gov",
  eia: "EIA",
  aaa: "AAA Your Driving Costs",
  "wa-dol": "WA DOL",
  "wa-dor": "WA DOR",
  marketcheck: "MarketCheck",
};

const DAY = 86_400_000;
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
export const today = () => daysAgo(0);
export const stamp = (id: SourceId, pulledAt: string, stale = false, name = SOURCE_NAMES[id]): SourceStamp => ({
  id,
  name,
  pulledAt,
  stale,
});

/** Dates the hand-loaded reference tables were last updated. */
export const REFERENCE_DATES = { aaa: "2026-09-15", waDor: "2026-10-01", waDol: "2026-07-01" } as const;

// ---------------------------------------------------------------------------
// Index the seed once
// ---------------------------------------------------------------------------

export interface Indexed {
  seed: SeedModel;
  catalog: CatalogModel;
  trims: Map<string, SeedTrim>;
}

export interface Resolved {
  model: Indexed;
  trim: SeedTrim;
  trimKey: string;
  assumed: boolean;
}

export const BY_MODEL = new Map<string, Indexed>();
export const BY_TRIM = new Map<string, { model: Indexed; trim: SeedTrim; trimKey: string }>();

for (const seed of SEED) {
  const modelKey = slug(`${seed.year} ${seed.make} ${seed.model}`);
  const trims = new Map<string, SeedTrim>();
  const catalog: CatalogModel = {
    key: modelKey,
    year: seed.year,
    make: seed.make,
    model: seed.model,
    trims: seed.trims.map((t) => {
      const key = `${modelKey}-${slug(t.name)}`;
      trims.set(key, t);
      return { key, name: t.name, engine: t.engine, mostCommon: Boolean(t.common) };
    }),
  };
  const indexed = { seed, catalog, trims };
  BY_MODEL.set(modelKey, indexed);
  for (const [trimKey, trim] of trims) BY_TRIM.set(trimKey, { model: indexed, trim, trimKey });
}

/** Trim key → that trim. Model key → its most common trim, flagged as assumed. */
export function resolve(key: string): Resolved | null {
  const exact = BY_TRIM.get(key);
  if (exact) return { ...exact, assumed: false };
  const model = BY_MODEL.get(key);
  if (!model) return null;
  const trimKey = model.catalog.trims.find((t) => t.mostCommon)?.key ?? model.catalog.trims[0].key;
  return { model, trim: model.trims.get(trimKey)!, trimKey, assumed: true };
}

export function listCatalog(): CatalogModel[] {
  return [...BY_MODEL.values()].map((m) => m.catalog);
}

// ---------------------------------------------------------------------------
// Builders shared by both sources
// ---------------------------------------------------------------------------

export function vehicleRecord(hit: Resolved, mpg: number, mpgStamp: SourceStamp): VehicleRecord {
  const { seed } = hit.model;
  return {
    catalog: hit.model.catalog,
    trim: hit.model.catalog.trims.find((x) => x.key === hit.trimKey)!,
    trimAssumed: hit.assumed,
    facts: {
      modelYear: seed.year,
      vehicleClass: seed.vehicleClass,
      mpgCombined: mpg,
      msrp: hit.trim.msrp,
      germanLuxury: Boolean(seed.germanLuxury),
      resaleFactor: seed.resale,
      syntheticOil: seed.synthetic,
      riskFlags: seed.risks ?? [],
    },
    note: seed.note,
    stamp: mpgStamp,
    missing: (seed.missing ?? []) as CategoryKey[],
  };
}

export function referenceSafety(modelKey: string, safetyStamp: SourceStamp): SafetyData {
  const m = BY_MODEL.get(modelKey);
  if (!m) throw new Error(`Unknown model ${modelKey}`);
  return {
    recalls: m.seed.recalls.map((r, i) => ({ id: `${modelKey}-r${i + 1}`, ...r })),
    complaints: m.seed.complaints,
    complaintSummary: m.seed.complaintSummary,
    unitsSold: m.seed.unitsSold,
    stamp: safetyStamp,
  };
}

/** Market value from the typical listing for this trim, adjusted for mileage. */
export function referenceMarketValue(trimKey: string, mileage: number, priceStamp: SourceStamp): PricePoint {
  const hit = BY_TRIM.get(trimKey);
  if (!hit) throw new Error(`Unknown trim ${trimKey}`);
  const { trim, model } = hit;
  // Every 1,000 miles over/under typical moves value ~0.6% for cars, less for trucks.
  const perMile = model.seed.vehicleClass.startsWith("pickup") ? 0.04 : 0.06;
  const adj = (trim.typicalMileage - mileage) * perMile;
  const value = Math.max(trim.typicalPrice * 0.35, trim.typicalPrice + adj);
  return { value: Math.round(value / 50) * 50, stamp: priceStamp };
}

export function typicalListing(key: string): { price: number; mileage: number } | null {
  const hit = resolve(key);
  return hit ? { price: hit.trim.typicalPrice, mileage: hit.trim.typicalMileage } : null;
}

/** Sample VINs from the seed, for the "Try a sample VIN" helper. */
export const SAMPLE_VINS = [...BY_TRIM.values()].flatMap(({ trim }) => (trim.vin ? [trim.vin] : []));

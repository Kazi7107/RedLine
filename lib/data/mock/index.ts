import type { CategoryKey } from "../../cost/types";
import type {
  CatalogModel,
  DataSource,
  PricePoint,
  SourceId,
  SourceStamp,
  VehicleRecord,
  VinDecodeResult,
} from "../types";
import { lookupLocale } from "./locales";
import { SEED, type SeedModel, type SeedTrim } from "./seed";

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
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const stamp = (id: SourceId, pulledAt: string, stale = false): SourceStamp => ({
  id,
  name: SOURCE_NAMES[id],
  pulledAt,
  stale,
});

/** Env-driven so the stale-price state can be demoed without code changes. */
const marketcheckLimitHit = () => process.env.MOCK_MARKETCHECK_LIMIT_HIT === "true";

// ---------------------------------------------------------------------------
// Index the seed once
// ---------------------------------------------------------------------------

interface Indexed {
  seed: SeedModel;
  catalog: CatalogModel;
  trims: Map<string, SeedTrim>;
}

const BY_MODEL = new Map<string, Indexed>();
const BY_TRIM = new Map<string, { model: Indexed; trim: SeedTrim; trimKey: string }>();

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

function resolve(key: string) {
  const exact = BY_TRIM.get(key);
  if (exact) return { ...exact, assumed: false };
  const model = BY_MODEL.get(key);
  if (!model) return null;
  const trimKey = model.catalog.trims.find((t) => t.mostCommon)?.key ?? model.catalog.trims[0].key;
  return { model, trim: model.trims.get(trimKey)!, trimKey, assumed: true };
}

/** Deterministic latency jitter so the loading states show up in mock mode. */
export async function mockLatency(ms: number): Promise<void> {
  if (process.env.MOCK_LATENCY === "0" || process.env.NODE_ENV === "test") return;
  await new Promise((r) => setTimeout(r, ms + Math.random() * ms * 0.4));
}

// ---------------------------------------------------------------------------
// The mock DataSource
// ---------------------------------------------------------------------------

export const mockSource: DataSource = {
  name: "mock",

  async listCatalog() {
    return [...BY_MODEL.values()].map((m) => m.catalog);
  },

  async getVehicle(key): Promise<VehicleRecord | null> {
    const hit = resolve(key);
    if (!hit) return null;
    const { seed } = hit.model;
    const t = hit.trim;
    const catalogTrim = hit.model.catalog.trims.find((x) => x.key === hit.trimKey)!;
    return {
      catalog: hit.model.catalog,
      trim: catalogTrim,
      trimAssumed: hit.assumed,
      facts: {
        modelYear: seed.year,
        vehicleClass: seed.vehicleClass,
        mpgCombined: t.mpg,
        msrp: t.msrp,
        germanLuxury: Boolean(seed.germanLuxury),
        resaleFactor: seed.resale,
        syntheticOil: seed.synthetic,
        riskFlags: seed.risks ?? [],
      },
      note: seed.note,
      stamp: stamp("fueleconomy", daysAgo(38)),
      missing: (seed.missing ?? []) as CategoryKey[],
    };
  },

  async getSafety(modelKey) {
    const m = BY_MODEL.get(modelKey);
    if (!m) throw new Error(`Unknown model ${modelKey}`);
    return {
      recalls: m.seed.recalls.map((r, i) => ({ id: `${modelKey}-r${i + 1}`, ...r })),
      complaints: m.seed.complaints,
      complaintSummary: m.seed.complaintSummary,
      unitsSold: m.seed.unitsSold,
      stamp: stamp("nhtsa", daysAgo(2)),
    };
  },

  async getGasPrice(): Promise<PricePoint> {
    // EIA weekly retail regular, Washington. Published Mondays.
    return { value: 4.29, stamp: stamp("eia", daysAgo(6)) };
  },

  async getMarketValue(trimKey, mileage): Promise<PricePoint> {
    const hit = BY_TRIM.get(trimKey);
    if (!hit) throw new Error(`Unknown trim ${trimKey}`);
    const { trim, model } = hit;
    // Every 1,000 miles over/under typical moves value ~0.6% for cars, less for trucks.
    const perMile = model.seed.vehicleClass.startsWith("pickup") ? 0.04 : 0.06;
    const adj = (trim.typicalMileage - mileage) * perMile;
    const value = Math.max(trim.typicalPrice * 0.35, trim.typicalPrice + adj);
    const stale = marketcheckLimitHit();
    return { value: Math.round(value / 50) * 50, stamp: stamp("marketcheck", stale ? daysAgo(4) : daysAgo(0), stale) };
  },

  async getAaaStamp() {
    return stamp("aaa", "2026-09-15");
  },

  async getLocale(zip) {
    const locale = lookupLocale(zip);
    if (!locale) return null;
    return { locale, stamps: [stamp("wa-dor", "2026-10-01"), stamp("wa-dol", "2026-07-01")] };
  },

  async decodeVin(raw): Promise<VinDecodeResult | null> {
    const vin = raw.trim().toUpperCase();
    for (const [trimKey, { model, trim }] of BY_TRIM) {
      if (trim.vin === vin) {
        return {
          vin,
          modelKey: model.catalog.key,
          trimKey,
          year: model.seed.year,
          make: model.seed.make,
          model: model.seed.model,
          trim: trim.name,
          engine: trim.engine,
        };
      }
    }
    return null;
  },

  async getTypicalListing(key) {
    const hit = resolve(key);
    return hit ? { price: hit.trim.typicalPrice, mileage: hit.trim.typicalMileage } : null;
  },
};

/** Sample VINs the mock decoder knows, for the "Try a sample VIN" helper. */
export const SAMPLE_VINS = [...BY_TRIM.values()].flatMap(({ trim }) => (trim.vin ? [trim.vin] : []));

/** Seed lookup for the typical price/mileage (used to prefill the add-car form). */
export function typicalListing(trimKey: string): { price: number; mileage: number } | null {
  const hit = BY_TRIM.get(trimKey);
  return hit ? { price: hit.trim.typicalPrice, mileage: hit.trim.typicalMileage } : null;
}

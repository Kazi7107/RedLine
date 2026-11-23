/**
 * The mock DataSource: every value comes from the reference seed, with fixed
 * "pulled" dates and optional fake latency. Used by tests and demos
 * (USE_MOCK_DATA=true). The live source is lib/data/live.ts.
 */
import type { DataSource, PricePoint, VinDecodeResult } from "../types";
import {
  BY_TRIM,
  REFERENCE_DATES,
  daysAgo,
  listCatalog,
  referenceMarketValue,
  referenceSafety,
  resolve,
  stamp,
  typicalListing,
  vehicleRecord,
} from "../reference";
import { lookupLocale } from "./locales";

export { SAMPLE_VINS, SOURCE_NAMES, slug, typicalListing } from "../reference";

/** Env-driven so the stale-price state can be demoed without code changes. */
const marketcheckLimitHit = () => process.env.MOCK_MARKETCHECK_LIMIT_HIT === "true";

/** Deterministic latency jitter so the loading states show up in mock mode. */
export async function mockLatency(ms: number): Promise<void> {
  if (process.env.MOCK_LATENCY === "0" || process.env.NODE_ENV === "test") return;
  await new Promise((r) => setTimeout(r, ms + Math.random() * ms * 0.4));
}

export const mockSource: DataSource = {
  name: "mock",

  async listCatalog() {
    return listCatalog();
  },

  async getVehicle(key) {
    const hit = resolve(key);
    if (!hit) return null;
    return vehicleRecord(hit, hit.trim.mpg, stamp("fueleconomy", daysAgo(38)));
  },

  async getSafety(modelKey) {
    return referenceSafety(modelKey, stamp("nhtsa", daysAgo(2)));
  },

  async getGasPrice(): Promise<PricePoint> {
    // EIA weekly retail regular, Washington. Published Mondays.
    return { value: 4.29, stamp: stamp("eia", daysAgo(6)) };
  },

  async getMarketValue(trimKey, mileage) {
    const stale = marketcheckLimitHit();
    return referenceMarketValue(trimKey, mileage, stamp("marketcheck", stale ? daysAgo(4) : daysAgo(0), stale));
  },

  async getAaaStamp() {
    return stamp("aaa", REFERENCE_DATES.aaa);
  },

  async getLocale(zip) {
    const locale = lookupLocale(zip);
    if (!locale) return null;
    return { locale, stamps: [stamp("wa-dor", REFERENCE_DATES.waDor), stamp("wa-dol", REFERENCE_DATES.waDol)] };
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
    return typicalListing(key);
  },
};

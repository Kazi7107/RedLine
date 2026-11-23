/**
 * The live DataSource.
 *
 * Live from free public APIs (no database yet; Next's data cache holds responses):
 *   - MPG per trim:      FuelEconomy.gov  /vehicle/{epaId}            (30 days)
 *   - Recalls:           NHTSA            /recalls/recallsByVehicle   (1 day)
 *   - Complaint counts:  NHTSA            /complaints/complaintsByVehicle (1 day)
 *   - VIN decode:        NHTSA vPIC       /DecodeVinValues            (1 year)
 *   - Gas price:         EIA weekly WA regular with EIA_API_KEY, otherwise
 *                        FuelEconomy.gov's U.S. average             (12 hours)
 *
 * From reference data (lib/data/reference.ts), because no free API has it:
 * the catalog, vehicle class, resale factor, units sold, risk flags, AAA cost
 * factors, WA tax and fee tables, and typical listings (market value).
 *
 * Any API failure falls back to the reference value with `stale: true`, so a
 * government API outage shows a "paused" note instead of an error page.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { getStateRegular } from "../sources/eia";
import { getCombinedMpg, getNationalRegular } from "../sources/fueleconomy";
import { decodeVin, getComplaints, getRecalls } from "../sources/nhtsa";
import { complaintSummary, countComplaints, matchTrim, normalizeRecalls } from "../sources/nhtsa-normalize";
import { lookupLocale } from "./mock/locales";
import {
  BY_MODEL,
  REFERENCE_DATES,
  daysAgo,
  listCatalog,
  referenceMarketValue,
  referenceSafety,
  resolve,
  stamp,
  today,
  typicalListing,
  vehicleRecord,
} from "./reference";
import type { DataSource, PricePoint, SafetyData, VinDecodeResult } from "./types";

/** Typical listing prices in the reference table were last checked on this date. */
const LISTINGS_DATE = "2026-11-01";
const REFERENCE_GAS = 4.29;

const warn = (what: string, err: unknown) => console.warn(`[redline] ${what} failed, using reference data:`, (err as Error).message);

/** NHTSA counts per model, cached for a day. Thousands of raw complaints go in; a few numbers come out. */
const nhtsaCounts = unstable_cache(
  async (year: number, make: string, model: string) => {
    const [recalls, complaints] = await Promise.allSettled([getRecalls(year, make, model), getComplaints(year, make, model)]);
    return {
      recalls: recalls.status === "fulfilled" ? normalizeRecalls(recalls.value) : null,
      complaints: complaints.status === "fulfilled" ? countComplaints(complaints.value) : null,
      complaintTotal: complaints.status === "fulfilled" ? complaints.value.length : null,
      errors: [recalls, complaints].flatMap((r) => (r.status === "rejected" ? [String((r.reason as Error).message)] : [])),
      pulledAt: today(),
    };
  },
  ["nhtsa-counts-v3"],
  { revalidate: 60 * 60 * 24 },
);

export const liveSource: DataSource = {
  name: "live",

  async listCatalog() {
    // TODO(db): select from vehicle_models join vehicle_trims.
    return listCatalog();
  },

  async getVehicle(key) {
    const hit = resolve(key);
    if (!hit) return null;
    try {
      const mpg = await getCombinedMpg(hit.trim.epaId);
      return vehicleRecord(hit, mpg, stamp("fueleconomy", today()));
    } catch (err) {
      warn(`FuelEconomy.gov MPG for ${hit.trimKey}`, err);
      return vehicleRecord(hit, hit.trim.mpg, stamp("fueleconomy", daysAgo(30), true));
    }
  },

  async getSafety(modelKey): Promise<SafetyData> {
    const m = BY_MODEL.get(modelKey);
    if (!m) throw new Error(`Unknown model ${modelKey}`);
    const ref = referenceSafety(modelKey, stamp("nhtsa", daysAgo(7), true));
    const { year, make } = m.seed;
    const model = m.seed.nhtsaModel ?? m.seed.model;

    let live: Awaited<ReturnType<typeof nhtsaCounts>>;
    try {
      live = await nhtsaCounts(year, make, model);
    } catch (err) {
      warn(`NHTSA for ${modelKey}`, err);
      return ref;
    }
    if (live.errors.length) warn(`NHTSA for ${modelKey}`, new Error(live.errors.join("; ")));

    const counted = live.complaints ? Object.values(live.complaints).reduce((s, n) => s + (n ?? 0), 0) : 0;
    // NHTSA sometimes files no complaints under a model it has recalls for (2015 F-150).
    // That's a gap in their index, not a spotless car, so keep the reference counts.
    const complaintsGap = live.complaints !== null && counted === 0 && Object.keys(m.seed.complaints).length > 0;
    const complaints = live.complaints && !complaintsGap ? live.complaints : m.seed.complaints;
    const allLive = live.recalls !== null && live.complaints !== null && !complaintsGap;

    return {
      recalls: live.recalls ?? ref.recalls,
      complaints,
      complaintSummary: complaints === live.complaints ? complaintSummary(complaints) : m.seed.complaintSummary,
      unitsSold: m.seed.unitsSold, // TODO(db): vehicle_models.units_sold
      stamp: stamp(
        "nhtsa",
        allLive ? live.pulledAt : ref.stamp.pulledAt,
        live.errors.length > 0,
        complaintsGap ? "NHTSA (complaint counts from reference data)" : undefined,
      ),
    };
  },

  async getGasPrice(): Promise<PricePoint> {
    const key = process.env.EIA_API_KEY;
    if (key) {
      try {
        const { value, period } = await getStateRegular(key, "WA");
        return { value, stamp: stamp("eia", period) };
      } catch (err) {
        warn("EIA WA gas price", err);
      }
    }
    try {
      const value = await getNationalRegular();
      return { value, stamp: stamp("fueleconomy", today(), false, "FuelEconomy.gov (U.S. average)") };
    } catch (err) {
      warn("FuelEconomy.gov gas price", err);
      return { value: REFERENCE_GAS, stamp: stamp("eia", daysAgo(7), true) };
    }
  },

  async getMarketValue(trimKey, mileage) {
    // TODO(db): marketcheck_cache by trim + mileage bucket, refreshed daily with MARKETCHECK_API_KEY.
    // Until then: the typical WA listing for this trim, adjusted for mileage.
    return referenceMarketValue(trimKey, mileage, stamp("marketcheck", LISTINGS_DATE, false, "Typical WA listings"));
  },

  async getAaaStamp() {
    return stamp("aaa", REFERENCE_DATES.aaa);
  },

  async getLocale(zip) {
    // TODO(db): wa_zip_locations → wa_tax_rates, wa_registration_fees.
    const locale = lookupLocale(zip);
    if (!locale) return null;
    return { locale, stamps: [stamp("wa-dor", REFERENCE_DATES.waDor), stamp("wa-dol", REFERENCE_DATES.waDol)] };
  },

  async decodeVin(raw): Promise<VinDecodeResult | null> {
    const vin = raw.trim().toUpperCase();
    let d: Awaited<ReturnType<typeof decodeVin>>;
    try {
      d = await decodeVin(vin);
    } catch (err) {
      warn("NHTSA vPIC", err);
      return null;
    }
    if (!d.year || !d.make || !d.model) return null;

    // vPIC says "RAV4" for the hybrid too; ElectrificationLevel tells them apart.
    const hybrid = /hybrid|HEV/i.test(d.electrification ?? "");
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const candidates = listCatalog().filter(
      (c) => c.year === d.year && norm(c.make) === norm(d.make!) && (norm(c.model).startsWith(norm(d.model!)) || norm(d.model!).startsWith(norm(c.model))),
    );
    const model =
      candidates.find((c) => /hybrid/i.test(c.model) === hybrid && norm(c.model) === norm(d.model!)) ??
      candidates.find((c) => /hybrid/i.test(c.model) === hybrid) ??
      candidates[0];
    if (!model) return null;

    const common = model.trims.find((t) => t.mostCommon)?.name;
    const trimName = matchTrim(d.trim, model.trims.map((t) => t.name), common);
    const trim = model.trims.find((t) => t.name === trimName) ?? null;
    return {
      vin,
      modelKey: model.key,
      trimKey: trim?.key ?? null,
      year: model.year,
      make: model.make,
      model: model.model,
      trim: trim?.name ?? null,
      engine: trim?.engine ?? (d.displacementL ? `${Number(d.displacementL).toFixed(1)}L` : null),
    };
  },

  async getTypicalListing(key) {
    // TODO(db): median price + mileage from marketcheck_cache.
    return typicalListing(key);
  },
};

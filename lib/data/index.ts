/**
 * THE data-access module. Every page and /api/estimate goes through here.
 *
 * It picks a DataSource (mock or live) from USE_MOCK_DATA, pulls raw inputs,
 * runs them through lib/cost, and returns the EstimateResponse shape. To
 * connect real data you implement lib/data/live.ts. This file stays as is.
 */
import "server-only";
import { calculateCosts } from "../cost/calculate";
import { reliabilityScore } from "../cost/reliability";
import type { CategoryKey } from "../cost/types";
import { CATEGORY_LABEL, COMPLAINT_LABEL } from "../categories";
import { money } from "../format";
import { annualMilesError, mileageError, priceError, vinError, zipError } from "../validation";
import { DEFAULT_ANNUAL_MILES, isValidKey } from "../share";
import { liveSource } from "./live";
import { mockLatency, mockSource } from "./mock";
import type {
  CategoryResult,
  DataSource,
  EstimateError,
  EstimateFull,
  EstimateRequest,
  EstimateSummary,
  EstimateUnavailable,
  EstimateVehicle,
  SourceStamp,
  VehicleRecord,
} from "./types";

export type * from "./types";

export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA !== "false";
}

export function dataSource(): DataSource {
  return isMockMode() ? mockSource : liveSource;
}

/** Simulated network time in mock mode: the total arrives first, the breakdown after. */
const LATENCY = { summary: 550, full: 1300, vin: 900, catalog: 0 } as const;

async function latency(kind: keyof typeof LATENCY, enabled: boolean) {
  if (enabled && isMockMode()) await mockLatency(LATENCY[kind]);
}

export async function getCatalog() {
  return dataSource().listCatalog();
}

export async function decodeVin(vin: string, opts: { latency?: boolean } = {}) {
  await latency("vin", opts.latency ?? true);
  if (vinError(vin)) return null;
  return dataSource().decodeVin(vin);
}

export async function getTypicalListing(key: string) {
  if (!isValidKey(key)) return null;
  return dataSource().getTypicalListing(key);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function parseEstimateRequest(
  raw: Record<string, string | null | undefined>,
): { ok: true; value: EstimateRequest } | { ok: false; error: EstimateError } {
  const num = (v: string | null | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);
  const key = raw.key ?? "";
  const mileage = num(raw.mileage);
  const price = num(raw.price);
  const zip = raw.zip ?? "";
  const annualMiles = raw.miles ? num(raw.miles) : DEFAULT_ANNUAL_MILES;

  const fields: EstimateError["fields"] = {};
  if (!isValidKey(key)) fields.key = "Pick a year, make and model.";
  const m = mileageError(mileage);
  if (m) fields.mileage = m;
  const p = priceError(price);
  if (p) fields.price = p;
  const z = zipError(zip);
  if (z) fields.zip = z;
  const a = annualMilesError(annualMiles);
  if (a) fields.annualMiles = a;

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: { status: "error", code: "invalid_input", message: "Some inputs need a fix.", fields } };
  }
  return { ok: true, value: { key, mileage: mileage!, price: price!, zip, annualMiles: annualMiles! } };
}

// ---------------------------------------------------------------------------
// Estimate
// ---------------------------------------------------------------------------

function vehicleSummary(v: VehicleRecord): EstimateVehicle {
  return {
    key: v.trimAssumed ? v.catalog.key : v.trim.key,
    modelKey: v.catalog.key,
    year: v.catalog.year,
    make: v.catalog.make,
    model: v.catalog.model,
    trim: v.trim.name,
    trimAssumed: v.trimAssumed,
    engine: v.trim.engine,
    vehicleClass: v.facts.vehicleClass,
    mpgCombined: v.facts.mpgCombined,
    name: `${v.catalog.year} ${v.catalog.make} ${v.catalog.model} ${v.trim.name}`,
    shortName: v.catalog.model,
  };
}

function unavailable(v: VehicleRecord): EstimateUnavailable {
  const has = (k: CategoryKey) => !v.missing.includes(k);
  return {
    status: "insufficient_data",
    vehicle: vehicleSummary(v),
    message: "There isn't enough repair and insurance data on this car. Rather than guess, we left it out of the totals.",
    coverage: [
      { label: "Gas mileage", found: has("fuel") },
      { label: "Recalls", found: true },
      { label: "Repair costs", found: has("repairs") },
      { label: "Insurance", found: has("insurance") },
    ],
  };
}

export async function getEstimate(
  req: EstimateRequest,
  opts: { stage?: "summary" | "full"; latency?: boolean } = {},
): Promise<EstimateSummary | EstimateFull | EstimateUnavailable | EstimateError> {
  const stage = opts.stage ?? "full";
  const src = dataSource();
  await latency(stage, opts.latency ?? true);

  const vehicle = await src.getVehicle(req.key);
  if (!vehicle) {
    return { status: "error", code: "not_found", message: "We don't have that car in our data yet." };
  }
  if (vehicle.missing.length > 0) return unavailable(vehicle);

  const [safety, gas, market, aaa, localeHit] = await Promise.all([
    src.getSafety(vehicle.catalog.key),
    src.getGasPrice(),
    src.getMarketValue(vehicle.trim.key, req.mileage),
    src.getAaaStamp(),
    src.getLocale(req.zip),
  ]);
  if (!localeHit) {
    return { status: "error", code: "invalid_input", message: "Redline only covers Washington for now.", fields: { zip: zipError(req.zip) ?? "" } };
  }
  const { locale, stamps: localeStamps } = localeHit;
  const [dor, dol] = localeStamps;

  const rel = reliabilityScore({
    recallCount: safety.recalls.length,
    complaints: safety.complaints,
    unitsSold: safety.unitsSold,
  });

  const asOfYear = new Date().getFullYear();
  const costs = calculateCosts({
    facts: vehicle.facts,
    locale,
    mileage: req.mileage,
    askingPrice: req.price,
    marketValue: market.value,
    annualMiles: req.annualMiles,
    gasPrice: gas.value,
    reliabilityScore: rel.score,
    asOfYear,
  });

  const summary: EstimateSummary = {
    status: "ok",
    stage: "summary",
    vehicle: vehicleSummary(vehicle),
    inputs: { ...req, county: locale.county, gasPrice: gas.value, marketValue: market.value },
    years: costs.years,
    reliability: { score: rel.score, band: rel.band, label: rel.label, isRisk: rel.isRisk },
    priceStamp: market.stamp,
    generatedAt: new Date().toISOString(),
  };
  if (stage === "summary") return summary;

  const age = asOfYear - vehicle.facts.modelYear;
  const repairAdjustments = [
    age > 10 ? "+25% because it's over 10 years old" : age + 4 > 10 ? "+25% once it passes 10 years old" : null,
    vehicle.facts.germanLuxury ? "+45% for German luxury parts and labor" : null,
    ...vehicle.facts.riskFlags.map((r) => `plus the chance of ${r.component.toLowerCase()} trouble`),
  ].filter(Boolean);

  const includes = [...new Set(costs.maintenanceItems.map((i) => i.item.replace(/ \(\d+\)$/, "")))];

  const method: Record<CategoryKey, { sources: SourceStamp[]; method: string; note: string }> = {
    depreciation: {
      sources: [market.stamp, aaa],
      method: "Starts at today's market value for this trim and mileage, then applies yearly value loss for its age, brand and how much you drive.",
      note: costs.overMarket > 0 ? `Includes ${money(costs.overMarket)} over market value` : "What it's worth less each year",
    },
    fuel: {
      sources: [vehicle.stamp, gas.stamp],
      method: `${req.annualMiles.toLocaleString("en-US")} miles a year at ${vehicle.facts.mpgCombined} mpg, times $${gas.value.toFixed(2)}/gal (Washington average).`,
      note: `${vehicle.facts.mpgCombined} mpg combined`,
    },
    insurance: {
      sources: [aaa],
      method: "Full-coverage averages for this kind of car, adjusted for Washington rates and the car's age.",
      note: "Your real price depends on your age and driving record",
    },
    maintenance: {
      sources: [aaa],
      method: "The maker's service schedule at your mileage, priced at Washington shop rates.",
      note: "Oil, tires, brakes and scheduled service",
    },
    repairs: {
      sources: [aaa, safety.stamp],
      method: `Average repair spend for this class and mileage, scaled by this model's NHTSA complaint record${repairAdjustments.length ? ", " + repairAdjustments.join(", ") : ""}.`,
      note: "Unplanned fixes, kept separate from maintenance",
    },
    taxes: {
      sources: [dor, dol],
      method: `${(locale.salesTaxRate * 100).toFixed(1)}% sales tax in ${locale.county} County, plus yearly WA registration${locale.rta ? " and the Sound Transit (RTA) excise tax" : ""}.`,
      note: "Based on your ZIP",
    },
  };

  const categories: CategoryResult[] = costs.categories.map((c) => ({
    key: c.key,
    label: CATEGORY_LABEL[c.key],
    isRange: c.isRange,
    isEstimate: c.key === "insurance" || c.key === "repairs",
    years: c.years,
    note: method[c.key].note,
    includes: c.key === "maintenance" ? includes : undefined,
    method: { sources: method[c.key].sources, method: method[c.key].method },
  }));

  const complaints = Object.entries(safety.complaints)
    .map(([category, count]) => ({
      category: category as keyof typeof COMPLAINT_LABEL,
      label: COMPLAINT_LABEL[category as keyof typeof COMPLAINT_LABEL],
      count: count ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recallWord = safety.recalls.length === 1 ? "recall" : "recalls";
  // Lowercase for mid-sentence use, but keep acronyms like "AC".
  const topComplaint = complaints[0]?.label.split(" ").map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(" ");
  const relSummary =
    rel.complaintsPer10k < 8
      ? `${safety.recalls.length} ${recallWord} · few complaints for its sales`
      : `${safety.recalls.length} ${recallWord} · ${rel.isRisk || rel.band === "below" ? "heavy" : "mostly"} ${topComplaint} complaints`;

  const full: EstimateFull = {
    ...summary,
    stage: "full",
    note: vehicle.note,
    categories,
    reliability: {
      ...summary.reliability,
      recallCount: safety.recalls.length,
      complaintTotal: rel.complaintTotal,
      complaintsPer10k: rel.complaintsPer10k,
      summary: relSummary,
    },
    recalls: safety.recalls,
    complaints,
    complaintSummary: safety.complaintSummary,
    riskFlags: vehicle.facts.riskFlags,
    maintenanceSchedule: costs.maintenanceItems,
    overMarket: costs.overMarket,
    sources: [safety.stamp, vehicle.stamp, gas.stamp, aaa, dol, dor, market.stamp],
  };
  return full;
}

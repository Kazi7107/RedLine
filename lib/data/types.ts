/**
 * The data-layer contract.
 *
 * `DataSource` is what you implement to go live (see lib/data/live.ts). It
 * returns *raw inputs*: MPG, recalls, gas price, market value, ZIP taxes.
 * lib/data/index.ts runs those through lib/cost and builds the
 * `EstimateResponse` that /api/estimate returns and every page renders.
 */
import type {
  CategoryKey,
  ComplaintCategory,
  Locale,
  RiskFlag,
  VehicleClass,
  VehicleFacts,
  YearRange,
} from "../cost/types";
import type { ReliabilityBand } from "../cost/reliability";

// ---------------------------------------------------------------------------
// Catalog (dropdowns)
// ---------------------------------------------------------------------------

export interface CatalogTrim {
  /** e.g. 2016-toyota-corolla-le */
  key: string;
  name: string;
  engine: string;
  mostCommon: boolean;
}

export interface CatalogModel {
  /** e.g. 2016-toyota-corolla. Used as the car key when trim is "Not sure". */
  key: string;
  year: number;
  make: string;
  model: string;
  trims: CatalogTrim[];
}

// ---------------------------------------------------------------------------
// Raw source data
// ---------------------------------------------------------------------------

export type SourceId = "nhtsa" | "fueleconomy" | "eia" | "aaa" | "wa-dol" | "wa-dor" | "marketcheck";

export interface SourceStamp {
  id: SourceId;
  name: string;
  /** ISO date the cached value was pulled. */
  pulledAt: string;
  /** True when the live feed is paused and we're showing a cached value past its refresh window. */
  stale: boolean;
}

export interface Recall {
  id: string;
  title: string;
  component: string;
  summary: string;
  /** ISO date */
  reportedAt: string;
}

export interface SafetyData {
  recalls: Recall[];
  complaints: Partial<Record<ComplaintCategory, number>>;
  /** What owners describe most, in plain English. */
  complaintSummary: string;
  unitsSold: number;
  stamp: SourceStamp;
}

export interface PricePoint {
  value: number;
  stamp: SourceStamp;
}

export interface VehicleRecord {
  catalog: CatalogModel;
  trim: CatalogTrim;
  trimAssumed: boolean;
  facts: VehicleFacts;
  /** Copy for the card: "Solid all-rounder..." */
  note: string;
  stamp: SourceStamp;
  /** When we can't price a car honestly, the categories we're missing. */
  missing: CategoryKey[];
}

export interface VinDecodeResult {
  vin: string;
  modelKey: string;
  trimKey: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  engine: string | null;
}

export interface DataSource {
  readonly name: "mock" | "live";
  listCatalog(): Promise<CatalogModel[]>;
  /** Accepts a trim key or a model key ("Not sure" trim). Null when unknown. */
  getVehicle(key: string): Promise<VehicleRecord | null>;
  getSafety(modelKey: string): Promise<SafetyData>;
  getGasPrice(): Promise<PricePoint>;
  getMarketValue(trimKey: string, mileage: number): Promise<PricePoint>;
  getAaaStamp(): Promise<SourceStamp>;
  getLocale(zip: string): Promise<{ locale: Locale; stamps: SourceStamp[] } | null>;
  decodeVin(vin: string): Promise<VinDecodeResult | null>;
  /** A typical listing (price + mileage) for a trim or model key. Fills the detail page when a link has no inputs. */
  getTypicalListing(key: string): Promise<{ price: number; mileage: number } | null>;
}

// ---------------------------------------------------------------------------
// /api/estimate response. This is the shape the real route must keep.
// ---------------------------------------------------------------------------

export interface EstimateRequest {
  key: string;
  mileage: number;
  price: number;
  zip: string;
  annualMiles: number;
}

export interface Method {
  /** Sources that feed this line. The first one is the main one. */
  sources: SourceStamp[];
  /** One-line method, plain English. */
  method: string;
}

export interface CategoryResult {
  key: CategoryKey;
  label: string;
  isRange: boolean;
  isEstimate: boolean;
  years: YearRange[];
  /** Short note under the line, e.g. "based on your ZIP". */
  note: string;
  /** For maintenance: what's included. */
  includes?: string[];
  method: Method;
}

export interface EstimateVehicle {
  key: string;
  modelKey: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  trimAssumed: boolean;
  engine: string;
  vehicleClass: VehicleClass;
  mpgCombined: number;
  name: string;
  shortName: string;
}

export interface EstimateSummary {
  status: "ok";
  stage: "summary";
  vehicle: EstimateVehicle;
  inputs: EstimateRequest & { county: string; gasPrice: number; marketValue: number };
  /** Per ownership year totals, all categories. */
  years: YearRange[];
  reliability: { score: number; band: ReliabilityBand; label: string; isRisk: boolean };
  priceStamp: SourceStamp;
  generatedAt: string;
}

export interface EstimateFull extends Omit<EstimateSummary, "stage" | "reliability"> {
  stage: "full";
  categories: CategoryResult[];
  reliability: EstimateSummary["reliability"] & {
    recallCount: number;
    complaintTotal: number;
    complaintsPer10k: number;
    summary: string;
  };
  note: string;
  recalls: Recall[];
  complaints: { category: ComplaintCategory; label: string; count: number }[];
  complaintSummary: string;
  riskFlags: RiskFlag[];
  maintenanceSchedule: { item: string; year: number; cost: number }[];
  overMarket: number;
  sources: SourceStamp[];
}

export interface EstimateUnavailable {
  status: "insufficient_data";
  vehicle: EstimateVehicle;
  /** What we found and what we're missing, for the error card. */
  coverage: { label: string; found: boolean }[];
  message: string;
}

export type EstimateResponse = EstimateSummary | EstimateFull | EstimateUnavailable;

export interface EstimateError {
  status: "error";
  code: "not_found" | "invalid_input" | "not_connected";
  message: string;
  fields?: Partial<Record<keyof EstimateRequest, string>>;
}

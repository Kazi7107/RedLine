/**
 * Pure cost-model types. Nothing in lib/cost touches the network, the DB or
 * React, so it can be unit tested and reused by the API route and the pages.
 */

export type VehicleClass =
  | "compact"
  | "midsize"
  | "hybrid"
  | "compact-suv"
  | "midsize-suv"
  | "pickup-midsize"
  | "pickup-full";

export type CategoryKey =
  | "depreciation"
  | "fuel"
  | "insurance"
  | "maintenance"
  | "repairs"
  | "taxes";

export type ComplaintCategory =
  | "engine"
  | "transmission"
  | "electrical"
  | "hybrid-system"
  | "brakes"
  | "steering"
  | "suspension"
  | "ac-heat"
  | "body"
  | "fuel-system"
  | "airbags";

/** A known, expensive failure for a specific model (e.g. the 2015 Focus transmission). */
export interface RiskFlag {
  id: string;
  component: string;
  title: string;
  /** Plain-English explanation shown on the detail page. */
  body: string;
  costLow: number;
  costHigh: number;
  /** Chance it fails during the 5 years of ownership, 0..1. */
  probability: number;
  /** Ownership year (1..5) where it's most likely to hit. */
  peakYear: number;
  /** What to do on a test drive or inspection. */
  checkTip: string;
}

/** Everything the cost model needs to know about one car. */
export interface VehicleFacts {
  modelYear: number;
  vehicleClass: VehicleClass;
  mpgCombined: number;
  msrp: number;
  germanLuxury: boolean;
  /** 1 = average resale. Toyota ~0.85 (holds value), Ford ~1.2 (loses faster). */
  resaleFactor: number;
  /** Synthetic oil + longer intervals. */
  syntheticOil: boolean;
  riskFlags: RiskFlag[];
}

export interface Locale {
  zip: string;
  county: string;
  city: string;
  /** Combined state + local sales/use tax, e.g. 0.099. */
  salesTaxRate: number;
  /** Inside the Sound Transit district, so the RTA motor vehicle excise tax applies. */
  rta: boolean;
}

export interface CostInputs {
  facts: VehicleFacts;
  locale: Locale;
  mileage: number;
  askingPrice: number;
  /** Current market value (MarketCheck). Depreciation starts here. */
  marketValue: number;
  annualMiles: number;
  gasPrice: number;
  /** 0..100 reliability score; nudges repair estimates up or down. */
  reliabilityScore: number;
  /** Calendar year the buyer takes ownership (normally this year). */
  asOfYear: number;
}

export interface YearRange {
  low: number;
  high: number;
}

export interface CategoryEstimate {
  key: CategoryKey;
  /** Five entries, one per ownership year. low === high when it isn't a range. */
  years: YearRange[];
  isRange: boolean;
}

export interface CostBreakdown {
  categories: CategoryEstimate[];
  /** Total per ownership year, summed over categories. */
  years: YearRange[];
  /** Scheduled maintenance items that fall inside the 5 years. */
  maintenanceItems: { item: string; year: number; cost: number }[];
  /** asking price minus market value when positive: lost the day you buy. */
  overMarket: number;
}

export type Horizon = 1 | 5;

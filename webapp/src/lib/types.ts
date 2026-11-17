export interface MenuItem {
  text: string;
  value: string;
}

export type Powertrain = "gas" | "hybrid" | "phev" | "ev" | "diesel";

export interface VehicleSpec {
  epaId: number;
  year: number;
  make: string;
  model: string;
  baseModel: string;
  vehicleClass: string;
  powertrain: Powertrain;
  fuelType: string;
  mpgCombined: number;
  mpgCity: number;
  mpgHighway: number;
  kwhPer100mi: number;
  phevUtilityFactor: number;
  description: string;
  evRangeMiles: number;
}

export interface FuelPrices {
  regular: number;
  midgrade: number;
  premium: number;
  diesel: number;
  e85: number;
  electricityPerKwh: number;
  source: string;
  region: string;
  asOf: string;
}

export interface VinDecode {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  fuelType: string | null;
  errorText: string | null;
}

export interface SafetySummary {
  recallCount: number | null;
  recalls: { campaign: string; component: string; summary: string; reported: string }[];
  complaintCount: number | null;
  overallStars: number | null;
  ratedVehicle: string | null;
  errors: string[];
}

export type DriverAgeBand = "under25" | "25to64" | "65plus";
export type Coverage = "full" | "liability";

export interface OwnershipInputs {
  purchasePrice: number;
  currentMileage: number;
  milesPerYear: number;
  /** Key into WA_LOCATIONS. */
  location: string;
  driverAge: DriverAgeBand;
  coverage: Coverage;
  years: number;
  /** Optional financing. */
  downPayment?: number;
  loanApr?: number;
  loanTermMonths?: number;
  /** Annual fuel price change, e.g. 0.02 for +2%/yr. */
  fuelInflation?: number;
}

export type CostCategory = "fuel" | "insurance" | "maintenance" | "registration" | "depreciation" | "financing";

export interface YearBreakdown {
  year: number;
  vehicleAge: number;
  odometerStart: number;
  fuel: number;
  insurance: number;
  maintenance: number;
  registration: number;
  depreciation: number;
  financing: number;
  total: number;
}

export interface OwnershipEstimate {
  vehicle: VehicleSpec;
  inputs: OwnershipInputs;
  fuelPrices: FuelPrices;
  years: YearBreakdown[];
  upfront: { salesTax: number; titleAndFees: number };
  totals: Record<CostCategory, number> & { upfrontTaxesAndFees: number; total: number };
  resaleValue: number;
  costPerMile: number;
  assumptions: string[];
}

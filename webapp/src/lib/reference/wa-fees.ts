/**
 * Washington State taxes and fees.
 *
 * Sources (verify each quarter; rates change):
 * - WA Dept. of Revenue, local sales & use tax rates by location:
 *   https://dor.wa.gov/taxes-rates/sales-use-tax-rates
 * - WA DOR, motor vehicle sales/use tax (extra 0.3% on vehicle sales, RCW 82.08.020(3)).
 * - WA Dept. of Licensing, vehicle registration & tab fees:
 *   https://dol.wa.gov/vehicles-and-boats/vehicles/vehicle-registration/vehicle-tab-fees
 * - Sound Transit RTA motor vehicle excise tax (1.1% of depreciated MSRP value in the RTA district).
 *
 * Values are approximations for estimating; they are NOT a substitute for the DOL fee calculator.
 */

export interface WaLocation {
  label: string;
  /** Combined state + local retail sales tax rate (before the 0.3% motor vehicle add-on). */
  salesTaxRate: number;
  /** Inside the Sound Transit RTA district (pays RTA excise tax at registration). */
  inRtaDistrict: boolean;
  /** Local transportation benefit district (TBD) annual vehicle fee. */
  tbdFee: number;
}

export const WA_LOCATIONS: Record<string, WaLocation> = {
  seattle: { label: "Seattle (King Co.)", salesTaxRate: 0.1035, inRtaDistrict: true, tbdFee: 80 },
  bellevue: { label: "Bellevue (King Co.)", salesTaxRate: 0.103, inRtaDistrict: true, tbdFee: 20 },
  bothell: { label: "Bothell (King/Snohomish Co.)", salesTaxRate: 0.104, inRtaDistrict: true, tbdFee: 20 },
  tacoma: { label: "Tacoma (Pierce Co.)", salesTaxRate: 0.103, inRtaDistrict: true, tbdFee: 0 },
  everett: { label: "Everett (Snohomish Co.)", salesTaxRate: 0.099, inRtaDistrict: true, tbdFee: 20 },
  olympia: { label: "Olympia (Thurston Co.)", salesTaxRate: 0.098, inRtaDistrict: false, tbdFee: 0 },
  spokane: { label: "Spokane (Spokane Co.)", salesTaxRate: 0.09, inRtaDistrict: false, tbdFee: 20 },
  vancouver: { label: "Vancouver (Clark Co.)", salesTaxRate: 0.089, inRtaDistrict: false, tbdFee: 40 },
  yakima: { label: "Yakima (Yakima Co.)", salesTaxRate: 0.083, inRtaDistrict: false, tbdFee: 0 },
  bellingham: { label: "Bellingham (Whatcom Co.)", salesTaxRate: 0.09, inRtaDistrict: false, tbdFee: 0 },
  other: { label: "Elsewhere in WA (state avg.)", salesTaxRate: 0.0885, inRtaDistrict: false, tbdFee: 0 },
};

/** Extra state sales/use tax on motor vehicles (on top of the location rate). */
export const MOTOR_VEHICLE_SALES_TAX = 0.003;

/** Sound Transit RTA excise: 0.3% (ST1/ST2) + 0.8% (ST3). */
export const RTA_EXCISE_RATE = 0.011;

/**
 * Sound Transit RTA depreciation schedule (share of base MSRP by vehicle age in years).
 * We approximate base MSRP from purchase price, because MSRP isn't available from our sources.
 */
export const RTA_DEPRECIATION_SCHEDULE = [1.0, 0.81, 0.72, 0.61, 0.5, 0.43, 0.35, 0.27, 0.2, 0.15, 0.1];

/** Recurring annual DOL fees (approximate). */
export const ANNUAL_FEES = {
  basicLicense: 30,
  /** Weight fee: passenger cars ~ up to 4,000 lb; SUVs/trucks/vans assumed 4,001–6,000 lb. */
  weightFeeCar: 25,
  weightFeeLight: 45,
  filingAndServiceFees: 18.75,
  stateRoadMaintenance: 0,
  /** Plug-in EV registration renewal fee + transportation electrification fee. */
  evFee: 150 + 75,
  /** Hybrid fee. */
  hybridFee: 75,
};

/** One-time fees when buying & titling a used vehicle (title, filing, plate transfer). */
export const ONE_TIME_TITLE_FEES = 15 + 12 + 10 + 12;

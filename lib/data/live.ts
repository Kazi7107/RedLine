/**
 * The live DataSource. NOT CONNECTED in this pass.
 *
 * To go live: implement each method below, then set USE_MOCK_DATA=false.
 * Nothing else in the app needs to change. lib/data/index.ts already runs
 * whatever this returns through the cost model.
 *
 * Read pattern for every method: check the Supabase cache table first; if
 * the row is missing or older than its refresh window, call the API, upsert
 * the cache, return. If the API fails or is rate limited, return the cached
 * row with `stale: true` instead of throwing.
 */
import "server-only";
import type { DataSource } from "./types";

class NotConnectedError extends Error {
  constructor(what: string) {
    super(`Live data isn't connected yet (${what}). Set USE_MOCK_DATA=true or implement lib/data/live.ts.`);
    this.name = "NotConnectedError";
  }
}

export const liveSource: DataSource = {
  name: "live",

  async listCatalog() {
    // TODO(db): select year, make, model, trims from vehicle_models join vehicle_trims (reference tables).
    throw new NotConnectedError("listCatalog");
  },

  async getVehicle() {
    // TODO(db): vehicle_trims row by key, or the most_common trim when given a model key.
    // TODO(db): MPG via fueleconomy_cache, refreshed from FuelEconomy.gov /ws/rest/vehicle/{id} monthly.
    // TODO(db): risk flags from the risk_flags reference table.
    throw new NotConnectedError("getVehicle");
  },

  async getSafety() {
    // TODO(db): nhtsa_cache by make/model/year. Refresh weekly from
    //   https://api.nhtsa.gov/recalls/recallsByVehicle and /complaints/complaintsByVehicle.
    // TODO(db): units_sold from vehicle_models (reference table).
    throw new NotConnectedError("getSafety");
  },

  async getGasPrice() {
    // TODO(db): gas_price_cache, refreshed weekly from the EIA v2 API (series EMM_EPMR_PTE_SWA_DPG). Needs EIA_API_KEY.
    throw new NotConnectedError("getGasPrice");
  },

  async getMarketValue() {
    // TODO(db): marketcheck_cache by trim + mileage bucket, refreshed daily. Needs MARKETCHECK_API_KEY.
    // On a 429 / monthly limit, return the last cached value with stale: true.
    throw new NotConnectedError("getMarketValue");
  },

  async getAaaStamp() {
    // TODO(db): aaa_cost_factors reference table (loaded by hand once a year from AAA Your Driving Costs).
    throw new NotConnectedError("getAaaStamp");
  },

  async getLocale() {
    // TODO(db): wa_tax_rates (WA DOR, quarterly) and wa_registration_fees (WA DOL) reference tables.
    throw new NotConnectedError("getLocale");
  },

  async decodeVin() {
    // TODO(db): NHTSA vPIC https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json,
    //   then match Make/Model/ModelYear/Trim to vehicle_trims.
    throw new NotConnectedError("decodeVin");
  },

  async getTypicalListing() {
    // TODO(db): median price + mileage from marketcheck_cache for this trim (or the most_common trim for a model key).
    throw new NotConnectedError("getTypicalListing");
  },
};

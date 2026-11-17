/**
 * U.S. Energy Information Administration Open Data API v2.
 * Requires a free key in EIA_API_KEY: https://www.eia.gov/opendata/register.php
 * Used for Washington State weekly retail fuel prices and monthly residential
 * electricity prices. Falls back to FuelEconomy.gov national averages.
 */
import { fetchJson } from "../http";
import type { FuelPrices } from "../types";
import { getNationalFuelPrices } from "./fueleconomy";

const BASE = "https://api.eia.gov/v2";
const SOURCE = "EIA";

interface EiaResponse {
  response: { data: { period: string; value: string | number | null; product?: string; price?: string | number }[] };
}

// EIA petroleum product codes (weekly retail, all formulations).
const PRODUCTS = { regular: "EPMR", midgrade: "EPMM", premium: "EPMP", diesel: "EPD2D" } as const;

async function latestGasPrice(apiKey: string, duoarea: string, product: string) {
  const url =
    `${BASE}/petroleum/pri/gnd/data/?api_key=${apiKey}&frequency=weekly&data[0]=value` +
    `&facets[duoarea][]=${duoarea}&facets[product][]=${product}` +
    `&sort[0][column]=period&sort[0][direction]=desc&length=1`;
  const d = await fetchJson<EiaResponse>(url, { source: SOURCE, revalidate: 60 * 60 * 12 });
  const row = d.response?.data?.[0];
  const v = Number(row?.value);
  if (!row || !Number.isFinite(v) || v <= 0) throw new Error(`EIA: no data for ${duoarea}/${product}`);
  return { value: v, period: row.period };
}

async function latestElectricityPrice(apiKey: string, state: string) {
  const url =
    `${BASE}/electricity/retail-sales/data/?api_key=${apiKey}&frequency=monthly&data[0]=price` +
    `&facets[stateid][]=${state}&facets[sectorid][]=RES` +
    `&sort[0][column]=period&sort[0][direction]=desc&length=1`;
  const d = await fetchJson<EiaResponse>(url, { source: SOURCE, revalidate: 60 * 60 * 24 });
  const cents = Number(d.response?.data?.[0]?.price);
  if (!Number.isFinite(cents) || cents <= 0) throw new Error(`EIA: no electricity price for ${state}`);
  return cents / 100;
}

/**
 * Best available fuel prices for a state. Uses EIA state series when a key is
 * configured; any series EIA can't provide is filled from national averages.
 */
export async function getFuelPrices(state = process.env.REDLINE_STATE || "WA"): Promise<FuelPrices> {
  const national = await getNationalFuelPrices();
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) return national;

  const duoarea = `S${state}`; // EIA uses e.g. "SWA" for Washington
  const [reg, mid, prem, dsl, elec] = await Promise.allSettled([
    latestGasPrice(apiKey, duoarea, PRODUCTS.regular),
    latestGasPrice(apiKey, duoarea, PRODUCTS.midgrade),
    latestGasPrice(apiKey, duoarea, PRODUCTS.premium),
    latestGasPrice(apiKey, duoarea, PRODUCTS.diesel),
    latestElectricityPrice(apiKey, state),
  ]);
  const pick = (r: PromiseSettledResult<{ value: number }>, fallback: number) => (r.status === "fulfilled" ? r.value.value : fallback);
  const anyState = [reg, mid, prem, dsl, elec].some((r) => r.status === "fulfilled");
  if (!anyState) return national;

  return {
    regular: pick(reg, national.regular),
    midgrade: pick(mid, national.midgrade),
    premium: pick(prem, national.premium),
    diesel: pick(dsl, national.diesel),
    e85: national.e85,
    electricityPerKwh: elec.status === "fulfilled" ? elec.value : national.electricityPerKwh,
    source: "EIA state averages (gaps filled with FuelEconomy.gov national averages)",
    region: state,
    asOf: reg.status === "fulfilled" ? reg.value.period : national.asOf,
  };
}

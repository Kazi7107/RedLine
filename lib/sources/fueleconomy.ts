/**
 * FuelEconomy.gov web services (U.S. DOE / EPA). No API key required.
 * Docs: https://www.fueleconomy.gov/feg/ws/
 * Used for EPA combined MPG per trim, and national average gas prices when
 * there's no EIA key. Ported from the backend branch.
 */
import "server-only";
import { fetchJson } from "./http";

const BASE = "https://www.fueleconomy.gov/ws/rest";
const SOURCE = "FuelEconomy.gov";

const num = (s: string | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** EPA combined MPG for a FuelEconomy.gov vehicle id. */
export async function getCombinedMpg(epaId: number): Promise<number> {
  const v = await fetchJson<{ comb08?: string }>(`${BASE}/vehicle/${epaId}`, { source: SOURCE, revalidate: 60 * 60 * 24 * 30 });
  const mpg = num(v.comb08);
  if (mpg <= 0) throw new Error(`FuelEconomy.gov: no MPG for vehicle ${epaId}`);
  return mpg;
}

/** National average regular gas, $/gal. Updated weekly by DOE. */
export async function getNationalRegular(): Promise<number> {
  const p = await fetchJson<Record<string, string>>(`${BASE}/fuelprices`, { source: SOURCE, revalidate: 60 * 60 * 12 });
  const v = num(p.regular);
  if (v <= 0) throw new Error("FuelEconomy.gov: no regular gas price");
  return v;
}

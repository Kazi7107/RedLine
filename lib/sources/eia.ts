/**
 * U.S. Energy Information Administration Open Data API v2.
 * Free key in EIA_API_KEY: https://www.eia.gov/opendata/register.php
 * The key goes in the X-Api-Key header, never the URL. Ported from the
 * backend branch.
 */
import "server-only";
import { fetchJson } from "./http";

const BASE = "https://api.eia.gov/v2";

interface EiaResponse {
  response?: { data?: { period: string; value: string | number | null }[] };
}

/** Latest weekly retail price of regular gas in a state (EIA duoarea "SWA" = Washington). */
export async function getStateRegular(apiKey: string, state = "WA"): Promise<{ value: number; period: string }> {
  const url =
    `${BASE}/petroleum/pri/gnd/data/?frequency=weekly&data[0]=value` +
    `&facets[duoarea][]=S${state}&facets[product][]=EPMR` +
    `&sort[0][column]=period&sort[0][direction]=desc&length=1`;
  const d = await fetchJson<EiaResponse>(url, { source: "EIA", revalidate: 60 * 60 * 12, headers: { "X-Api-Key": apiKey } });
  const row = d.response?.data?.[0];
  const v = Number(row?.value);
  if (!row || !Number.isFinite(v) || v <= 0) throw new Error(`EIA: no regular gas price for ${state}`);
  return { value: v, period: row.period };
}

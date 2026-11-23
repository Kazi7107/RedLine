/**
 * NHTSA APIs. No API key required.
 * - vPIC VIN decoder: https://vpic.nhtsa.dot.gov/api/
 * - Recalls and complaints: https://www.nhtsa.gov/nhtsa-datasets-and-apis
 * Ported from the backend branch (webapp/src/lib/sources/nhtsa.ts).
 */
import "server-only";
import { SourceError, fetchJson } from "./http";
import type { RawComplaint, RawRecall } from "./nhtsa-normalize";

const VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles";
const API = "https://api.nhtsa.gov";
const DAY = 60 * 60 * 24;

/** NHTSA answers "no results" with HTTP 400 and an empty list. That is an answer, not an outage. */
async function orEmpty<T>(p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof SourceError && err.status === 400) return [];
    throw err;
  }
}

const q = (year: number, make: string, model: string) =>
  `make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;

export interface VpicDecode {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  displacementL: string | null;
  electrification: string | null;
  errorText: string | null;
}

export async function decodeVin(vin: string): Promise<VpicDecode> {
  const data = await fetchJson<{ Results: Record<string, string>[] }>(`${VPIC}/DecodeVinValues/${vin}?format=json`, {
    source: "NHTSA vPIC",
    revalidate: DAY * 365,
  });
  const r = data.Results?.[0] ?? {};
  return {
    year: Number(r.ModelYear) || null,
    make: r.Make || null,
    model: r.Model || null,
    trim: r.Trim || r.Series || null,
    displacementL: r.DisplacementL || null,
    electrification: r.ElectrificationLevel || null,
    errorText: r.ErrorCode && r.ErrorCode !== "0" ? r.ErrorText : null,
  };
}

export function getRecalls(year: number, make: string, model: string): Promise<RawRecall[]> {
  return orEmpty(fetchRecalls(year, make, model));
}

async function fetchRecalls(year: number, make: string, model: string): Promise<RawRecall[]> {
  const d = await fetchJson<{ Count: number; results: RawRecall[] }>(`${API}/recalls/recallsByVehicle?${q(year, make, model)}`, {
    source: "NHTSA Recalls",
    revalidate: DAY,
  });
  return d.results ?? [];
}

/**
 * Every complaint for a year/make/model. Popular cars have thousands, which
 * can pass Next's 2 MB cache limit, so this skips the fetch cache; the caller
 * caches the much smaller per-category counts.
 */
export function getComplaints(year: number, make: string, model: string): Promise<RawComplaint[]> {
  return orEmpty(fetchComplaints(year, make, model));
}

async function fetchComplaints(year: number, make: string, model: string): Promise<RawComplaint[]> {
  const d = await fetchJson<{ count: number; results: RawComplaint[] }>(`${API}/complaints/complaintsByVehicle?${q(year, make, model)}`, {
    source: "NHTSA Complaints",
    noStore: true,
    timeoutMs: 15_000,
  });
  return (d.results ?? []).map(({ components, summary }) => ({ components, summary }));
}

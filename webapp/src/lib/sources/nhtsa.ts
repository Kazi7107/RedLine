/**
 * NHTSA APIs. No API key required.
 * - vPIC VIN decoder: https://vpic.nhtsa.dot.gov/api/
 * - Recalls / complaints / 5-Star Safety Ratings: https://www.nhtsa.gov/nhtsa-datasets-and-apis
 */
import { fetchJson } from "../http";
import type { SafetySummary, VinDecode } from "../types";

const VPIC = "https://vpic.nhtsa.dot.gov/api/vehicles";
const API = "https://api.nhtsa.gov";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i;
export const isValidVin = (vin: string) => VIN_RE.test(vin.trim());

export async function decodeVin(vin: string): Promise<VinDecode> {
  const clean = vin.trim().toUpperCase();
  const data = await fetchJson<{ Results: Record<string, string>[] }>(
    `${VPIC}/DecodeVinValues/${clean}?format=json`,
    { source: "NHTSA vPIC", revalidate: 60 * 60 * 24 * 365 },
  );
  const r = data.Results?.[0] ?? {};
  return {
    vin: clean,
    year: Number(r.ModelYear) || null,
    make: r.Make || null,
    model: r.Model || null,
    trim: r.Trim || null,
    bodyClass: r.BodyClass || null,
    fuelType: r.FuelTypePrimary || null,
    errorText: r.ErrorCode && r.ErrorCode !== "0" ? r.ErrorText : null,
  };
}

interface RecallsResponse {
  Count: number;
  results: { NHTSACampaignNumber: string; Component: string; Summary: string; ReportReceivedDate: string }[];
}
interface ComplaintsResponse {
  count: number;
}
interface RatingsListResponse {
  Results: { VehicleDescription: string; VehicleId: number }[];
}
interface RatingResponse {
  Results: { OverallRating: string; VehicleDescription: string }[];
}

const q = (year: number, make: string, model: string) =>
  `make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;

/**
 * Recalls, complaint count and overall NHTSA star rating for a year/make/model.
 * Each sub-request fails independently so one outage doesn't blank the panel.
 * `model` should be the base model (e.g. "Civic", not "Civic 4Dr").
 */
export async function getSafetySummary(year: number, make: string, model: string): Promise<SafetySummary> {
  const day = 60 * 60 * 24;
  const [recalls, complaints, ratings] = await Promise.allSettled([
    fetchJson<RecallsResponse>(`${API}/recalls/recallsByVehicle?${q(year, make, model)}`, { source: "NHTSA Recalls", revalidate: day }),
    fetchJson<ComplaintsResponse>(`${API}/complaints/complaintsByVehicle?${q(year, make, model)}`, { source: "NHTSA Complaints", revalidate: day }),
    (async () => {
      const list = await fetchJson<RatingsListResponse>(
        `${API}/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`,
        { source: "NHTSA Safety Ratings", revalidate: day * 30 },
      );
      const first = list.Results?.[0];
      if (!first) return null;
      const detail = await fetchJson<RatingResponse>(`${API}/SafetyRatings/VehicleId/${first.VehicleId}`, {
        source: "NHTSA Safety Ratings",
        revalidate: day * 30,
      });
      const r = detail.Results?.[0];
      const stars = Number(r?.OverallRating);
      return Number.isFinite(stars) && stars > 0 ? { stars, description: r.VehicleDescription } : null;
    })(),
  ]);

  const errors: string[] = [];
  for (const r of [recalls, complaints, ratings]) if (r.status === "rejected") errors.push(String((r.reason as Error).message));

  return {
    recallCount: recalls.status === "fulfilled" ? recalls.value.Count : null,
    recalls:
      recalls.status === "fulfilled"
        ? recalls.value.results.slice(0, 10).map((x) => ({
            campaign: x.NHTSACampaignNumber,
            component: x.Component,
            summary: x.Summary,
            reported: x.ReportReceivedDate,
          }))
        : [],
    complaintCount: complaints.status === "fulfilled" ? complaints.value.count : null,
    overallStars: ratings.status === "fulfilled" ? (ratings.value?.stars ?? null) : null,
    ratedVehicle: ratings.status === "fulfilled" ? (ratings.value?.description ?? null) : null,
    errors,
  };
}

/**
 * FuelEconomy.gov web services (U.S. DOE / EPA). No API key required.
 * Docs: https://www.fueleconomy.gov/feg/ws/
 * Used for: the year → make → model → trim picker, EPA MPG / kWh figures,
 * vehicle class, and national average fuel prices (fallback when no EIA key).
 */
import { asArray, fetchJson } from "../http";
import type { FuelPrices, MenuItem, VehicleSpec } from "../types";

const BASE = "https://www.fueleconomy.gov/ws/rest";
const SOURCE = "FuelEconomy.gov";

interface MenuResponse {
  menuItem?: MenuItem | MenuItem[];
}

async function menu(path: string, revalidate = 60 * 60 * 24 * 7): Promise<MenuItem[]> {
  const data = await fetchJson<MenuResponse>(`${BASE}${path}`, { source: SOURCE, revalidate });
  return asArray(data.menuItem);
}

export const getYears = () => menu("/vehicle/menu/year");

export const getMakes = (year: number) => menu(`/vehicle/menu/make?year=${year}`);

export const getModels = (year: number, make: string) =>
  menu(`/vehicle/menu/model?year=${year}&make=${encodeURIComponent(make)}`);

/** Options are trims/powertrains; `value` is the EPA vehicle id. */
export const getOptions = (year: number, make: string, model: string) =>
  menu(`/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`);

/** Raw shape (subset) of /vehicle/{id}. All values arrive as strings. */
interface RawVehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  baseModel?: string;
  VClass: string;
  atvType?: string;
  fuelType: string;
  fuelType1: string;
  fuelType2?: string;
  comb08: string;
  city08: string;
  highway08: string;
  combE?: string;
  combinedUF?: string;
  combA08?: string;
  cylinders?: string;
  displ?: string;
  drive?: string;
  trany?: string;
  range?: string;
}

const num = (s: string | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeVehicle(v: RawVehicle): VehicleSpec {
  const atv = (v.atvType ?? "").trim();
  const powertrain: VehicleSpec["powertrain"] =
    atv === "EV" ? "ev" : atv === "Plug-in Hybrid" ? "phev" : atv === "Hybrid" ? "hybrid" : atv === "Diesel" ? "diesel" : "gas";
  return {
    epaId: num(v.id),
    year: num(v.year),
    make: v.make,
    model: v.model,
    baseModel: v.baseModel || v.model,
    vehicleClass: v.VClass,
    powertrain,
    fuelType: v.fuelType1 || v.fuelType,
    mpgCombined: num(v.comb08),
    mpgCity: num(v.city08),
    mpgHighway: num(v.highway08),
    kwhPer100mi: num(v.combE),
    phevUtilityFactor: num(v.combinedUF),
    description: [v.trany, v.cylinders && `${v.cylinders} cyl`, v.displ && `${v.displ} L`, v.drive].filter(Boolean).join(", "),
    evRangeMiles: num(v.range),
  };
}

export async function getVehicle(epaId: number): Promise<VehicleSpec> {
  const raw = await fetchJson<RawVehicle>(`${BASE}/vehicle/${epaId}`, { source: SOURCE, revalidate: 60 * 60 * 24 * 30 });
  return normalizeVehicle(raw);
}

/** National average fuel prices, $/gal (electric is $/kWh). Updated weekly by DOE. */
export async function getNationalFuelPrices(): Promise<FuelPrices> {
  const p = await fetchJson<Record<string, string>>(`${BASE}/fuelprices`, { source: SOURCE, revalidate: 60 * 60 * 12 });
  return {
    regular: num(p.regular),
    midgrade: num(p.midgrade),
    premium: num(p.premium),
    diesel: num(p.diesel),
    e85: num(p.e85),
    electricityPerKwh: num(p.electric),
    source: "FuelEconomy.gov national averages",
    region: "US",
    asOf: new Date().toISOString().slice(0, 10),
  };
}

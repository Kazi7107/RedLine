import { NextResponse } from "next/server";
import { fetchJson } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Checks each upstream data source and reports which are reachable. */
export async function GET() {
  const checks: Record<string, () => Promise<unknown>> = {
    fueleconomy: () => fetchJson("https://www.fueleconomy.gov/ws/rest/vehicle/menu/year", { source: "FuelEconomy.gov", revalidate: 0 }),
    nhtsaRecalls: () =>
      fetchJson("https://api.nhtsa.gov/recalls/recallsByVehicle?make=honda&model=civic&modelYear=2018", { source: "NHTSA", revalidate: 0 }),
    nhtsaVpic: () => fetchJson("https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json", { source: "vPIC", revalidate: 0 }),
    eia: async () => {
      if (!process.env.EIA_API_KEY) throw new Error("EIA_API_KEY not set (using national fallback prices)");
      return fetchJson("https://api.eia.gov/v2/petroleum/pri/gnd/", { source: "EIA", revalidate: 0, headers: { "X-Api-Key": process.env.EIA_API_KEY } });
    },
  };
  const entries = await Promise.all(
    Object.entries(checks).map(async ([name, fn]) => {
      const t = Date.now();
      try {
        await fn();
        return [name, { ok: true, ms: Date.now() - t }] as const;
      } catch (e) {
        return [name, { ok: false, ms: Date.now() - t, error: (e as Error).message }] as const;
      }
    }),
  );
  const result = Object.fromEntries(entries);
  const ok = result.fueleconomy.ok; // the only hard dependency
  return NextResponse.json({ ok, sources: result }, { status: ok ? 200 : 503 });
}

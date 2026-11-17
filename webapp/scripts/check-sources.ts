/**
 * Live smoke test against every external data source.
 * Run: npm run check:sources
 */
import { getMakes, getModels, getOptions, getVehicle, getYears } from "../src/lib/sources/fueleconomy";
import { decodeVin, getSafetySummary } from "../src/lib/sources/nhtsa";
import { getFuelPrices } from "../src/lib/sources/eia";
import { estimateOwnership } from "../src/lib/cost-model";

async function step<T>(name: string, fn: () => Promise<T>, show: (v: T) => string) {
  const t = Date.now();
  try {
    const v = await fn();
    console.log(`OK   ${name} (${Date.now() - t}ms): ${show(v)}`);
    return v;
  } catch (e) {
    console.log(`FAIL ${name} (${Date.now() - t}ms): ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  await step("FuelEconomy.gov years", getYears, (y) => `${y.length} years, latest ${y[0]?.value}`);
  await step("FuelEconomy.gov makes 2018", () => getMakes(2018), (m) => `${m.length} makes`);
  await step("FuelEconomy.gov models 2018 Honda", () => getModels(2018, "Honda"), (m) => m.slice(0, 4).map((x) => x.value).join(", "));
  const opts = await step("FuelEconomy.gov options 2018 Honda Civic 4Dr", () => getOptions(2018, "Honda", "Civic 4Dr"),
    (o) => o.map((x) => `${x.value}:${x.text}`).join(" | "));
  const vehicle = await step("FuelEconomy.gov vehicle", () => getVehicle(Number(opts?.[0]?.value ?? 39566)),
    (v) => `${v.year} ${v.make} ${v.model}, ${v.mpgCombined} MPG, ${v.vehicleClass}`);
  const prices = await step("Fuel prices (EIA, else national fallback)", () => getFuelPrices(),
    (p) => `${p.source}: regular $${p.regular}, electric $${p.electricityPerKwh}/kWh`);
  await step("NHTSA safety summary", () => getSafetySummary(2018, "Honda", "Civic"),
    (s) => `${s.recallCount} recalls, ${s.complaintCount} complaints, ${s.overallStars ?? "n/a"} stars${s.errors.length ? ` (errors: ${s.errors.join("; ")})` : ""}`);
  await step("NHTSA vPIC VIN decode", () => decodeVin("19XFC2F59JE000000"), (d) => `${d.year} ${d.make} ${d.model}`);

  if (vehicle && prices) {
    const est = estimateOwnership(vehicle, {
      purchasePrice: 18000, currentMileage: 60000, milesPerYear: 12000, location: "seattle",
      driverAge: "25to64", coverage: "full", years: 5,
    }, prices);
    console.log(`\nEnd-to-end estimate: $${est.totals.total.toLocaleString()} over 5 years`, est.totals);
  }
}

main();

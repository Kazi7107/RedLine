import { afterEach, describe, expect, it } from "vitest";
import { decodeVin, getCatalog, getEstimate, parseEstimateRequest } from "@/lib/data";
import type { EstimateFull } from "@/lib/data";
import { overHorizon } from "@/lib/cost/horizon";
import { SAMPLE_VINS } from "@/lib/data/mock";
import { vinError, zipError } from "@/lib/validation";

const req = (key: string, mileage: number, price: number) => ({ key, mileage, price, zip: "98201", annualMiles: 12000 });
const full = async (key: string, mileage: number, price: number) => {
  const r = await getEstimate(req(key, mileage, price), { latency: false });
  expect(r.status).toBe("ok");
  return r as EstimateFull;
};

describe("mock catalog", () => {
  it("seeds 20 to 30 cars including the required ones", async () => {
    const catalog = await getCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(20);
    expect(catalog.length).toBeLessThanOrEqual(30);
    const keys = catalog.map((c) => c.key);
    for (const k of [
      "2017-honda-civic", "2018-honda-civic", "2016-toyota-corolla", "2015-ford-focus", "2018-toyota-camry",
      "2017-honda-accord", "2015-ford-f-150", "2016-bmw-3-series", "2014-toyota-prius", "2015-toyota-prius",
      "2019-mazda-cx-5", "2018-toyota-rav4", "2018-toyota-rav4-hybrid", "2017-toyota-tacoma", "2016-nissan-frontier",
    ]) expect(keys).toContain(k);
  });

  it("marks exactly one most-common trim per model", async () => {
    for (const m of await getCatalog()) expect(m.trims.filter((t) => t.mostCommon)).toHaveLength(1);
  });
});

describe("getEstimate", () => {
  it("returns the full response shape", async () => {
    const r = await full("2016-toyota-corolla-le", 74200, 14200);
    expect(r.stage).toBe("full");
    expect(r.vehicle.name).toBe("2016 Toyota Corolla LE");
    expect(r.categories.map((c) => c.label)).toEqual([
      "Value you lose", "Fuel", "Insurance", "Maintenance", "Repairs", "Taxes and registration",
    ]);
    for (const c of r.categories) expect(c.method.sources.length).toBeGreaterThan(0);
    expect(r.categories.find((c) => c.key === "taxes")!.note).toBe("Based on your ZIP");
    expect(r.categories.filter((c) => c.isEstimate).map((c) => c.key)).toEqual(["insurance", "repairs"]);
  });

  it("summary stage leaves out the breakdown", async () => {
    const r = await getEstimate(req("2016-toyota-corolla-le", 74200, 14200), { stage: "summary", latency: false });
    expect(r.status).toBe("ok");
    expect("categories" in r).toBe(false);
  });

  it("the 2015 Focus is cheapest to buy but costs more to own than the 2016 Corolla", async () => {
    const focus = await full("2015-ford-focus-se", 81500, 8900);
    const corolla = await full("2016-toyota-corolla-le", 74200, 14200);
    expect(focus.inputs.price).toBeLessThan(corolla.inputs.price);
    expect(overHorizon(focus.years, 5).mid).toBeGreaterThan(overHorizon(corolla.years, 5).mid);
    expect(focus.riskFlags.map((f) => f.component)).toContain("Transmission");
    expect(focus.reliability.isRisk).toBe(true);
  });

  it("flags the hybrid battery on older Priuses at $2,000 to $4,000", async () => {
    const prius = await full("2014-toyota-prius-two", 128000, 11900);
    const flag = prius.riskFlags.find((f) => f.id === "hybrid-battery")!;
    expect([flag.costLow, flag.costHigh]).toEqual([2000, 4000]);
  });

  it("'Not sure' trim uses the most common trim and says so", async () => {
    const r = await full("2016-toyota-corolla", 74200, 14200);
    expect(r.vehicle.trimAssumed).toBe(true);
    expect(r.vehicle.trim).toBe("LE");
    expect(r.vehicle.key).toBe("2016-toyota-corolla");
  });

  it("returns insufficient_data for cars we can't price honestly", async () => {
    const r = await getEstimate(req("2009-saturn-astra-xr", 132000, 4500), { latency: false });
    expect(r.status).toBe("insufficient_data");
    if (r.status === "insufficient_data") {
      expect(r.coverage.filter((c) => !c.found).map((c) => c.label)).toEqual(["Repair costs", "Insurance"]);
    }
  });

  it("returns not_found for unknown cars", async () => {
    const r = await getEstimate(req("1999-delorean-dmc", 1000, 5000), { latency: false });
    expect(r).toMatchObject({ status: "error", code: "not_found" });
  });

  describe("stale MarketCheck price", () => {
    afterEach(() => {
      delete process.env.MOCK_MARKETCHECK_LIMIT_HIT;
    });
    it("marks the price stamp stale when the monthly limit is hit", async () => {
      process.env.MOCK_MARKETCHECK_LIMIT_HIT = "true";
      const r = await full("2016-toyota-corolla-le", 74200, 14200);
      expect(r.priceStamp.stale).toBe(true);
    });
  });
});

describe("parseEstimateRequest", () => {
  it("accepts good input and defaults annual miles", () => {
    const r = parseEstimateRequest({ key: "2016-toyota-corolla-le", mileage: "74200", price: "14200", zip: "98201" });
    expect(r).toEqual({ ok: true, value: req("2016-toyota-corolla-le", 74200, 14200) });
  });

  it("explains every bad field", () => {
    const r = parseEstimateRequest({ key: "", mileage: "abc", price: "50", zip: "97201", miles: "200" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.error.fields ?? {}).sort()).toEqual(["annualMiles", "key", "mileage", "price", "zip"]);
  });
});

describe("validation", () => {
  it("only accepts Washington ZIPs", () => {
    expect(zipError("98201")).toBeNull();
    expect(zipError("99403")).toBeNull();
    expect(zipError("97201")).toMatch(/Washington/);
    expect(zipError("9820")).toMatch(/5 digits/);
  });

  it("checks VIN format", () => {
    expect(vinError("")).toBeNull();
    expect(vinError("2T1BURHE5GC512345")).toBeNull();
    expect(vinError("2T1BURHE5GC51234")).toMatch(/17/);
    expect(vinError("2T1BURHE5GC5123O5")).toMatch(/I, O or Q/);
  });

  it("decodes the sample VINs", async () => {
    expect(SAMPLE_VINS.length).toBeGreaterThan(5);
    const r = await decodeVin(SAMPLE_VINS[0], { latency: false });
    expect(r?.year).toBeTypeOf("number");
    expect(await decodeVin("1HGBH41JXMN109186", { latency: false })).toBeNull();
  });
});

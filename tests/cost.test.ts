import { describe, expect, it } from "vitest";
import { calculateCosts, crossings, OWNERSHIP_YEARS, RULES, rtaScheduleFactor } from "@/lib/cost/calculate";
import type { CostInputs, VehicleFacts } from "@/lib/cost/types";

const facts: VehicleFacts = {
  modelYear: 2016,
  vehicleClass: "compact",
  mpgCombined: 32,
  msrp: 19000,
  germanLuxury: false,
  resaleFactor: 0.85,
  syntheticOil: false,
  riskFlags: [],
};

const base: CostInputs = {
  facts,
  locale: { zip: "98201", city: "Everett", county: "Snohomish", salesTaxRate: 0.099, rta: true },
  mileage: 74200,
  askingPrice: 14200,
  marketValue: 14200,
  annualMiles: 12000,
  gasPrice: 4.29,
  reliabilityScore: 88,
  asOfYear: 2026,
};

const cat = (r: ReturnType<typeof calculateCosts>, key: string) => r.categories.find((c) => c.key === key)!;
const mid = (y: { low: number; high: number }) => (y.low + y.high) / 2;
const total = (ys: { low: number; high: number }[]) => ys.reduce((a, y) => a + mid(y), 0);

describe("calculateCosts", () => {
  it("returns six categories with five years each", () => {
    const r = calculateCosts(base);
    expect(r.categories.map((c) => c.key)).toEqual(["depreciation", "fuel", "insurance", "maintenance", "repairs", "taxes"]);
    for (const c of r.categories) expect(c.years).toHaveLength(OWNERSHIP_YEARS);
    expect(r.years).toHaveLength(OWNERSHIP_YEARS);
  });

  it("is deterministic", () => {
    expect(calculateCosts(base)).toEqual(calculateCosts(base));
  });

  it("year totals equal the sum of categories", () => {
    const r = calculateCosts(base);
    for (let y = 0; y < OWNERSHIP_YEARS; y++) {
      const sum = r.categories.reduce((a, c) => a + c.years[y].low, 0);
      expect(r.years[y].low).toBe(sum);
    }
  });

  it("year 1 fuel = miles / mpg * gas price", () => {
    const r = calculateCosts(base);
    expect(cat(r, "fuel").years[0].low).toBe(Math.round((12000 / 32) * 4.29));
  });

  it("only insurance and repairs are ranges", () => {
    const r = calculateCosts(base);
    expect(r.categories.filter((c) => c.isRange).map((c) => c.key)).toEqual(["insurance", "repairs"]);
    for (const y of cat(r, "insurance").years) expect(y.high).toBeGreaterThan(y.low);
  });

  it("charges sales tax in year 1 only", () => {
    const r = calculateCosts(base);
    const taxes = cat(r, "taxes").years;
    expect(taxes[0].low).toBeGreaterThan(14200 * 0.099);
    expect(taxes[1].low).toBeLessThan(400);
  });

  it("adds the RTA excise only inside the Sound Transit district", () => {
    const inside = cat(calculateCosts(base), "taxes").years[1].low;
    const outside = cat(calculateCosts({ ...base, locale: { ...base.locale, rta: false } }), "taxes").years[1].low;
    expect(inside - outside).toBe(Math.round(19000 * rtaScheduleFactor(11) * RULES.rtaRate));
  });

  it("counts paying over market value as value lost on day one", () => {
    const fair = calculateCosts(base);
    const over = calculateCosts({ ...base, askingPrice: 15200 });
    expect(over.overMarket).toBe(1000);
    expect(cat(over, "depreciation").years[0].low - cat(fair, "depreciation").years[0].low).toBe(1000);
  });
});

describe("methodology adjustments", () => {
  it("adds 25% to repairs once a car is over 10 years old", () => {
    // Same car, same mileage: 10 years old vs 11 years old in year 1.
    const ten = calculateCosts({ ...base, asOfYear: 2026, facts: { ...facts, modelYear: 2016 } });
    const eleven = calculateCosts({ ...base, asOfYear: 2026, facts: { ...facts, modelYear: 2015 } });
    const r10 = cat(ten, "repairs").years[0].low;
    const r11 = cat(eleven, "repairs").years[0].low;
    expect(r11 / r10).toBeCloseTo(RULES.oldCarRepairMultiplier, 2);
  });

  it("charges German luxury brands 40 to 50% more for repairs", () => {
    const regular = cat(calculateCosts(base), "repairs").years[0].low;
    const german = cat(calculateCosts({ ...base, facts: { ...facts, germanLuxury: true } }), "repairs").years[0].low;
    const ratio = german / regular;
    expect(ratio).toBeGreaterThanOrEqual(1.4);
    expect(ratio).toBeLessThanOrEqual(1.5);
  });

  it("widens repairs for a known risk, most around its peak year", () => {
    const risky = calculateCosts({
      ...base,
      facts: {
        ...facts,
        riskFlags: [{ id: "t", component: "Transmission", title: "", body: "", costLow: 1800, costHigh: 4200, probability: 0.55, peakYear: 2, checkTip: "" }],
      },
    });
    const plain = calculateCosts(base);
    const extra = cat(risky, "repairs").years.map((y, i) => y.high - cat(plain, "repairs").years[i].high);
    expect(extra[1]).toBe(Math.max(...extra));
    expect(extra[4]).toBe(0);
  });
});

describe("year-by-year growth", () => {
  it("repairs grow every year", () => {
    const ys = cat(calculateCosts(base), "repairs").years.map(mid);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
  });

  it("running costs (fuel, insurance, maintenance, repairs) grow every year", () => {
    const r = calculateCosts(base);
    const running = Array.from({ length: OWNERSHIP_YEARS }, (_, y) =>
      ["fuel", "insurance", "maintenance", "repairs"].reduce((a, k) => a + mid(cat(r, k).years[y]), 0),
    );
    for (let i = 1; i < running.length; i++) expect(running[i]).toBeGreaterThan(running[i - 1]);
  });

  it("after the year-1 sales tax, total cost rises each year", () => {
    const ys = calculateCosts(base).years.map(mid);
    for (let i = 2; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
  });

  it("depreciation shrinks as the car is worth less", () => {
    const ys = cat(calculateCosts(base), "depreciation").years.map(mid);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
  });

  it("driving more costs more", () => {
    expect(total(calculateCosts({ ...base, annualMiles: 18000 }).years)).toBeGreaterThan(total(calculateCosts(base).years));
  });
});

describe("helpers", () => {
  it("counts odometer interval crossings", () => {
    expect(crossings(74200, 86200, 5000)).toBe(3); // 75k, 80k, 85k
    expect(crossings(0, 4999, 5000)).toBe(0);
    expect(crossings(4999, 5000, 5000)).toBe(1);
  });

  it("schedules a tire set when the odometer crosses 50k-mile marks", () => {
    const r = calculateCosts(base); // 74,200 -> 134,200: crosses 100k in year 3
    const tires = r.maintenanceItems.filter((i) => i.item === "New set of tires");
    expect(tires.map((t) => t.year)).toEqual([3]);
  });
});

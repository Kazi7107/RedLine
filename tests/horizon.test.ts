import { describe, expect, it } from "vitest";
import { biggestCategory, growthRates, monthlyCost, overHorizon } from "@/lib/cost/horizon";
import type { CategoryKey } from "@/lib/cost/types";

const years = [
  { low: 6000, high: 7000 },
  { low: 5000, high: 6000 },
  { low: 5200, high: 6200 },
  { low: 5400, high: 6400 },
  { low: 5600, high: 6600 },
];

describe("monthlyCost", () => {
  it("spreads a 5-year total over 60 months, rounded to $5", () => {
    expect(monthlyCost(25200, 5)).toBe(420);
    expect(monthlyCost(27000, 5)).toBe(450);
    expect(monthlyCost(30524, 5)).toBe(510); // 508.7 -> 510
  });

  it("spreads a 1-year total over 12 months", () => {
    expect(monthlyCost(6000, 1)).toBe(500);
  });

  it("never returns negative or NaN", () => {
    expect(monthlyCost(0, 5)).toBe(0);
    expect(monthlyCost(-100, 5)).toBe(0);
    expect(monthlyCost(Number.NaN, 5)).toBe(0);
  });
});

describe("overHorizon", () => {
  it("1-year uses only the first year", () => {
    expect(overHorizon(years, 1)).toEqual({ low: 6000, high: 7000, mid: 6500 });
  });

  it("5-year sums every year", () => {
    expect(overHorizon(years, 5)).toEqual({ low: 27200, high: 32200, mid: 29700 });
  });
});

describe("biggestCategory", () => {
  const cats: { key: CategoryKey; years: typeof years }[] = [
    { key: "fuel", years: years.map(() => ({ low: 1600, high: 1600 })) },
    { key: "taxes", years: [{ low: 2000, high: 2000 }, ...years.slice(1).map(() => ({ low: 100, high: 100 }))] },
    { key: "repairs", years: years.map(() => ({ low: 800, high: 2000 })) },
  ];

  it("can differ between 1 and 5 years", () => {
    expect(biggestCategory(cats, 1)?.key).toBe("taxes");
    expect(biggestCategory(cats, 5)?.key).toBe("fuel");
  });

  it("returns undefined for no categories", () => {
    expect(biggestCategory([], 5)).toBeUndefined();
  });
});

describe("growthRates", () => {
  it("computes year-over-year change", () => {
    expect(growthRates([100, 110, 121])).toEqual([0.1, 0.1]);
  });
});

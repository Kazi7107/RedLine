import { describe, expect, it } from "vitest";
import { barScale, gaugeAngle, lineBars, niceAxis, totalsFor, yearColumns } from "@/lib/view";
import { carName, makesOf, modelsOf, resolveKey, yearsOf } from "@/lib/catalog";
import type { CatalogModel } from "@/lib/data/types";
import type { CategoryKey, YearRange } from "@/lib/cost/types";

const flat = (v: number, n = 5): YearRange[] => Array.from({ length: n }, () => ({ low: v, high: v }));
const cat = (key: CategoryKey, years: YearRange[], isRange = false) => ({ key, years, isRange });

describe("totalsFor", () => {
  it("pairs the total with a monthly figure", () => {
    const t = totalsFor(flat(6000), 5);
    expect(t.total.mid).toBe(30000);
    expect(t.monthly).toBe(500);
  });
  it("1-year horizon spreads over 12 months", () => {
    expect(totalsFor(flat(6000), 1).monthly).toBe(500);
  });
});

describe("lineBars", () => {
  const cats = [
    cat("fuel", flat(1500)),
    cat("repairs", flat(500).map((r) => ({ low: r.low, high: r.high * 3 })), true),
  ];

  it("scales bars against a shared max and splits ranges into solid + spread", () => {
    const scale = barScale([{ categories: cats }], 5);
    expect(scale).toBe(7500);
    const [fuel, repairs] = lineBars(cats, 5, scale);
    expect(fuel.solid).toBe(100);
    expect(fuel.spread).toBe(0);
    expect(repairs.solid).toBeCloseTo(33.3, 1);
    expect(repairs.spread).toBeCloseTo(66.7, 1);
  });

  it("marks exactly one biggest category", () => {
    const bars = lineBars(cats, 5, 7500);
    expect(bars.filter((b) => b.isBiggest).map((b) => b.key)).toEqual(["fuel"]);
  });

  it("reports a per-year average", () => {
    expect(lineBars(cats, 5, 7500)[0].perYear.mid).toBe(1500);
  });
});

describe("yearColumns", () => {
  it("stacks midpoints per year and keeps the high for the 'could run this high' cap", () => {
    const cols = yearColumns([cat("fuel", flat(1000)), cat("repairs", flat(400).map(() => ({ low: 200, high: 600 })), true)]);
    expect(cols).toHaveLength(5);
    expect(cols[0].mid).toBe(1400);
    expect(cols[0].high).toBe(1600);
    expect(cols[0].segments.map((s) => s.key)).toEqual(["fuel", "repairs"]);
  });

  it("shows growth when the underlying costs grow", () => {
    const growing = Array.from({ length: 5 }, (_, i) => ({ low: 1000 + i * 100, high: 1000 + i * 100 }));
    const mids = yearColumns([cat("fuel", growing)]).map((c) => c.mid);
    expect(mids).toEqual([...mids].sort((a, b) => a - b));
    expect(mids[4]).toBeGreaterThan(mids[0]);
  });
});

describe("niceAxis", () => {
  it("rounds up to a readable max", () => {
    expect(niceAxis(7450)).toEqual({ max: 8000, step: 2000 });
    expect(niceAxis(0)).toEqual({ max: 1000, step: 250 });
  });
});

describe("gaugeAngle", () => {
  it("maps 0..100 onto -90..90 degrees and clamps", () => {
    expect(gaugeAngle(0)).toBe(-90);
    expect(gaugeAngle(50)).toBe(0);
    expect(gaugeAngle(140)).toBe(90);
  });
});

describe("catalog helpers", () => {
  const catalog: CatalogModel[] = [
    { key: "2016-toyota-corolla", year: 2016, make: "Toyota", model: "Corolla", trims: [
      { key: "2016-toyota-corolla-l", name: "L", engine: "1.8L", mostCommon: false },
      { key: "2016-toyota-corolla-le", name: "LE", engine: "1.8L", mostCommon: true },
    ] },
    { key: "2015-ford-focus", year: 2015, make: "Ford", model: "Focus", trims: [
      { key: "2015-ford-focus-se", name: "SE", engine: "2.0L", mostCommon: true },
    ] },
  ];

  it("cascades year → make → model", () => {
    expect(yearsOf(catalog)).toEqual([2016, 2015]);
    expect(makesOf(catalog, 2016)).toEqual(["Toyota"]);
    expect(modelsOf(catalog, 2015, "Ford").map((m) => m.model)).toEqual(["Focus"]);
  });

  it("resolves a model key to its most common trim and marks it assumed", () => {
    const r = resolveKey(catalog, "2016-toyota-corolla")!;
    expect(r.trim.name).toBe("LE");
    expect(r.assumed).toBe(true);
    expect(carName(r)).toBe("2016 Toyota Corolla");
    expect(carName(resolveKey(catalog, "2016-toyota-corolla-l")!)).toBe("2016 Toyota Corolla L");
    expect(resolveKey(catalog, "nope")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { reliabilityScore } from "@/lib/cost/reliability";
import { pickBestValue, type Candidate } from "@/lib/cost/bestValue";

describe("reliabilityScore", () => {
  it("scores a car with few complaints as very reliable", () => {
    const r = reliabilityScore({ recallCount: 1, unitsSold: 363000, complaints: { electrical: 60, body: 40, brakes: 45 } });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.label).toBe("Very reliable");
    expect(r.isRisk).toBe(false);
  });

  it("flags heavy transmission complaints as risky", () => {
    const r = reliabilityScore({
      recallCount: 4,
      unitsSold: 202000,
      complaints: { transmission: 1250, electrical: 260, steering: 120, body: 110, engine: 60 },
    });
    expect(r.score).toBeLessThan(45);
    expect(r.band).toBe("risky");
    expect(r.isRisk).toBe(true);
  });

  it("adjusts for how many were sold", () => {
    const complaints = { electrical: 300 };
    const popular = reliabilityScore({ recallCount: 0, unitsSold: 400000, complaints });
    const rare = reliabilityScore({ recallCount: 0, unitsSold: 20000, complaints });
    expect(popular.score).toBeGreaterThan(rare.score);
  });

  it("stays between 5 and 98", () => {
    expect(reliabilityScore({ recallCount: 0, unitsSold: 1e6, complaints: {} }).score).toBe(98);
    expect(reliabilityScore({ recallCount: 30, unitsSold: 1000, complaints: { engine: 5000 } }).score).toBe(5);
  });
});

describe("pickBestValue", () => {
  const car = (id: string, total: number | null, reliability = 80, hasRiskFlags = false): Candidate => ({
    id,
    shortName: id,
    total,
    reliability,
    hasRiskFlags,
  });

  it("picks the lowest 5-year cost and says by how much", () => {
    const best = pickBestValue([car("Civic", 30500), car("Corolla", 29900, 88), car("Focus", 34300, 40, true)]);
    expect(best?.id).toBe("Corolla");
    expect(best?.savings).toBe(600);
    expect(best?.reason).toBe("Lowest 5-year cost, about $600 less than the Civic, and the most reliable of the group.");
  });

  it("rounds the savings in the reason to the nearest $50", () => {
    const best = pickBestValue([car("Civic", 30524), car("Corolla", 29875, 88)]);
    expect(best?.savings).toBe(649);
    expect(best?.reason).toContain("about $650 less than the Civic");
  });

  it("breaks near-ties with reliability", () => {
    const best = pickBestValue([car("A", 30000, 70), car("B", 30200, 90)]);
    expect(best?.id).toBe("B");
    expect(best?.reason).toContain("About the same 5-year cost");
  });

  it("ignores cars we couldn't price", () => {
    const best = pickBestValue([car("Astra", null), car("Civic", 30500), car("Corolla", 29900)]);
    expect(best?.id).toBe("Corolla");
  });

  it("needs at least two priced cars", () => {
    expect(pickBestValue([car("Civic", 30500)])).toBeNull();
    expect(pickBestValue([car("Civic", 30500), car("Astra", null)])).toBeNull();
  });
});

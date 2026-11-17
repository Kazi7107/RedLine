import { describe, expect, it } from "vitest";
import { annualFuelCost, annualInterest, estimateOwnership, liquidFuelPrice } from "@/lib/cost-model";
import { normalizeVehicle } from "@/lib/sources/fueleconomy";
import { segmentFor } from "@/lib/reference/segments";
import type { FuelPrices, OwnershipInputs, VehicleSpec } from "@/lib/types";

const prices: FuelPrices = {
  regular: 4, midgrade: 4.6, premium: 5, diesel: 6, e85: 3, electricityPerKwh: 0.15,
  source: "test", region: "WA", asOf: "2026-11-01",
};

// Shape taken from a real FuelEconomy.gov /vehicle/39566 response (2018 Civic 4Dr).
const civic = normalizeVehicle({
  id: "39566", year: "2018", make: "Honda", model: "Civic 4Dr", baseModel: "Civic", VClass: "Midsize Cars",
  atvType: "", fuelType: "Regular", fuelType1: "Regular Gasoline", comb08: "34", city08: "31", highway08: "40",
  combE: "0.0", trany: "Automatic (variable gear ratios)", cylinders: "4", displ: "2.0", drive: "Front-Wheel Drive",
});

const ev: VehicleSpec = {
  ...civic, epaId: 1, make: "Tesla", model: "Model 3", baseModel: "Model 3",
  powertrain: "ev", fuelType: "Electricity", mpgCombined: 130, kwhPer100mi: 26,
};

const inputs: OwnershipInputs = {
  purchasePrice: 18000, currentMileage: 60000, milesPerYear: 12000, location: "seattle",
  driverAge: "25to64", coverage: "full", years: 5,
};

describe("normalizeVehicle", () => {
  it("parses FuelEconomy.gov string fields", () => {
    expect(civic.mpgCombined).toBe(34);
    expect(civic.powertrain).toBe("gas");
    expect(civic.baseModel).toBe("Civic");
    expect(segmentFor(civic)).toBe("midsize");
  });
});

describe("fuel", () => {
  it("prices by fuel type", () => {
    expect(liquidFuelPrice("Premium Gasoline", prices)).toBe(5);
    expect(liquidFuelPrice("Diesel", prices)).toBe(6);
    expect(liquidFuelPrice("Regular Gasoline", prices)).toBe(4);
  });
  it("gas: miles / mpg * price", () => {
    expect(annualFuelCost(civic, 12000, prices)).toBeCloseTo((12000 / 34) * 4, 6);
  });
  it("EV: miles * kWh/100mi * $/kWh", () => {
    expect(annualFuelCost(ev, 12000, prices)).toBeCloseTo(12000 * 0.26 * 0.15, 6);
  });
});

describe("annualInterest", () => {
  it("is zero with no loan", () => {
    expect(annualInterest(10000, 0, 60, 5)).toEqual([0, 0, 0, 0, 0]);
  });
  it("matches standard amortization total interest", () => {
    // $20k, 6% APR, 60 months -> total interest ~ $3,199.36
    const total = annualInterest(20000, 0.06, 60, 5).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(3199.36, 0);
  });
  it("declines each year", () => {
    const y = annualInterest(20000, 0.06, 60, 5);
    for (let i = 1; i < y.length; i++) expect(y[i]).toBeLessThan(y[i - 1]);
  });
});

describe("estimateOwnership", () => {
  const est = estimateOwnership(civic, inputs, prices, 2026);

  it("produces 5 years and a consistent total", () => {
    expect(est.years).toHaveLength(5);
    const t = est.totals;
    const sum = t.fuel + t.insurance + t.maintenance + t.registration + t.depreciation + t.financing + t.upfrontTaxesAndFees;
    expect(t.total).toBeCloseTo(sum, 1);
  });

  it("depreciation equals price minus resale", () => {
    expect(est.totals.depreciation).toBeCloseTo(inputs.purchasePrice - est.resaleValue, 0);
    expect(est.resaleValue).toBeGreaterThan(0);
    expect(est.resaleValue).toBeLessThan(inputs.purchasePrice);
  });

  it("applies Seattle sales tax plus the 0.3% motor vehicle tax", () => {
    expect(est.upfront.salesTax).toBeCloseTo(18000 * (0.1035 + 0.003), 2);
  });

  it("charges RTA excise inside Sound Transit, not in Spokane", () => {
    const spokane = estimateOwnership(civic, { ...inputs, location: "spokane" }, prices, 2026);
    expect(est.totals.registration).toBeGreaterThan(spokane.totals.registration + 500);
  });

  it("maintenance rises as the car ages", () => {
    expect(est.years[4].maintenance).toBeGreaterThan(est.years[0].maintenance);
  });

  it("young drivers pay more insurance; liability-only pays less", () => {
    const young = estimateOwnership(civic, { ...inputs, driverAge: "under25" }, prices, 2026);
    const liab = estimateOwnership(civic, { ...inputs, coverage: "liability" }, prices, 2026);
    expect(young.totals.insurance).toBeGreaterThan(est.totals.insurance);
    expect(liab.totals.insurance).toBeLessThan(est.totals.insurance);
  });

  it("adds loan interest when financed", () => {
    const fin = estimateOwnership(civic, { ...inputs, downPayment: 3000, loanApr: 0.08, loanTermMonths: 60 }, prices, 2026);
    expect(est.totals.financing).toBe(0);
    expect(fin.totals.financing).toBeGreaterThan(1000);
  });

  it("lands in a plausible range for an $18k 2018 Civic in Seattle", () => {
    expect(est.totals.total).toBeGreaterThan(25_000);
    expect(est.totals.total).toBeLessThan(45_000);
  });

  it("EVs pay the WA EV fee but much less for fuel", () => {
    const e = estimateOwnership(ev, inputs, prices, 2026);
    expect(e.totals.fuel).toBeLessThan(est.totals.fuel / 2);
    expect(e.years[0].registration).toBeGreaterThan(est.years[0].registration);
  });
});

/**
 * The Redline 5-year cost-of-ownership model.
 * Pure and deterministic: all live data (vehicle spec, fuel prices) is passed in.
 */
import type { FuelPrices, OwnershipEstimate, OwnershipInputs, VehicleSpec, YearBreakdown } from "./types";
import { segmentFor, isLightTruck } from "./reference/segments";
import * as ins from "./reference/insurance";
import * as maint from "./reference/maintenance";
import * as dep from "./reference/depreciation";
import * as wa from "./reference/wa-fees";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** $/unit for the vehicle's primary liquid fuel. */
export function liquidFuelPrice(fuelType: string, p: FuelPrices): number {
  const f = fuelType.toLowerCase();
  if (f.includes("diesel")) return p.diesel;
  if (f.includes("premium")) return p.premium;
  if (f.includes("midgrade")) return p.midgrade;
  if (f === "e85") return p.e85;
  return p.regular;
}

/** Fuel/energy cost for one year of driving at today's prices. */
export function annualFuelCost(v: VehicleSpec, miles: number, p: FuelPrices): number {
  const electricCost = (m: number) => (m * v.kwhPer100mi * p.electricityPerKwh) / 100;
  const gasCost = (m: number) => (v.mpgCombined > 0 ? (m / v.mpgCombined) * liquidFuelPrice(v.fuelType, p) : 0);
  switch (v.powertrain) {
    case "ev":
      return electricCost(miles);
    case "phev": {
      const uf = v.phevUtilityFactor > 0 && v.phevUtilityFactor < 1 ? v.phevUtilityFactor : 0.5;
      return electricCost(miles * uf) + gasCost(miles * (1 - uf));
    }
    default:
      return gasCost(miles);
  }
}

export function annualInsurance(v: VehicleSpec, inputs: OwnershipInputs, vehicleAge: number, yearIndex: number): number {
  const seg = segmentFor(v);
  let premium = ins.WA_BASE_FULL_COVERAGE * ins.SEGMENT_FACTOR[seg] * ins.AGE_FACTOR[inputs.driverAge] * ins.COVERAGE_FACTOR[inputs.coverage];
  if (inputs.coverage === "full") {
    premium *= Math.max(ins.FULL_COVERAGE_FLOOR, 1 - ins.FULL_COVERAGE_AGE_DECLINE * Math.max(0, vehicleAge - 3));
  }
  return premium * (1 + ins.PREMIUM_INFLATION) ** yearIndex;
}

export function annualMaintenance(v: VehicleSpec, miles: number, vehicleAge: number, odometer: number): number {
  const cents = maint.BASE_CENTS_PER_MILE[segmentFor(v)] * maint.ageMultiplier(vehicleAge) * maint.mileageMultiplier(odometer);
  return (miles * cents) / 100;
}

const rtaShare = (age: number) => wa.RTA_DEPRECIATION_SCHEDULE[Math.min(Math.max(0, age), wa.RTA_DEPRECIATION_SCHEDULE.length - 1)];

export function annualRegistration(v: VehicleSpec, location: wa.WaLocation, estimatedMsrp: number, vehicleAge: number): number {
  const f = wa.ANNUAL_FEES;
  let fees = f.basicLicense + (isLightTruck(v.vehicleClass) ? f.weightFeeLight : f.weightFeeCar) + f.filingAndServiceFees + location.tbdFee;
  if (v.powertrain === "ev" || v.powertrain === "phev") fees += f.evFee;
  else if (v.powertrain === "hybrid") fees += f.hybridFee;
  if (location.inRtaDistrict) fees += wa.RTA_EXCISE_RATE * estimatedMsrp * rtaShare(vehicleAge);
  return fees;
}

/** Interest paid in each of the first `years` years of a fully amortized loan. */
export function annualInterest(principal: number, apr: number, termMonths: number, years: number): number[] {
  const out = Array.from({ length: years }, () => 0);
  if (principal <= 0 || apr <= 0 || termMonths <= 0) return out;
  const r = apr / 12;
  const payment = (principal * r) / (1 - (1 + r) ** -termMonths);
  let balance = principal;
  for (let m = 0; m < Math.min(termMonths, years * 12); m++) {
    const interest = balance * r;
    out[Math.floor(m / 12)] += interest;
    balance -= payment - interest;
  }
  return out;
}

export function estimateOwnership(
  vehicle: VehicleSpec,
  inputs: OwnershipInputs,
  fuelPrices: FuelPrices,
  asOfYear = new Date().getFullYear(),
): OwnershipEstimate {
  const location = wa.WA_LOCATIONS[inputs.location] ?? wa.WA_LOCATIONS.other;
  const years = Math.max(1, Math.min(10, Math.round(inputs.years || 5)));
  const startAge = Math.max(0, asOfYear - vehicle.year);
  const fuelInflation = inputs.fuelInflation ?? 0;

  // Upfront taxes & fees at purchase.
  const salesTax = inputs.purchasePrice * (location.salesTaxRate + wa.MOTOR_VEHICLE_SALES_TAX);
  const titleAndFees = wa.ONE_TIME_TITLE_FEES;

  // Financing.
  const principal = inputs.purchasePrice + salesTax + titleAndFees - (inputs.downPayment ?? inputs.purchasePrice);
  const interest = annualInterest(principal, inputs.loanApr ?? 0, inputs.loanTermMonths ?? 0, years);

  // Depreciation setup.
  const brandMod = dep.brandModifier(vehicle.make);
  const ptMod = dep.POWERTRAIN_MODIFIER[vehicle.powertrain];
  const mileagePenalty = Math.max(0, (inputs.milesPerYear - 12_000) / 10_000) * dep.HIGH_MILEAGE_PENALTY_PER_10K;
  const estimatedMsrp = inputs.purchasePrice / rtaShare(startAge);

  const baseFuel = annualFuelCost(vehicle, inputs.milesPerYear, fuelPrices);

  let value = inputs.purchasePrice;
  const floor = inputs.purchasePrice * dep.MIN_RESIDUAL_FRACTION;
  const rows: YearBreakdown[] = [];

  for (let i = 0; i < years; i++) {
    const age = startAge + i;
    const odometer = inputs.currentMileage + i * inputs.milesPerYear;

    const rate = dep.annualDepreciationRate(age) * brandMod * ptMod + mileagePenalty;
    const newValue = Math.max(floor, value * (1 - rate));
    const depreciation = value - newValue;
    value = newValue;

    const row = {
      year: i + 1,
      vehicleAge: age,
      odometerStart: odometer,
      fuel: baseFuel * (1 + fuelInflation) ** i,
      insurance: annualInsurance(vehicle, inputs, age, i),
      maintenance: annualMaintenance(vehicle, inputs.milesPerYear, age, odometer),
      registration: annualRegistration(vehicle, location, estimatedMsrp, age),
      depreciation,
      financing: interest[i],
    };
    rows.push({ ...row, total: row.fuel + row.insurance + row.maintenance + row.registration + row.depreciation + row.financing });
  }

  const sum = (k: keyof YearBreakdown) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const totals = {
    fuel: sum("fuel"),
    insurance: sum("insurance"),
    maintenance: sum("maintenance"),
    registration: sum("registration"),
    depreciation: sum("depreciation"),
    financing: sum("financing"),
    upfrontTaxesAndFees: salesTax + titleAndFees,
    total: 0,
  };
  totals.total =
    totals.fuel + totals.insurance + totals.maintenance + totals.registration + totals.depreciation + totals.financing + totals.upfrontTaxesAndFees;

  const roundedRows = rows.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, n]) => [k, typeof n === "number" && !["year", "vehicleAge", "odometerStart"].includes(k) ? round2(n) : n])),
  ) as unknown as YearBreakdown[];

  return {
    vehicle,
    inputs: { ...inputs, years },
    fuelPrices,
    years: roundedRows,
    upfront: { salesTax: round2(salesTax), titleAndFees: round2(titleAndFees) },
    totals: Object.fromEntries(Object.entries(totals).map(([k, n]) => [k, round2(n)])) as OwnershipEstimate["totals"],
    resaleValue: round2(value),
    costPerMile: round2(totals.total / (inputs.milesPerYear * years)),
    assumptions: [
      `Fuel prices: ${fuelPrices.source} (${fuelPrices.region}, as of ${fuelPrices.asOf})${fuelInflation ? `, rising ${(fuelInflation * 100).toFixed(1)}%/yr` : ", held flat"}.`,
      `Fuel economy: EPA combined ${vehicle.powertrain === "ev" ? `${vehicle.kwhPer100mi} kWh/100 mi` : `${vehicle.mpgCombined} MPG`} (FuelEconomy.gov).`,
      `Sales tax ${(100 * (location.salesTaxRate + wa.MOTOR_VEHICLE_SALES_TAX)).toFixed(2)}% for ${location.label}, including WA's 0.3% motor vehicle tax.`,
      location.inRtaDistrict
        ? "Inside the Sound Transit district: tabs include the 1.1% RTA excise tax, estimated from purchase price because MSRP is not available."
        : "Outside the Sound Transit district: no RTA excise tax.",
      "Insurance, maintenance and depreciation use Redline reference tables (AAA-based), not personal quotes.",
    ],
  };
}

import type {
  CategoryEstimate,
  CostBreakdown,
  CostInputs,
  VehicleClass,
  YearRange,
} from "./types";

export const OWNERSHIP_YEARS = 5;

/** Methodology constants. Mirrored in plain English on /methodology. */
export const RULES = {
  /** Cars over this age get the old-car repair bump. */
  oldCarAge: 10,
  oldCarRepairMultiplier: 1.25,
  /** German luxury brands cost 40-50% more to fix than their class. We use the midpoint. */
  germanLuxuryRepairMultiplier: 1.45,
  /** Repairs get pricier every year you own the car, on top of mileage. */
  repairGrowthPerYear: 0.15,
  /** Yearly price inflation. Gas: EIA long-run trend. Insurance: recent WA rate filings. Labor: shop rates. */
  gasInflation: 0.03,
  insuranceInflation: 0.05,
  laborInflation: 0.04,
  repairLowFactor: 0.65,
  repairHighFactor: 1.55,
  waTitleFee: 35.5,
  /** WA DOL basic registration + filing + plate/service fees, roughly. */
  waBaseRegistration: 93,
  rtaRate: 0.011,
} as const;

interface ClassParams {
  depreciationRate: number;
  insurance: [number, number];
  /** Mid repair spend per year for this class around 100k miles. */
  repairBase: number;
  tireSet: number;
  brakeJob: number;
  extraRegistration: number;
}

export const CLASS_PARAMS: Record<VehicleClass, ClassParams> = {
  compact: { depreciationRate: 0.11, insurance: [1100, 1550], repairBase: 520, tireSet: 640, brakeJob: 420, extraRegistration: 0 },
  midsize: { depreciationRate: 0.11, insurance: [1150, 1650], repairBase: 600, tireSet: 720, brakeJob: 460, extraRegistration: 0 },
  hybrid: { depreciationRate: 0.1, insurance: [1100, 1550], repairBase: 540, tireSet: 640, brakeJob: 380, extraRegistration: 0 },
  "compact-suv": { depreciationRate: 0.1, insurance: [1150, 1600], repairBase: 620, tireSet: 820, brakeJob: 500, extraRegistration: 0 },
  "midsize-suv": { depreciationRate: 0.1, insurance: [1200, 1700], repairBase: 680, tireSet: 900, brakeJob: 540, extraRegistration: 0 },
  "pickup-midsize": { depreciationRate: 0.08, insurance: [1200, 1700], repairBase: 640, tireSet: 1000, brakeJob: 560, extraRegistration: 45 },
  "pickup-full": { depreciationRate: 0.085, insurance: [1300, 1850], repairBase: 790, tireSet: 1150, brakeJob: 620, extraRegistration: 65 },
};

const round = (n: number) => Math.round(n);
const fixed = (v: number): YearRange => ({ low: round(v), high: round(v) });

/** How many multiples of `interval` the odometer crosses between start (exclusive) and end (inclusive). */
export function crossings(start: number, end: number, interval: number): number {
  return Math.floor(end / interval) - Math.floor(start / interval);
}

/** WA RTA depreciation schedule, approximated: share of MSRP still taxed at a given age. */
export function rtaScheduleFactor(age: number): number {
  const schedule = [1, 0.81, 0.72, 0.63, 0.55, 0.47, 0.41, 0.36, 0.32, 0.27, 0.24, 0.21, 0.19, 0.17, 0.15, 0.13, 0.12];
  return schedule[Math.min(Math.max(age, 0), schedule.length - 1)] ?? 0.1;
}

function depreciation(input: CostInputs): { years: YearRange[]; overMarket: number } {
  const { facts, marketValue, askingPrice, annualMiles, asOfYear } = input;
  const base = CLASS_PARAMS[facts.vehicleClass].depreciationRate;
  // Driving more than 12k a year knocks value faster; less driving slows it a bit.
  const mileageFactor = 1 + ((annualMiles - 12000) / 12000) * 0.25;
  const overMarket = Math.max(0, askingPrice - marketValue);
  let value = Math.min(askingPrice, marketValue);
  const years: YearRange[] = [];
  for (let y = 0; y < OWNERSHIP_YEARS; y++) {
    const age = asOfYear - facts.modelYear + y;
    // Older cars lose a smaller share each year, never less than 60% of the base rate.
    const ageTaper = Math.max(0.6, 1 - 0.04 * Math.max(0, age - 3));
    const rate = Math.min(0.35, base * facts.resaleFactor * mileageFactor * ageTaper);
    const loss = value * rate;
    value -= loss;
    years.push(fixed(loss + (y === 0 ? overMarket : 0)));
  }
  return { years, overMarket: round(overMarket) };
}

function fuel(input: CostInputs): YearRange[] {
  const { facts, annualMiles, gasPrice } = input;
  return Array.from({ length: OWNERSHIP_YEARS }, (_, y) => {
    // Engines lose a little efficiency as they age: about half a percent a year.
    const mpg = facts.mpgCombined * (1 - 0.005 * y);
    const price = gasPrice * Math.pow(1 + RULES.gasInflation, y);
    return fixed((annualMiles / mpg) * price);
  });
}

function insurance(input: CostInputs): YearRange[] {
  const { facts, asOfYear } = input;
  const [low, high] = CLASS_PARAMS[facts.vehicleClass].insurance;
  const lux = facts.germanLuxury ? 1.3 : 1;
  return Array.from({ length: OWNERSHIP_YEARS }, (_, y) => {
    const age = asOfYear - facts.modelYear + y;
    // Collision coverage gets cheaper as the car is worth less. Floor at 80%.
    const ageFactor = Math.max(0.8, 1 - 0.015 * Math.max(0, age - 8));
    const inflation = Math.pow(1 + RULES.insuranceInflation, y);
    const k = lux * ageFactor * inflation;
    return { low: round(low * k), high: round(high * k) };
  });
}

function maintenance(input: CostInputs): { years: YearRange[]; items: CostBreakdown["maintenanceItems"] } {
  const { facts, mileage, annualMiles } = input;
  const p = CLASS_PARAMS[facts.vehicleClass];
  const oilInterval = facts.syntheticOil ? 7500 : 5000;
  const oilCost = (facts.syntheticOil ? 95 : 70) * (facts.germanLuxury ? 1.6 : 1);
  const lux = facts.germanLuxury ? 1.35 : 1;
  const items: CostBreakdown["maintenanceItems"] = [];
  const years: YearRange[] = [];

  // Yearly cost: wear items are spread over the miles that wear them out (how AAA
  // does it), so a tire set lands as cost-per-mile, not as a spike in one year.
  const perMile =
    oilCost / oilInterval +
    25 / 7500 +
    (p.tireSet * lux) / 50000 +
    (p.brakeJob * lux) / 40000 +
    (220 * lux) / 60000 +
    (420 * lux) / 100000;
  const fixedPerYear = 95 * lux + (210 * lux) / 5;

  for (let y = 0; y < OWNERSHIP_YEARS; y++) {
    const start = mileage + annualMiles * y;
    const end = start + annualMiles;
    const year = y + 1;
    const labor = Math.pow(1 + RULES.laborInflation, y);
    // Older, higher-mileage cars need more small stuff (bushings, belts, hoses).
    const wear = 1 + Math.max(0, (start - 60000) / 100000) * 0.15;
    years.push(fixed((perMile * annualMiles + fixedPerYear) * labor * wear));

    // The schedule: when each job actually comes due, for the detail page.
    const add = (item: string, cost: number) => items.push({ item, year, cost: round(cost * labor) });

    const oil = crossings(start, end, oilInterval);
    if (oil > 0) add(`Oil changes (${oil})`, oil * oilCost);
    const rotations = crossings(start, end, 7500);
    if (rotations > 0) add(`Tire rotations (${rotations})`, rotations * 25);
    add("Filters and wipers", 95 * lux);
    if (crossings(start, end, 50000) > 0) add("New set of tires", p.tireSet * lux);
    if (crossings(start, end, 40000) > 0) add("Brake pads and rotors", p.brakeJob * lux);
    if (crossings(start, end, 60000) > 0) add("Transmission fluid", 220 * lux);
    if (crossings(start, end, 100000) > 0) add("Spark plugs and coolant", 420 * lux);
    // A 12V battery lasts ~5 years: assume one replacement, in year 2.
    if (year === 2) add("12V battery", 210 * lux);
  }
  return { years, items };
}

function repairs(input: CostInputs): YearRange[] {
  const { facts, mileage, annualMiles, asOfYear, reliabilityScore } = input;
  const base = CLASS_PARAMS[facts.vehicleClass].repairBase;
  // A score of 75 is neutral. Each point below adds 1%, each point above saves 1%.
  const reliabilityFactor = 1 + (75 - reliabilityScore) / 100;
  const lux = facts.germanLuxury ? RULES.germanLuxuryRepairMultiplier : 1;

  const years: YearRange[] = [];
  for (let y = 0; y < OWNERSHIP_YEARS; y++) {
    const age = asOfYear - facts.modelYear + y;
    const midOdometer = mileage + annualMiles * (y + 0.5);
    const mileageFactor = Math.pow(Math.max(midOdometer, 20000) / 100000, 0.8);
    const growth = Math.pow(1 + RULES.repairGrowthPerYear, y);
    const oldCar = age > RULES.oldCarAge ? RULES.oldCarRepairMultiplier : 1;
    const mid = base * mileageFactor * growth * reliabilityFactor * oldCar * lux;

    let low = mid * RULES.repairLowFactor;
    let high = mid * RULES.repairHighFactor;
    for (const risk of facts.riskFlags) {
      // Spread the risk around its peak year: 50% at the peak, 25% either side.
      const distance = Math.abs(y + 1 - risk.peakYear);
      const weight = distance === 0 ? 0.5 : distance === 1 ? 0.25 : 0;
      const expected = ((risk.costLow + risk.costHigh) / 2) * risk.probability;
      low += expected * weight * 0.5;
      high += risk.costHigh * weight;
    }
    years.push({ low: round(low), high: round(high) });
  }
  return years;
}

function taxes(input: CostInputs): YearRange[] {
  const { facts, locale, askingPrice, asOfYear } = input;
  const extra = CLASS_PARAMS[facts.vehicleClass].extraRegistration;
  return Array.from({ length: OWNERSHIP_YEARS }, (_, y) => {
    const age = asOfYear - facts.modelYear + y;
    let total = RULES.waBaseRegistration + extra;
    if (locale.rta) total += facts.msrp * rtaScheduleFactor(age) * RULES.rtaRate;
    if (y === 0) total += askingPrice * locale.salesTaxRate + RULES.waTitleFee;
    return fixed(total);
  });
}

export function sumRanges(ranges: YearRange[]): YearRange {
  return ranges.reduce((a, r) => ({ low: a.low + r.low, high: a.high + r.high }), { low: 0, high: 0 });
}

/** Runs the full 5-year model. Deterministic: same inputs, same numbers. */
export function calculateCosts(input: CostInputs): CostBreakdown {
  const dep = depreciation(input);
  const maint = maintenance(input);
  const categories: CategoryEstimate[] = [
    { key: "depreciation", years: dep.years, isRange: false },
    { key: "fuel", years: fuel(input), isRange: false },
    { key: "insurance", years: insurance(input), isRange: true },
    { key: "maintenance", years: maint.years, isRange: false },
    { key: "repairs", years: repairs(input), isRange: true },
    { key: "taxes", years: taxes(input), isRange: false },
  ];
  const years = Array.from({ length: OWNERSHIP_YEARS }, (_, y) =>
    sumRanges(categories.map((c) => c.years[y])),
  );
  return { categories, years, maintenanceItems: maint.items, overMarket: dep.overMarket };
}

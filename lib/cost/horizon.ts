import { sumRanges } from "./calculate";
import type { CategoryKey, Horizon, YearRange } from "./types";

export interface RangeWithMid extends YearRange {
  mid: number;
}

export const withMid = (r: YearRange): RangeWithMid => ({ ...r, mid: Math.round((r.low + r.high) / 2) });

/** Sum the first `horizon` ownership years of a per-year series. */
export function overHorizon(years: YearRange[], horizon: Horizon): RangeWithMid {
  return withMid(sumRanges(years.slice(0, horizon)));
}

/**
 * Monthly cost: the total spread evenly over the months in the horizon.
 * Rounded to the nearest $5 so it reads like a budget line, not false precision.
 */
export function monthlyCost(total: number, horizon: Horizon): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round(total / (horizon * 12) / 5) * 5;
}

/** The category with the largest midpoint over the horizon. Ties go to the first listed. */
export function biggestCategory<T extends { key: CategoryKey; years: YearRange[] }>(
  categories: T[],
  horizon: Horizon,
): T | undefined {
  let best: T | undefined;
  let bestMid = -Infinity;
  for (const c of categories) {
    const mid = overHorizon(c.years, horizon).mid;
    if (mid > bestMid) {
      best = c;
      bestMid = mid;
    }
  }
  return best;
}

/** Year-over-year change of a series, as fractions (0.1 = +10%). */
export function growthRates(series: number[]): number[] {
  return series.slice(1).map((v, i) => (series[i] === 0 ? 0 : (v - series[i]) / series[i]));
}

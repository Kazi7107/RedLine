/**
 * Pure view-model helpers: turn an estimate into what a card, a bar or the
 * year-by-year chart draws. No React, so they're unit tested.
 */
import { biggestCategory, monthlyCost, overHorizon, type RangeWithMid } from "./cost/horizon";
import type { CategoryKey, Horizon, YearRange } from "./cost/types";

interface CategoryLike {
  key: CategoryKey;
  years: YearRange[];
  isRange: boolean;
}

export interface Totals {
  total: RangeWithMid;
  monthly: number;
}

/** The hero number and its monthly twin. Monthly uses the midpoint. */
export function totalsFor(years: YearRange[], horizon: Horizon): Totals {
  const total = overHorizon(years, horizon);
  return { total, monthly: monthlyCost(total.mid, horizon) };
}

/** Largest single-category high over the horizon across every car: the shared bar scale. */
export function barScale(cars: { categories: CategoryLike[] }[], horizon: Horizon): number {
  let max = 0;
  for (const car of cars) for (const c of car.categories) max = Math.max(max, overHorizon(c.years, horizon).high);
  return max;
}

export interface LineBar {
  key: CategoryKey;
  value: RangeWithMid;
  /** Per-year average over the horizon. */
  perYear: RangeWithMid;
  /** Solid part of the bar, % of the shared scale. */
  solid: number;
  /** Faded part for ranges (low → high), % of scale. */
  spread: number;
  isBiggest: boolean;
}

const pct = (n: number, scale: number) => (scale > 0 ? Math.round((n / scale) * 1000) / 10 : 0);

export function lineBars<T extends CategoryLike>(categories: T[], horizon: Horizon, scale: number): (LineBar & { category: T })[] {
  const biggest = biggestCategory(categories, horizon)?.key;
  return categories.map((c) => {
    const value = overHorizon(c.years, horizon);
    const perYear: RangeWithMid = {
      low: Math.round(value.low / horizon),
      high: Math.round(value.high / horizon),
      mid: Math.round(value.mid / horizon),
    };
    return {
      key: c.key,
      category: c,
      value,
      perYear,
      solid: pct(value.low, scale),
      spread: c.isRange ? pct(value.high - value.low, scale) : 0,
      isBiggest: c.key === biggest,
    };
  });
}

export interface YearColumn {
  year: number;
  /** Midpoint per category, in chart stack order (bottom first). */
  segments: { key: CategoryKey; value: number }[];
  mid: number;
  high: number;
}

/** Stack order, bottom to top: steady costs first, the unpredictable ones on top. */
export const STACK_ORDER: CategoryKey[] = ["fuel", "insurance", "depreciation", "maintenance", "taxes", "repairs"];

export function yearColumns(categories: CategoryLike[]): YearColumn[] {
  const years = categories[0]?.years.length ?? 0;
  const ordered = STACK_ORDER.map((k) => categories.find((c) => c.key === k)).filter((c): c is CategoryLike => Boolean(c));
  return Array.from({ length: years }, (_, y) => {
    const segments = ordered.map((c) => ({ key: c.key, value: Math.round((c.years[y].low + c.years[y].high) / 2) }));
    return {
      year: y + 1,
      segments,
      mid: segments.reduce((a, s) => a + s.value, 0),
      high: ordered.reduce((a, c) => a + c.years[y].high, 0),
    };
  });
}

/** A "nice" axis max and tick step for the chart, e.g. 7,450 → 8,000 with 2,000 steps. */
export function niceAxis(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: 1000, step: 250 };
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { max: Math.ceil(max / step) * step, step };
}

/** Reliability gauge geometry: 0..100 maps onto a 180° arc. */
export function gaugeAngle(score: number): number {
  const s = Math.min(100, Math.max(0, score));
  return -90 + (s / 100) * 180;
}

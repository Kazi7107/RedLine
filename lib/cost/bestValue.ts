import { money } from "../format";

export interface Candidate {
  id: string;
  shortName: string;
  /** Midpoint 5-year total. Null when we couldn't price the car. */
  total: number | null;
  reliability: number;
  hasRiskFlags: boolean;
}

export interface BestValue {
  id: string;
  reason: string;
  savings: number;
}

/**
 * Lowest 5-year cost wins. If two cars are within $300 (noise, given the
 * ranges), the more reliable one wins. Only cars we fully priced are eligible,
 * and we need at least two to call anything "best".
 */
export function pickBestValue(cars: Candidate[]): BestValue | null {
  const priced = cars.filter((c): c is Candidate & { total: number } => c.total !== null);
  if (priced.length < 2) return null;

  const sorted = [...priced].sort((a, b) => {
    if (Math.abs(a.total - b.total) <= 300) return b.reliability - a.reliability;
    return a.total - b.total;
  });
  const [winner, runnerUp] = sorted;
  const savings = Math.max(0, runnerUp.total - winner.total);
  const mostReliable = priced.every((c) => c.id === winner.id || c.reliability < winner.reliability);

  const parts: string[] = [];
  if (savings >= 100) parts.push(`Lowest 5-year cost, about ${money(Math.round(savings / 50) * 50)} less than the ${runnerUp.shortName}`);
  else parts.push(`About the same 5-year cost as the ${runnerUp.shortName}, but more reliable`);
  if (mostReliable && savings >= 100) parts.push("and the most reliable of the group");
  else if (!winner.hasRiskFlags && priced.some((c) => c.hasRiskFlags)) parts.push("with no known big-ticket problems");

  return { id: winner.id, savings, reason: parts.join(", ") + "." };
}

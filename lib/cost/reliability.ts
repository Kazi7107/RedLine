import type { ComplaintCategory } from "./types";

export interface ReliabilityInputs {
  recallCount: number;
  complaints: Partial<Record<ComplaintCategory, number>>;
  /** Units sold in the US for this model year, so popular cars aren't punished for volume. */
  unitsSold: number;
}

export type ReliabilityBand = "very" | "pretty" | "average" | "below" | "risky";

export interface ReliabilityScore {
  score: number;
  band: ReliabilityBand;
  label: string;
  complaintTotal: number;
  complaintsPer10k: number;
  /** True when the score itself is a risk signal (shown in red, always with the label). */
  isRisk: boolean;
}

const POWERTRAIN: ComplaintCategory[] = ["engine", "transmission", "hybrid-system"];

export const BANDS: { min: number; band: ReliabilityBand; label: string }[] = [
  { min: 85, band: "very", label: "Very reliable" },
  { min: 70, band: "pretty", label: "Pretty reliable" },
  { min: 55, band: "average", label: "About average" },
  { min: 45, band: "below", label: "Below average" },
  { min: 0, band: "risky", label: "Risky" },
];

/**
 * 0..100, higher is better. Built from NHTSA owner complaints per 10k cars sold,
 * the recall count, and an extra penalty when complaints pile up in the engine or
 * transmission (the failures that cost thousands, not hundreds).
 */
export function reliabilityScore(input: ReliabilityInputs): ReliabilityScore {
  const total = Object.values(input.complaints).reduce((a, b) => a + (b ?? 0), 0);
  const per10k = input.unitsSold > 0 ? (total / input.unitsSold) * 10000 : 0;
  const powertrain = POWERTRAIN.reduce((a, k) => a + (input.complaints[k] ?? 0), 0);
  const powertrainShare = total > 0 ? powertrain / total : 0;

  const complaintPenalty = 14 * Math.log10(1 + per10k);
  const recallPenalty = 2 * input.recallCount;
  const powertrainPenalty = 55 *Math.max(0, powertrainShare - 0.25) * Math.min(1, per10k / 20);

  const raw = 100 - complaintPenalty - recallPenalty - powertrainPenalty;
  const score = Math.round(Math.min(98, Math.max(5, raw)));
  const { band, label } = BANDS.find((b) => score >= b.min)!;
  return {
    score,
    band,
    label,
    complaintTotal: total,
    complaintsPer10k: Math.round(per10k * 10) / 10,
    isRisk: band === "risky",
  };
}

/**
 * Pure helpers that turn raw NHTSA responses into Redline's shapes.
 * No I/O, so they're unit tested (tests/nhtsa-normalize.test.ts).
 */
import type { ComplaintCategory } from "../cost/types";
import { COMPLAINT_LABEL } from "../categories";
import type { Recall } from "../data/types";

export interface RawComplaint {
  components?: string;
  summary?: string;
}

export interface RawRecall {
  NHTSACampaignNumber: string;
  Component?: string;
  Summary?: string;
  Remedy?: string;
  ReportReceivedDate?: string;
}

/**
 * NHTSA component names → our complaint categories. A complaint can list
 * several components ("POWER TRAIN,ENGINE"); some names contain commas
 * ("FUEL SYSTEM, GASOLINE"), so we match patterns instead of splitting, and
 * the component listed first wins.
 */
const COMPONENT_PATTERNS: [RegExp, ComplaintCategory][] = [
  [/AIR ?BAG/, "airbags"],
  [/HYBRID PROPULSION|ELECTRIC PROPULSION/, "hybrid-system"],
  [/POWER ?TRAIN/, "transmission"],
  [/ENGINE/, "engine"],
  [/FUEL/, "fuel-system"],
  [/ELECTRICAL/, "electrical"],
  [/BRAKE/, "brakes"],
  [/STEERING/, "steering"],
  [/SUSPENSION/, "suspension"],
  [/STRUCTURE|LATCHES|LOCKS/, "body"],
  [/AIR CONDITION|HEATER|CLIMATE|HVAC/, "ac-heat"],
];

/** For "UNKNOWN OR OTHER" complaints, a keyword pass over the owner's own words. */
const SUMMARY_PATTERNS: [RegExp, ComplaintCategory][] = [
  [/\b(transmission|shift(ing|s)?|clutch|gear ?box|cvt)\b/i, "transmission"],
  [/\b(a\/c|air condition\w*|heater|heat(ing)?|hvac|blower)\b/i, "ac-heat"],
  [/\b(hybrid battery|hybrid system|inverter)\b/i, "hybrid-system"],
  [/\b(engine|oil consumption|misfire)\b/i, "engine"],
];

export function categorizeComplaint(c: RawComplaint): ComplaintCategory | null {
  const comp = (c.components ?? "").toUpperCase();
  let best: { at: number; cat: ComplaintCategory } | null = null;
  for (const [re, cat] of COMPONENT_PATTERNS) {
    const m = re.exec(comp);
    if (m && (!best || m.index < best.at)) best = { at: m.index, cat };
  }
  if (best) return best.cat;
  const text = c.summary ?? "";
  for (const [re, cat] of SUMMARY_PATTERNS) if (re.test(text)) return cat;
  return null;
}

/** Count complaints per category. Each complaint counts once, toward its first component. */
export function countComplaints(list: RawComplaint[]): Partial<Record<ComplaintCategory, number>> {
  const out: Partial<Record<ComplaintCategory, number>> = {};
  for (const c of list) {
    const cat = categorizeComplaint(c);
    if (cat) out[cat] = (out[cat] ?? 0) + 1;
  }
  return out;
}

/** "Most owner complaints are about the transmission, then electrical." */
export function complaintSummary(counts: Partial<Record<ComplaintCategory, number>>): string {
  const ranked = (Object.entries(counts) as [ComplaintCategory, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return "Very few owner complaints on file with NHTSA.";
  const word = (c: ComplaintCategory) => {
    const l = COMPLAINT_LABEL[c];
    return l === l.toUpperCase() ? l : l.split(" ").map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(" ");
  };
  const [first, second] = ranked;
  const total = ranked.reduce((s, [, n]) => s + n, 0);
  const share = Math.round((first[1] / total) * 100);
  const lead = share >= 40 ? `${share}% of owner complaints are about ${word(first[0])}` : `Owner complaints are spread out, led by ${word(first[0])}`;
  return second ? `${lead}, then ${word(second[0])}.` : `${lead}.`;
}

/** NHTSA recall dates arrive as DD/MM/YYYY. */
export function parseNhtsaDate(s: string | undefined): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

const sentenceCase = (s: string) => {
  const lower = s.toLowerCase().trim();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/** Split on sentence ends only (". " before a capital), so "1.0L" or "U.S." stays whole. */
const sentences = (s: string | undefined) =>
  (s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * A recall in the card's voice: the component as a title, then what's wrong
 * and what the dealer does. NHTSA's first sentence is usually "X is recalling
 * certain ... vehicles", so we skip it when there's more.
 */
export function normalizeRecall(r: RawRecall): Recall {
  const parts = (r.Component ?? "Other").split(":").map((p) => p.trim()).filter(Boolean);
  const top = sentenceCase(parts[0]?.split(",")[0] ?? "Other");
  const detail = parts.length > 1 ? sentenceCase(parts[parts.length - 1]) : null;
  const what = sentences(r.Summary);
  const defect = (what.length > 1 && /recall/i.test(what[0] ?? "") ? what.slice(1, 2) : what.slice(0, 1)).join(" ");
  const remedy = sentences(r.Remedy).find((s) => /free|no charge|repair|replace|update|inspect|reprogram/i.test(s)) ?? "";
  const summary = `${defect} ${remedy}`.trim();
  return {
    id: r.NHTSACampaignNumber,
    title: detail && detail.toLowerCase() !== top.toLowerCase() ? `${top}: ${detail.toLowerCase()}` : top,
    component: top,
    summary: summary.length > 320 ? summary.slice(0, 317).replace(/\s+\S*$/, "") + "…" : summary,
    reportedAt: parseNhtsaDate(r.ReportReceivedDate),
  };
}

/** Recalls newest first, deduped by campaign number. */
export function normalizeRecalls(list: RawRecall[]): Recall[] {
  const seen = new Set<string>();
  return list
    .filter((r) => r.NHTSACampaignNumber && !seen.has(r.NHTSACampaignNumber) && seen.add(r.NHTSACampaignNumber))
    .map(normalizeRecall)
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

/** Match a vPIC trim string ("L/LE") to one of our trim names. */
export function matchTrim(vpicTrim: string | null | undefined, names: string[], fallback?: string): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const parts = (vpicTrim ?? "").split(/[\/,]/).map(norm).filter(Boolean);
  const hits = names.filter((n) => parts.includes(norm(n)));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return fallback && hits.includes(fallback) ? fallback : hits[0];
  return null;
}

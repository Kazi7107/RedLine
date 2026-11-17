/**
 * Client-safe helpers for the year → make → model → trim dropdowns.
 * The catalog itself comes from lib/data (server) and is passed down as a prop.
 */
import type { CatalogModel, CatalogTrim } from "./data/types";

export const NOT_SURE = "not-sure";

export function yearsOf(catalog: CatalogModel[]): number[] {
  return [...new Set(catalog.map((m) => m.year))].sort((a, b) => b - a);
}

export function makesOf(catalog: CatalogModel[], year: number | null): string[] {
  return [...new Set(catalog.filter((m) => year === null || m.year === year).map((m) => m.make))].sort();
}

export function modelsOf(catalog: CatalogModel[], year: number | null, make: string): CatalogModel[] {
  return catalog
    .filter((m) => (year === null || m.year === year) && m.make === make)
    .sort((a, b) => a.model.localeCompare(b.model));
}

export function mostCommonTrim(model: CatalogModel): CatalogTrim {
  return model.trims.find((t) => t.mostCommon) ?? model.trims[0];
}

export interface ResolvedKey {
  model: CatalogModel;
  trim: CatalogTrim;
  /** True when the key was a model key ("Not sure" trim). */
  assumed: boolean;
}

/** Resolve a car key (trim key or model key) against the catalog. */
export function resolveKey(catalog: CatalogModel[], key: string): ResolvedKey | null {
  for (const model of catalog) {
    if (model.key === key) return { model, trim: mostCommonTrim(model), assumed: true };
    const trim = model.trims.find((t) => t.key === key);
    if (trim) return { model, trim, assumed: false };
  }
  return null;
}

/** "2016 Toyota Corolla LE", with the trim left off when it was assumed. */
export function carName(r: ResolvedKey, opts: { withAssumedTrim?: boolean } = {}): string {
  const base = `${r.model.year} ${r.model.make} ${r.model.model}`;
  if (r.assumed && !opts.withAssumedTrim) return base;
  return `${base} ${r.trim.name}`;
}

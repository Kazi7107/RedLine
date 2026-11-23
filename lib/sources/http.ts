/**
 * Shared HTTP helper for every external data source.
 * - Hard timeout so a slow government API never hangs a request.
 * - Uses Next's fetch cache (`revalidate`) when running inside Next;
 *   the option is ignored elsewhere (tests, scripts).
 * - Detects HTML error pages (e.g. vPIC maintenance pages served with 200/503).
 */
export class SourceError extends Error {
  constructor(
    public source: string,
    message: string,
    public status?: number,
  ) {
    super(`[${source}] ${message}`);
    this.name = "SourceError";
  }
}

export interface FetchJsonOptions {
  source: string;
  /** Seconds to cache the response in Next's data cache. */
  revalidate?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Skip Next's data cache (for responses over its 2 MB item limit; cache the processed result instead). */
  noStore?: boolean;
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  const { source, revalidate = 60 * 60 * 24, timeoutMs = 10_000, headers = {}, noStore = false } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Redline/0.2", ...headers },
      signal: controller.signal,
      ...(noStore ? { cache: "no-store" } : { next: { revalidate } }),
    } as RequestInit);
  } catch (err) {
    const reason = (err as Error).name === "AbortError" ? `timed out after ${timeoutMs}ms` : (err as Error).message;
    throw new SourceError(source, `request failed: ${reason}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) throw new SourceError(source, `HTTP ${res.status}`, res.status);
  if (/^\s*(﻿)?\s*</.test(text)) {
    throw new SourceError(source, "returned an HTML page instead of JSON (service may be down for maintenance)", res.status);
  }
  if (text.trim() === "" || text.trim() === "null") {
    throw new SourceError(source, "returned no data", 404);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SourceError(source, "returned invalid JSON", res.status);
  }
}

/** FuelEconomy.gov returns a single object instead of an array when there is one item. */
export function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

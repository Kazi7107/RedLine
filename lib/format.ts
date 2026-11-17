const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** $27,000. Rounds to the nearest $10 above $1,000 so estimates don't look falsely exact. */
export function money(n: number, opts: { exact?: boolean } = {}): string {
  const v = !opts.exact && Math.abs(n) >= 1000 ? Math.round(n / 10) * 10 : Math.round(n);
  return usd.format(v);
}

/** $27.0k, for tight spaces like the mobile car tabs. */
export function moneyShort(n: number): string {
  if (Math.abs(n) < 1000) return usd.format(Math.round(n));
  return `$${(n / 1000).toFixed(1)}k`;
}

export function moneyRange(low: number, high: number): string {
  if (Math.round(low) === Math.round(high)) return money(low);
  return `${money(low)} to ${money(high)}`;
}

export function miles(n: number): string {
  return `${num.format(Math.round(n))} mi`;
}

export function integer(n: number): string {
  return num.format(Math.round(n));
}

/** "Nov 12" or "Nov 12, 2025" when not this year. */
export function shortDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
}

/** Strip everything but digits, for "74,200" or "$14,200" style inputs. */
export function parseDigits(s: string): number | null {
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

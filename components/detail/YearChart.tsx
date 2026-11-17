import { CATEGORY_LABEL } from "@/lib/categories";
import type { CategoryKey } from "@/lib/cost/types";
import { money } from "@/lib/format";
import { niceAxis, yearColumns, type YearColumn } from "@/lib/view";

interface Cat {
  key: CategoryKey;
  years: { low: number; high: number }[];
  isRange: boolean;
}

/**
 * Year-by-year stacked bars, built from plain HTML/CSS: no chart library, and
 * labels stay readable at phone width. The dashed cap is how high the ranges
 * (insurance, repairs) could run. `red` is the one category drawn in red.
 */
export function YearChart({ categories, red }: { categories: Cat[]; red: CategoryKey | null }) {
  const cols = yearColumns(categories);
  const { max, step } = niceAxis(Math.max(...cols.map((c) => c.high)));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const peak = cols.reduce((a, c) => (c.mid > a.mid ? c : a), cols[0]);
  const keys = cols[0]?.segments.map((s) => s.key) ?? [];
  const color = (k: CategoryKey) => (k === red ? "var(--red)" : `var(--cat-${k})`);

  return (
    <figure className="ychart" data-inview>
      <ul className="ychart__legend" aria-label="Legend">
        {[...keys].reverse().map((k) => (
          <li key={k}>
            <span style={{ background: color(k) }} aria-hidden="true" />
            {CATEGORY_LABEL[k]}
          </li>
        ))}
        <li>
          <span className="ychart__legend-cap" aria-hidden="true" />
          Could run this high
        </li>
      </ul>

      <div className="ychart__plot" role="img" aria-label={`Yearly cost: ${cols.map((c) => `year ${c.year} ${money(c.mid)}`).join(", ")}. Highest in year ${peak.year}.`}>
        <div className="ychart__grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>
              <em>{t === 0 ? "$0" : `$${t / 1000}k`}</em>
            </span>
          ))}
        </div>
        <div className="ychart__cols" aria-hidden="true">
          {cols.map((c: YearColumn, i) => (
            <div key={c.year} className="ychart__col" style={{ ["--i" as string]: i }}>
              <div className="ychart__stack" style={{ height: `${(c.high / max) * 100}%` }}>
                <span className={`ychart__total num${c.year === peak.year ? " is-peak" : ""}`}>{money(c.mid)}</span>
                <span className="ychart__cap" style={{ flexGrow: c.high - c.mid }} />
                {[...c.segments].reverse().map((s) => (
                  <span key={s.key} className="ychart__seg" style={{ flexGrow: s.value, background: color(s.key) }} title={`${CATEGORY_LABEL[s.key]}: ${money(s.value)}`} />
                ))}
              </div>
              <span className="ychart__x">Year {c.year}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

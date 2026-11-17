"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { CATEGORY_LABEL } from "@/lib/categories";
import type { Horizon } from "@/lib/cost/types";
import type { CategoryResult, EstimateFull, EstimateSummary, SourceStamp } from "@/lib/data/types";
import { integer, money, moneyRange, shortDate } from "@/lib/format";
import { lineBars, totalsFor, type LineBar } from "@/lib/view";
import { CountUp } from "../CountUp";
import { GaugeBlock } from "../Gauge";
import { Icon } from "../Icon";
import { Sheet } from "../Sheet";

interface Props {
  name: string;
  meta: string;
  trimNote?: string;
  summary?: Pick<EstimateSummary, "years" | "priceStamp" | "reliability">;
  full?: EstimateFull;
  horizon: Horizon;
  scale: number;
  best?: { reason: string } | null;
  detailHref: string;
  price: number;
  index: number;
}

const perYearText = (b: LineBar, horizon: Horizon) => {
  if (b.key === "taxes" && horizon === 5) return "mostly in year 1";
  if (b.key === "fuel") return null;
  const r = b.perYear;
  return `${moneyRange(r.low, r.high)}/yr`;
};

export function CarCard({ name, meta, trimNote, summary, full, horizon, scale, best, detailHref, price, index }: Props) {
  const [method, setMethod] = useState<CategoryResult | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const headId = useId();

  const totals = summary ? totalsFor(summary.years, horizon) : null;
  const bars = full ? lineBars(full.categories, horizon, scale) : [];
  const biggest = bars.find((b) => b.isBiggest);
  const priceStale = summary?.priceStamp.stale ? summary.priceStamp : null;

  return (
    <article className={`car-card${best ? " car-card--best" : ""}`} aria-labelledby={headId} style={{ ["--i" as string]: index }}>
      {/* ---------------------------------------------------- Head + total */}
      <div className="car-card__top">
        <div className="car-card__head">
          <div className="car-card__title">
            <h2 id={headId} className="car-card__name">
              {name}
            </h2>
            <span className="mono muted">{meta}</span>
          </div>
          {best && (
            <span className="badge-best">
              <Icon name="star" size={12} />
              Best value
            </span>
          )}
        </div>
        {trimNote && (
          <p className="car-card__assume">
            <Icon name="info" size={14} />
            {trimNote}
          </p>
        )}

        <div className="car-card__total" aria-live="polite">
          <span className="small muted">{horizon === 5 ? "Total, 5 years" : "Total, first year"}</span>
          {totals ? (
            <>
              <div className="car-card__figures">
                <CountUp className="num car-card__big" value={totals.total.mid} duration={900} />
                <span className="car-card__monthly">
                  <span className="num">{money(totals.monthly)}</span>
                  <span>/mo</span>
                </span>
              </div>
              <span className="car-card__range">Likely {moneyRange(totals.total.low, totals.total.high)}</span>
            </>
          ) : (
            <>
              <span className="sk car-card__sk-big" />
              <span className="sk sk--soft" style={{ width: "46%", height: 14 }} />
            </>
          )}
        </div>

        <div className="car-card__chips">
          <span className="chip">Asking {money(price, { exact: true })}</span>
          {full && full.overMarket > 0 && (
            <span className="chip chip--warn">
              <Icon name="alert" size={12} />
              {money(full.overMarket)} over market
            </span>
          )}
          {priceStale && (
            <span className="chip">
              <Icon name="clock" size={12} />
              Price from {shortDate(priceStale.pulledAt)}
            </span>
          )}
        </div>

        {full && biggest ? (
          <p className="car-card__biggest">
            <span className="car-card__biggest-mark" aria-hidden="true" />
            <span>
              Biggest cost: <strong>{CATEGORY_LABEL[biggest.key]}</strong>
            </span>
            <span className="num">{moneyRange(biggest.value.low, biggest.value.high)}</span>
          </p>
        ) : (
          <span className="sk sk--soft" style={{ height: 44, width: "100%", borderRadius: 10 }} />
        )}
      </div>

      {/* ---------------------------------------------------- Reliability */}
      <div className="car-card__rel">
        {summary ? (
          <GaugeBlock
            score={summary.reliability.score}
            label={summary.reliability.label}
            isRisk={summary.reliability.isRisk}
            sub={full?.reliability.summary}
            source={<span className="mono car-card__src">NHTSA</span>}
          />
        ) : (
          <div className="gauge-block">
            <span className="sk" style={{ width: 120, height: 72, borderRadius: "60px 60px 8px 8px" }} />
            <span style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <span className="sk sk--soft" style={{ width: "40%", height: 12 }} />
              <span className="sk" style={{ width: "60%", height: 32 }} />
            </span>
          </div>
        )}
      </div>

      {full ? (
        <p className="car-card__note">{full.note}</p>
      ) : (
        <div className="car-card__note">
          <span className="sk sk--soft" style={{ height: 12, marginBottom: 8 }} />
          <span className="sk sk--soft" style={{ height: 12, width: "75%" }} />
        </div>
      )}

      {/* ---------------------------------------------------- Breakdown */}
      <div className="breakdown">
        <div className="breakdown__head">
          <h3>Breakdown</h3>
          {full && (
            <button type="button" className="link-btn breakdown__all" aria-expanded={allOpen} onClick={() => setAllOpen((o) => !o)}>
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
        {full ? (
          <ul className="breakdown__list">
            {bars.map((b) => (
              <CostLine
                key={`${b.key}-${allOpen}`}
                bar={b}
                horizon={horizon}
                defaultOpen={allOpen}
                riskFlagged={b.key === "repairs" && full.riskFlags.length > 0}
                stale={b.key === "depreciation" ? priceStale : null}
                onHow={() => setMethod(b.category)}
              />
            ))}
          </ul>
        ) : (
          <ul className="breakdown__list" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="line line--sk">
                <span className="line__sk-row">
                  <span className="sk sk--soft" style={{ width: `${40 + ((i * 13) % 30)}%`, height: 12 }} />
                  <span className="sk sk--soft" style={{ width: 64, height: 18 }} />
                </span>
                <span className="sk sk--soft" style={{ height: 6 }} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href={detailHref} className="btn btn--secondary car-card__more">
        Year by year, recalls and complaints
        <Icon name="arrow-right" size={14} className="btn__arrow" />
      </Link>

      <Sheet open={method !== null} onClose={() => setMethod(null)} title="How we got this number">
        {method && full && <MethodBody category={method} horizon={horizon} />}
      </Sheet>
    </article>
  );
}

function CostLine({
  bar,
  horizon,
  defaultOpen,
  riskFlagged,
  stale,
  onHow,
}: {
  bar: LineBar & { category: CategoryResult };
  horizon: Horizon;
  defaultOpen: boolean;
  riskFlagged: boolean;
  stale: SourceStamp | null;
  onHow: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const c = bar.category;
  const panelId = useId();
  const red = bar.isBiggest || riskFlagged;
  const perYear = perYearText(bar, horizon);

  return (
    <li className={`line${open ? " is-open" : ""}${red ? " is-red" : ""}`}>
      <button type="button" className="line__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        <span className="line__label">
          {c.label}
          {c.isEstimate && <span className="tag-est">Estimate</span>}
          {bar.isBiggest && <span className="line__flag">Biggest</span>}
          {!bar.isBiggest && riskFlagged && (
            <span className="line__flag">
              <Icon name="alert" size={11} />
              Risk
            </span>
          )}
        </span>
        <span className="line__value num">{moneyRange(bar.value.low, bar.value.high)}</span>
        <Icon name="chevron-down" size={14} className="line__chev" />
      </button>
      <span className="line__bar" aria-hidden="true">
        <span className="line__solid" style={{ width: `${bar.solid}%` }} />
        {bar.spread > 0 && <span className="line__spread" style={{ width: `${bar.spread}%` }} />}
      </span>
      <span className="line__meta">
        <span className="mono muted">{[perYear, c.note].filter(Boolean).join(" · ")}</span>
        <button type="button" className="line__how" onClick={onHow}>
          How we got this number<span className="sr-only">: {c.label}</span>
        </button>
      </span>
      <div className="line__more" id={panelId} hidden={!open}>
        {c.includes && c.includes.length > 0 && (
          <div className="line__includes">
            <span className="small muted">What&apos;s included</span>
            <ul>
              {c.includes.map((i) => (
                <li key={i} className="chip">
                  {i}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ol className="line__years" aria-label={`${c.label} by year`}>
          {c.years.slice(0, horizon === 1 ? 1 : 5).map((y, i) => (
            <li key={i}>
              <span className="muted">Year {i + 1}</span>
              <span className="num">{moneyRange(y.low, y.high)}</span>
            </li>
          ))}
        </ol>
        {c.key === "insurance" && <p className="small muted">Your real price depends on your age, driving record and coverage. Get a quote before you buy.</p>}
        {c.key === "repairs" && <p className="small muted">Unplanned fixes only. Oil changes, tires and brakes are under Maintenance.</p>}
        {stale && (
          <p className="small line__stale">
            <Icon name="clock" size={13} />
            Market value from {shortDate(stale.pulledAt)}, live data paused.
          </p>
        )}
      </div>
    </li>
  );
}

function MethodBody({ category, horizon }: { category: CategoryResult; horizon: Horizon }) {
  const total = category.years.slice(0, horizon).reduce((a, y) => ({ low: a.low + y.low, high: a.high + y.high }), { low: 0, high: 0 });
  return (
    <>
      <div className="method__value">
        <span className="small muted">
          {category.label}, {horizon === 5 ? "5 years" : "first year"}
        </span>
        <span className="num">{moneyRange(total.low, total.high)}</span>
        {category.isEstimate && <span className="tag-est">Estimate</span>}
      </div>
      <div className="method__block">
        <h3>Method</h3>
        <p>{category.method.method}</p>
      </div>
      <div className="method__block">
        <h3>Sources</h3>
        <ul className="method__sources">
          {category.method.sources.map((s) => (
            <li key={s.id}>
              <span className="method__src-name">{s.name}</span>
              <span className={`mono${s.stale ? " method__stale" : " muted"}`}>
                {s.stale ? `Paused · last pulled ${shortDate(s.pulledAt)}` : `Pulled ${shortDate(s.pulledAt)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {category.includes && (
        <p className="small muted">
          Covers {category.includes.slice(0, 5).join(", ").toLowerCase()}
          {category.includes.length > 5 ? ` and ${integer(category.includes.length - 5)} more` : ""}.
        </p>
      )}
      <Link href={`/methodology#${category.key}`} className="link small">
        Full methodology for {category.label.toLowerCase()}
      </Link>
    </>
  );
}

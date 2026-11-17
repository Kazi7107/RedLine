import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GaugeBlock } from "@/components/Gauge";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { YearChart } from "@/components/detail/YearChart";
import { CATEGORY_LABEL } from "@/lib/categories";
import { biggestCategory } from "@/lib/cost/horizon";
import type { ComplaintCategory } from "@/lib/cost/types";
import { getEstimate, getTypicalListing, parseEstimateRequest } from "@/lib/data";
import { integer, money, moneyRange, shortDate } from "@/lib/format";
import { DEFAULT_ANNUAL_MILES, isValidKey } from "@/lib/share";
import { totalsFor } from "@/lib/view";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Which complaint category a risk flag shows up as. */
const RISK_TO_COMPLAINT: Record<string, ComplaintCategory> = {
  transmission: "transmission",
  engine: "engine",
  "hybrid battery": "hybrid-system",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const pretty = id
    .split("-")
    .map((w) => (/^\d+$/.test(w) ? w : w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
  return { title: `${pretty}: 5-year cost`, description: `Year-by-year cost, recalls and owner complaints for the ${pretty}.` };
}

export default async function CarPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params;
  const q = await searchParams;
  if (!isValidKey(id)) notFound();

  // A bare /car/<id> link (no inputs) falls back to a typical listing for that car.
  const typical = !one(q.mileage) || !one(q.price) ? await getTypicalListing(id) : null;
  const parsed = parseEstimateRequest({
    key: id,
    mileage: one(q.mileage) ?? (typical ? String(typical.mileage) : undefined),
    price: one(q.price) ?? (typical ? String(typical.price) : undefined),
    zip: one(q.zip) ?? "98201",
    miles: one(q.miles) ?? String(DEFAULT_ANNUAL_MILES),
  });
  if (!parsed.ok) notFound();

  const req = parsed.value;
  const est = await getEstimate(req, { stage: "full" });
  if (est.status === "error") notFound();

  const backHref = `/compare?cars=${id}.${req.mileage}.${req.price}&zip=${req.zip}${req.annualMiles !== DEFAULT_ANNUAL_MILES ? `&miles=${req.annualMiles}` : ""}`;

  if (est.status === "insufficient_data") {
    return (
      <div className="app-shell">
        <SiteHeader />
        <main id="main" className="app-main">
          <div className="wrap wrap--wide detail">
            <Link href="/compare?start=1" className="back">
              <Icon name="arrow-left" />
              Pick another car
            </Link>
            <section className="car-card car-card--unavailable detail__unavail" role="alert">
              <div className="unavail">
                <h1 className="display" style={{ fontSize: "var(--t-h1)" }}>
                  {est.vehicle.name}
                </h1>
                <div className="unavail__msg">
                  <h2 className="display">We can&apos;t price this one honestly</h2>
                  <p>{est.message}</p>
                </div>
                <ul className="unavail__coverage">
                  {est.coverage.map((c) => (
                    <li key={c.label}>
                      <span>{c.label}</span>
                      <span className={c.found ? "is-found" : "is-missing"}>{c.found ? "Found" : "Not enough data"}</span>
                    </li>
                  ))}
                </ul>
                <div className="unavail__actions">
                  <Link href="/compare?start=1" className="btn btn--primary btn--sm">
                    Try another car
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }
  if (est.stage !== "full") notFound();

  const v = est.vehicle;
  const totals = totalsFor(est.years, 5);
  const biggest = biggestCategory(est.categories, 5)?.key ?? null;
  const risk = est.riskFlags[0];
  const redCat = risk ? "repairs" : biggest;
  const riskComplaints = new Set(est.riskFlags.map((r) => RISK_TO_COMPLAINT[r.component.toLowerCase()]).filter(Boolean));
  const maxComplaint = Math.max(1, ...est.complaints.map((c) => c.count));
  const salesTax = est.categories.find((c) => c.key === "taxes")?.years[0];

  const insight = [
    salesTax ? `Year 1 includes about ${money(salesTax.low)} in sales tax and fees.` : null,
    risk
      ? `Repairs bulge around year ${risk.peakYear}, when owners most often report ${risk.component.toLowerCase()} trouble on a car like this. The dashed caps show how high it could run.`
      : "After year 1, costs rise every year: repairs grow as the car ages, and gas and insurance prices go up.",
  ]
    .filter(Boolean)
    .join(" ");


  return (
    <div className="app-shell">
      <SiteHeader cta={{ href: backHref.replace("/compare?", "/compare?edit=0&"), label: "Edit car", tone: "secondary" }} />
      <main id="main" className="app-main">
        <div className="wrap wrap--wide detail">
          <Link href={backHref} className="back">
            <Icon name="arrow-left" />
            Back to comparison
          </Link>

          {/* ------------------------------------------------------ Header */}
          <section className="detail__hero">
            <div className="detail__intro">
              <span className="mono muted">
                {integer(req.mileage)} mi · {v.engine} · Asking {money(req.price, { exact: true })}
              </span>
              <h1 className="display">{v.name}</h1>
              {v.trimAssumed && <p className="small muted">Trim not picked, so we used the {v.trim}, the most common one.</p>}
              <p className="detail__note">{est.note}</p>
            </div>
            <div className="detail__figures">
              <div className="detail__total">
                <span className="small muted">Total, 5 years</span>
                <span className="num detail__big">{money(totals.total.mid)}</span>
                <span className="small" style={{ color: "var(--ink-3)" }}>
                  Likely {moneyRange(totals.total.low, totals.total.high)} · about <strong>{money(totals.monthly)}/mo</strong>
                </span>
              </div>
              <div className="detail__gauge card">
                <GaugeBlock score={est.reliability.score} label={est.reliability.label} isRisk={est.reliability.isRisk} sub={est.reliability.summary} size={104} />
              </div>
            </div>
          </section>

          {/* -------------------------------------------------- Risk flags */}
          {est.riskFlags.length > 0 && (
            <section aria-labelledby="risks-h" className="risks">
              <h2 id="risks-h" className="sr-only">
                Known risks
              </h2>
              {est.riskFlags.map((r) => (
                <article key={r.id} className="risk" data-reveal>
                  <span className="risk__icon" aria-hidden="true">
                    <Icon name="alert" size={20} />
                  </span>
                  <div className="risk__body">
                    <span className="badge-risk">
                      <Icon name="alert" size={12} />
                      Risk · {r.component}
                    </span>
                    <h3>{r.title}</h3>
                    <p>{r.body}</p>
                    <p className="risk__tip">
                      <strong>Before you buy:</strong> {r.checkTip}
                    </p>
                  </div>
                  <div className="risk__cost">
                    <span className="small muted">If it fails</span>
                    <span className="num">{moneyRange(r.costLow, r.costHigh)}</span>
                    <span className="small muted">About a {Math.round(r.probability * 100)}% chance in 5 years</span>
                  </div>
                </article>
              ))}
            </section>
          )}

          {/* ------------------------------------------------ Year by year */}
          <section aria-labelledby="yby" className="panel" data-reveal>
            <div className="panel__head">
              <h2 id="yby">Year by year</h2>
              <span className="mono muted">Midpoint of each estimate</span>
            </div>
            <YearChart categories={est.categories} red={redCat} />
            <p className="note">{insight}</p>

            <div className="ytable" role="region" aria-label="Year-by-year table" tabIndex={0}>
              <table>
                <caption className="sr-only">Cost by category and ownership year</caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <th scope="col" key={y}>
                        Year {y}
                      </th>
                    ))}
                    <th scope="col">5 years</th>
                  </tr>
                </thead>
                <tbody>
                  {est.categories.map((c) => {
                    const sum = c.years.reduce((a, y) => ({ low: a.low + y.low, high: a.high + y.high }), { low: 0, high: 0 });
                    return (
                      <tr key={c.key} className={c.key === redCat ? "is-red" : undefined}>
                        <th scope="row">
                          <span className="ytable__rowhead">
                            <span className="ytable__swatch" style={{ background: c.key === redCat ? "var(--red)" : `var(--cat-${c.key})` }} aria-hidden="true" />
                            {CATEGORY_LABEL[c.key]}
                            {c.isEstimate && <span className="tag-est">Est.</span>}
                          </span>
                        </th>
                        {c.years.map((y, i) => (
                          <td key={i}>{c.isRange ? `${money(y.low)}–${money(y.high)}` : money(y.low)}</td>
                        ))}
                        <td className="ytable__sum">{moneyRange(sum.low, sum.high)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    {est.years.map((y, i) => (
                      <td key={i}>{money((y.low + y.high) / 2)}</td>
                    ))}
                    <td className="ytable__sum">{money(totals.total.mid)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <details className="maint">
              <summary>
                What&apos;s in maintenance
                <Icon name="chevron-down" size={14} />
              </summary>
              <ul>
                {est.maintenanceSchedule.map((m, i) => (
                  <li key={`${m.item}-${i}`}>
                    <span className="mono muted">Year {m.year}</span>
                    <span>{m.item}</span>
                    <span className="num">{money(m.cost)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <div className="detail__pair">
            {/* ---------------------------------------------------- Recalls */}
            <section aria-labelledby="recalls" className="panel" data-reveal>
              <div className="panel__head">
                <h2 id="recalls">
                  Recalls <span className="muted">{est.recalls.length}</span>
                </h2>
                <span className="mono muted">Source: NHTSA</span>
              </div>
              {est.recalls.length === 0 ? (
                <p className="muted">No recalls on record for this model year.</p>
              ) : (
                <ul className="recalls">
                  {est.recalls.map((r) => (
                    <li key={r.id}>
                      <div className="recalls__top">
                        <h3>{r.title}</h3>
                        <span className="mono muted">{r.component}</span>
                      </div>
                      <p>{r.summary}</p>
                      <span className="mono muted">Issued {shortDate(r.reportedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="next-step">
                <span className="next-step__icon" aria-hidden="true">
                  <Icon name="shield" size={18} />
                </span>
                <div>
                  <h3>What to do</h3>
                  <p>
                    Check if this was fixed: enter the VIN on NHTSA.gov. Recall repairs are free at any dealer, even if you bought the car used.
                  </p>
                  <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
                    Look up the VIN on NHTSA.gov
                    <Icon name="external" size={14} />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------- Complaints */}
            <section aria-labelledby="complaints" className="panel" data-reveal>
              <div className="panel__head">
                <h2 id="complaints">What owners complain about</h2>
                <span className="mono muted">Source: NHTSA</span>
              </div>
              <ul className="complaints" data-inview>
                {est.complaints.map((c, i) => {
                  const red = riskComplaints.has(c.category);
                  return (
                    <li key={c.category} className={red ? "is-red" : undefined} style={{ ["--i" as string]: i }}>
                      <div className="complaints__row">
                        <span>
                          {c.label}
                          {red && (
                            <span className="line__flag" style={{ marginLeft: 8 }}>
                              <Icon name="alert" size={11} />
                              Known problem
                            </span>
                          )}
                        </span>
                        <span className="mono">{integer(c.count)}</span>
                      </div>
                      <span className="complaints__track">
                        <span style={{ width: `${(c.count / maxComplaint) * 100}%` }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="note">
                <span className="small muted" style={{ display: "block", marginBottom: 4 }}>
                  What owners describe most
                </span>
                {est.complaintSummary}
              </div>
              <p className="small muted">
                {integer(est.reliability.complaintTotal)} complaints reported to NHTSA, about {est.reliability.complaintsPer10k} for every 10,000 sold. Our score adjusts for how many were sold.
              </p>
            </section>
          </div>

          {/* ------------------------------------------------- Inspection */}
          <section className="inspect" aria-labelledby="inspect-h" data-reveal>
            <span className="inspect__icon" aria-hidden="true">
              <Icon name="wrench" size={22} />
            </span>
            <div>
              <h2 id="inspect-h">Still get a pre-purchase inspection</h2>
              <p>
                These numbers are for the model, not this exact car. A mechanic can spot what data can&apos;t: leaks, worn parts, accident damage. It usually costs $100 to $200
                and is the best money you&apos;ll spend on a used car.
              </p>
            </div>
          </section>

          <p className="small muted detail__sources">
            Pulled {est.sources.map((s) => `${s.name} ${shortDate(s.pulledAt)}${s.stale ? " (paused)" : ""}`).join(" · ")}.{" "}
            <Link href="/methodology" className="link">
              How we calculate
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

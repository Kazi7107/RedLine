import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { Gauge } from "@/components/Gauge";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { HeroStart } from "@/components/landing/HeroStart";
import { CATEGORY_LABEL } from "@/lib/categories";
import { overHorizon } from "@/lib/cost/horizon";
import type { CategoryKey } from "@/lib/cost/types";
import { getCatalog, getEstimate, getTypicalListing, type EstimateFull } from "@/lib/data";
import { miles, money } from "@/lib/format";
import { SOURCES } from "@/lib/sources";
import { lineBars, totalsFor } from "@/lib/view";

// Rebuilt hourly so the sample numbers track the (mock or live) inputs.
export const revalidate = 3600;

const SAMPLE_ZIP = "98201";

async function sample(key: string): Promise<{ est: EstimateFull; price: number; mileage: number }> {
  const listing = await getTypicalListing(key);
  if (!listing) throw new Error(`No typical listing for ${key}`);
  const est = await getEstimate({ key, ...listing, zip: SAMPLE_ZIP, annualMiles: 12000 }, { latency: false });
  if (est.status !== "ok" || est.stage !== "full") throw new Error(`Sample estimate failed for ${key}`);
  return { est, ...listing };
}

const TILE_COPY: Record<CategoryKey, string> = {
  depreciation: "What the car will be worth less when you sell it. Easy to forget, but it's real money.",
  fuel: "Your yearly miles, this trim's real-world MPG and the Washington gas price this week.",
  insurance: "Shown as a range, not a quote. Your price depends on your age and driving record.",
  maintenance: "The planned stuff: oil changes, tires, brakes, filters and a new battery.",
  repairs: "The unplanned stuff. Older cars and models with known problems cost more.",
  taxes: "Washington sales tax for your ZIP up front, then registration every year.",
};

const FAQ = [
  {
    q: "Is this an insurance or repair quote?",
    a: "No. Insurance and repairs are ranges built from averages for cars like this one. Your real insurance price depends on your age, driving record and coverage. Get a quote before you buy.",
  },
  {
    q: "Why only Washington right now?",
    a: "Sales tax, registration and the Sound Transit excise tax change a lot from state to state, and even ZIP to ZIP. We'd rather get one state right than guess at fifty.",
  },
  {
    q: "How accurate are the estimates?",
    a: "Fuel, taxes and fees are close, because they come straight from public data. Value you lose is based on what the car sells for today. Insurance and repairs are honest ranges, and we label them as estimates everywhere they show up.",
  },
  {
    q: "Does the loan payment count?",
    a: "No. We count what owning the car costs on top of buying it: value you lose, gas, insurance, maintenance, repairs, taxes and fees. The monthly number is what you'd budget besides the loan.",
  },
  {
    q: "What should I do about a recall?",
    a: "Enter the car's VIN on NHTSA.gov to see if the recall was already fixed. If it wasn't, any dealer for that brand will fix it for free, even if you bought the car used.",
  },
  {
    q: "Do you save what I type in?",
    a: "No account and nothing to sign up for. Your comparison lives in the link, so you can send it to a friend or family member and they'll see exactly what you see.",
  },
];

export default async function Home() {
  const [catalog, civic, focus, corolla] = await Promise.all([
    getCatalog(),
    sample("2017-honda-civic-lx"),
    sample("2015-ford-focus-se"),
    sample("2016-toyota-corolla-le"),
  ]);

  const civicTotals = totalsFor(civic.est.years, 5);
  const civicBars = lineBars(civic.est.categories, 5, 1);
  const splitTotal = civicBars.reduce((a, b) => a + b.value.mid, 0);

  const focusTotal = totalsFor(focus.est.years, 5).total.mid;
  const corollaTotal = totalsFor(corolla.est.years, 5).total.mid;
  const raceMax = Math.max(focusTotal, corollaTotal);
  const stickerGap = corolla.price - focus.price;
  const ownGap = focusTotal - corollaTotal;
  const focusRisk = focus.est.riskFlags[0];

  const corollaByCat = Object.fromEntries(corolla.est.categories.map((c) => [c.key, overHorizon(c.years, 5).mid])) as Record<CategoryKey, number>;

  return (
    <>
      <SiteHeader variant="landing" />
      <main id="main">
        {/* ------------------------------------------------------------ Hero */}
        <section className="hero">
          <svg className="hero__tach" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
            {Array.from({ length: 41 }, (_, i) => {
              const a = (Math.PI * (210 - i * 6)) / 180;
              const major = i % 5 === 0;
              const r1 = 290;
              const r2 = major ? 250 : 268;
              const red = i >= 33;
              return (
                <line
                  key={i}
                  x1={(300 + r1 * Math.cos(a)).toFixed(1)}
                  y1={(300 - r1 * Math.sin(a)).toFixed(1)}
                  x2={(300 + r2 * Math.cos(a)).toFixed(1)}
                  y2={(300 - r2 * Math.sin(a)).toFixed(1)}
                  className={red ? "hero__tick hero__tick--red" : "hero__tick"}
                  strokeWidth={major ? 3 : 1.5}
                />
              );
            })}
            <line className="hero__tach-needle" x1="300" y1="300" x2="300" y2="70" />
            <circle cx="300" cy="300" r="10" className="hero__tach-hub" />
          </svg>

          <div className="wrap hero__inner">
            <div className="hero__copy">
              <p className="eyebrow hero__in" style={{ ["--i" as string]: 0 }}>
                Used car cost check · Washington
              </p>
              <h1 className="display hero__title">
                <span className="hero__line">
                  <span className="hero__in" style={{ ["--i" as string]: 1 }}>
                    What will this car
                  </span>
                </span>
                <span className="hero__line">
                  <span className="hero__in" style={{ ["--i" as string]: 2 }}>
                    really cost you?
                  </span>
                </span>
              </h1>
              <p className="lead hero__in" style={{ ["--i" as string]: 3 }}>
                The asking price is just the start. Pick a car and we&apos;ll add up five years of value you lose, gas, insurance, repairs and taxes, so you know what
                you&apos;re signing up for.
              </p>
              <div className="hero__in" style={{ ["--i" as string]: 4 }}>
                <HeroStart catalog={catalog} initial={{ year: 2017, make: "Honda", modelKey: "2017-honda-civic" }} />
              </div>
              <p className="hero__fine hero__in" style={{ ["--i" as string]: 5 }}>
                Compare up to 3 cars. Free, no account needed.
              </p>
            </div>

            <aside className="sample hero__in" style={{ ["--i" as string]: 3 }} aria-label="Example result">
              <div className="sample__head">
                <span>{civic.est.vehicle.name}</span>
                <span className="mono">{miles(civic.mileage)}</span>
              </div>
              <div className="sample__ask">
                <span className="small muted">Asking price</span>
                <span className="num sample__strike">{money(civic.price, { exact: true })}</span>
              </div>
              <div className="sample__total">
                <span className="small muted">5 years of owning it</span>
                <CountUp className="num sample__big" value={civicTotals.total.mid} duration={1400} />
                <span className="sample__mo">
                  About <strong>{money(civicTotals.monthly)}</strong> a month, on top of the loan.
                </span>
              </div>
              <div className="sample__split" data-inview>
                <div className="sample__bar" role="img" aria-label={`Cost split: ${civicBars.map((b) => `${CATEGORY_LABEL[b.key]} ${Math.round((b.value.mid / splitTotal) * 100)}%`).join(", ")}`}>
                  {civicBars.map((b, i) => (
                    <span
                      key={b.key}
                      className={b.isBiggest ? "is-biggest" : undefined}
                      style={{ flexGrow: b.value.mid, background: b.isBiggest ? "var(--red)" : `var(--cat-${b.key})`, ["--i" as string]: i }}
                    />
                  ))}
                </div>
                <ul className="sample__legend">
                  {civicBars.map((b) => (
                    <li key={b.key}>
                      <span className="sample__dot" style={{ background: b.isBiggest ? "var(--red)" : `var(--cat-${b.key})` }} />
                      {CATEGORY_LABEL[b.key]}
                      {b.isBiggest && <span className="sample__biggest">Biggest</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mono muted">Sample estimate · Everett, WA · 12,000 mi/yr</p>
            </aside>
          </div>
        </section>

        {/* ---------------------------------------------------- Source strip */}
        <div className="strip">
          <div className="wrap strip__inner">
            <span className="strip__lead">Built on public data</span>
            <ul className="strip__list">
              {SOURCES.map((s) => (
                <li key={s.id}>{s.short}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---------------------------------------------------- How it works */}
        <section id="how" aria-labelledby="how-h" className="section">
          <div className="wrap section__stack">
            <div className="section-head" data-reveal>
              <span className="kicker">01 · How it works</span>
              <h2 id="how-h" className="display">
                Three steps to the real number
              </h2>
              <p className="lead">Redline adds up what a used car will cost you over the next five years, using public data and Washington&apos;s actual taxes.</p>
            </div>
            <ol className="steps">
              <li className="step" data-reveal style={{ ["--i" as string]: 0 }}>
                <span className="step__n num">01</span>
                <h3>Add the car</h3>
                <p>Pick the year, make, model and trim, then copy the mileage and price from the listing. Not sure about the trim? We&apos;ll use the most common one.</p>
                <div className="step__art step__art--form" aria-hidden="true">
                  <span>
                    <em>Year</em>2016
                  </span>
                  <span>
                    <em>Model</em>Toyota Corolla
                  </span>
                  <span className="is-active">
                    <em>Trim</em>LE · 1.8L CVT<i className="step__caret" />
                  </span>
                </div>
              </li>
              <li className="step" data-reveal style={{ ["--i" as string]: 1 }}>
                <span className="step__n num">02</span>
                <h3>We pull the data</h3>
                <p>Recalls and owner complaints from NHTSA, real gas mileage, this week&apos;s Washington gas price and the sales tax for your ZIP.</p>
                <ul className="step__art step__art--checks" aria-hidden="true" data-inview>
                  {["Recalls and complaints", "Gas mileage", "WA gas price", "Taxes for your ZIP"].map((t, i) => (
                    <li key={t} style={{ ["--i" as string]: i }}>
                      <Icon name="check" size={14} />
                      {t}
                    </li>
                  ))}
                </ul>
              </li>
              <li className="step" data-reveal style={{ ["--i" as string]: 2 }}>
                <span className="step__n num">03</span>
                <h3>Compare the real cost</h3>
                <p>See 2 or 3 cars side by side: the 5-year total, what it works out to each month, and which one is the best value.</p>
                <div className="step__art step__art--bars" aria-hidden="true" data-inview>
                  <div style={{ ["--w" as string]: `${(corollaTotal / raceMax) * 100}%` }}>
                    <span>Corolla</span>
                    <b />
                    <strong>{money(corollaTotal)}</strong>
                    <em className="badge-best">
                      <Icon name="star" size={11} />
                      Best
                    </em>
                  </div>
                  <div style={{ ["--w" as string]: `${(focusTotal / raceMax) * 100}%` }}>
                    <span>Focus</span>
                    <b />
                    <strong>{money(focusTotal)}</strong>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* --------------------------------------------------- What we count */}
        <section id="what" aria-labelledby="what-h" className="section section--tint">
          <div className="wrap section__stack">
            <div className="section-head" data-reveal>
              <span className="kicker">02 · What we count</span>
              <h2 id="what-h" className="display">
                What&apos;s inside the 5-year cost
              </h2>
              <p className="lead">The sticker price leaves most of the cost out. Here&apos;s everything we add up, with what it came to for a 2016 Corolla.</p>
            </div>
            <ul className="tiles">
              {(["depreciation", "fuel", "insurance", "maintenance", "repairs", "taxes"] as CategoryKey[]).map((k, i) => (
                <li key={k} className={`tile tile--${k}`} data-reveal style={{ ["--i" as string]: i }}>
                  <span className="tile__swatch" style={{ background: `var(--cat-${k})` }} aria-hidden="true" />
                  <h3>{CATEGORY_LABEL[k]}</h3>
                  <p>{TILE_COPY[k]}</p>
                  <span className="tile__eg">
                    <span className="mono muted">2016 Corolla, 5 yrs</span>
                    <span className="num">{money(corollaByCat[k])}</span>
                    {(k === "insurance" || k === "repairs") && <span className="tag-est">Estimate</span>}
                  </span>
                </li>
              ))}
              <li className="tile tile--rel" data-reveal style={{ ["--i" as string]: 6 }}>
                <Gauge score={corolla.est.reliability.score} isRisk={false} size={140} />
                <div>
                  <h3>Plus a reliability score</h3>
                  <p>
                    A 0 to 100 score built from NHTSA recalls and owner complaints, adjusted for how many of that car were sold. Engine and transmission complaints count
                    extra, because those are the ones that cost thousands.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------- Why it matters */}
        <section aria-labelledby="ex-h" className="section">
          <div className="wrap why">
            <div className="why__copy" data-reveal>
              <span className="kicker">03 · Why it matters</span>
              <h2 id="ex-h" className="display">
                The cheap car isn&apos;t always cheap
              </h2>
              <p className="lead">
                A 2015 Ford Focus is {money(stickerGap)} cheaper to buy than a 2016 Corolla. Over five years it costs about <strong>{money(ownGap)} more</strong> to own,
                mostly because its automatic transmission is a known trouble spot.
              </p>
              <Link href={`/compare?cars=2015-ford-focus-se.${focus.mileage}.${focus.price}~2016-toyota-corolla-le.${corolla.mileage}.${corolla.price}&zip=${SAMPLE_ZIP}`} className="btn btn--secondary">
                See this comparison
                <Icon name="arrow-right" className="btn__arrow" />
              </Link>
            </div>

            <figure className="race card" data-inview aria-labelledby="race-cap">
              <figcaption id="race-cap" className="sr-only">
                Sticker price: Focus {money(focus.price)}, Corolla {money(corolla.price)}. Five-year cost: Focus {money(focusTotal)}, Corolla {money(corollaTotal)}.
              </figcaption>
              <div className="race__group" aria-hidden="true">
                <span className="race__label">Sticker price</span>
                <div className="race__row" style={{ ["--w" as string]: `${(focus.price / raceMax) * 100}%`, ["--i" as string]: 0 }}>
                  <span className="race__car">2015 Focus</span>
                  <span className="race__track">
                    <span className="race__fill" />
                  </span>
                  <span className="num race__val">{money(focus.price, { exact: true })}</span>
                </div>
                <div className="race__row" style={{ ["--w" as string]: `${(corolla.price / raceMax) * 100}%`, ["--i" as string]: 1 }}>
                  <span className="race__car">2016 Corolla</span>
                  <span className="race__track">
                    <span className="race__fill" />
                  </span>
                  <span className="num race__val">{money(corolla.price, { exact: true })}</span>
                </div>
              </div>
              <div className="race__group" aria-hidden="true">
                <span className="race__label">5 years of owning it</span>
                <div className="race__row race__row--risk" style={{ ["--w" as string]: `${(focusTotal / raceMax) * 100}%`, ["--i" as string]: 2 }}>
                  <span className="race__car">2015 Focus</span>
                  <span className="race__track">
                    <span className="race__fill" />
                  </span>
                  <span className="num race__val">{money(focusTotal)}</span>
                </div>
                <div className="race__row" style={{ ["--w" as string]: `${(corollaTotal / raceMax) * 100}%`, ["--i" as string]: 3 }}>
                  <span className="race__car">2016 Corolla</span>
                  <span className="race__track">
                    <span className="race__fill" />
                  </span>
                  <span className="num race__val">{money(corollaTotal)}</span>
                </div>
              </div>
              {focusRisk && (
                <p className="race__note">
                  <span className="badge-risk">
                    <Icon name="alert" size={12} />
                    Risk
                  </span>
                  {focusRisk.component} trouble on the Focus could cost {money(focusRisk.costLow)} to {money(focusRisk.costHigh)}.
                </p>
              )}
            </figure>
          </div>
        </section>

        {/* ---------------------------------------------------- Data sources */}
        <section id="sources" aria-labelledby="src-h" className="section section--tint">
          <div className="wrap section__stack">
            <div className="section-head" data-reveal>
              <span className="kicker">04 · Data sources</span>
              <h2 id="src-h" className="display">
                Where the numbers come from
              </h2>
              <p className="lead">
                All public data. Fuel, taxes and fees are close to exact. Insurance and repairs are ranges, and we say so wherever they show up.
              </p>
            </div>
            <div className="src-table card" data-reveal>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">What it gives us</th>
                    <th scope="col">Refreshed</th>
                  </tr>
                </thead>
                <tbody>
                  {SOURCES.map((s) => (
                    <tr key={s.id}>
                      <th scope="row">{s.name}</th>
                      <td>{s.gives}</td>
                      <td>
                        <span className="mono">{s.refresh}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted" data-reveal>
              Want the details? <Link href="/methodology" className="link">Read how we calculate each number</Link>.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------- FAQ */}
        <section id="faq" aria-labelledby="faq-h" className="section">
          <div className="wrap wrap--narrow section__stack">
            <div className="section-head" data-reveal>
              <span className="kicker">05 · FAQ</span>
              <h2 id="faq-h" className="display">
                Questions people ask
              </h2>
            </div>
            <div className="faq" data-reveal>
              {FAQ.map((f) => (
                <details key={f.q} className="faq__item">
                  <summary>
                    {f.q}
                    <span className="faq__icon" aria-hidden="true" />
                  </summary>
                  <div className="faq__a">
                    <p>{f.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- CTA band */}
        <section aria-labelledby="cta-h" className="cta">
          <svg className="cta__arc" viewBox="0 0 400 220" aria-hidden="true" focusable="false">
            <path d="M20 200 A180 180 0 0 1 380 200" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
            <path d="M335 78 A180 180 0 0 1 380 200" fill="none" stroke="var(--red)" strokeWidth="14" />
            <line className="cta__needle" x1="200" y1="200" x2="200" y2="52" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div className="wrap cta__inner">
            <div>
              <h2 id="cta-h" className="display">
                Got a car in mind?
              </h2>
              <p>Check its real cost before you talk to the seller.</p>
            </div>
            <Link href="/compare?start=1" className="btn btn--primary btn--lg">
              Check a car
              <Icon name="arrow-right" className="btn__arrow" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter variant="full" />
    </>
  );
}

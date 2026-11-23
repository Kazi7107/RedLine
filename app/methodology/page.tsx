import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CATEGORY_LABEL } from "@/lib/categories";
import { CLASS_PARAMS, RULES } from "@/lib/cost/calculate";
import { BANDS } from "@/lib/cost/reliability";
import { money } from "@/lib/format";
import { SOURCES } from "@/lib/sources";

export const metadata: Metadata = {
  title: "How we calculate",
  description: "How Redline estimates each part of a used car's 5-year cost: sources, refresh rates and the adjustments we make.",
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

const TOC = [
  ["overview", "The short version"],
  ["depreciation", CATEGORY_LABEL.depreciation],
  ["fuel", CATEGORY_LABEL.fuel],
  ["insurance", CATEGORY_LABEL.insurance],
  ["maintenance", CATEGORY_LABEL.maintenance],
  ["repairs", CATEGORY_LABEL.repairs],
  ["taxes", CATEGORY_LABEL.taxes],
  ["reliability", "Reliability score"],
  ["adjustments", "Adjustments"],
  ["sources", "Sources and refresh rates"],
  ["limits", "What we don't count"],
] as const;

export default function Methodology() {
  const ins = CLASS_PARAMS.compact.insurance;
  return (
    <>
      <SiteHeader />
      <main id="main" className="method-page">
        <header className="method-hero">
          <div className="wrap">
            <p className="eyebrow">Methodology</p>
            <h1 className="display">How we get the number</h1>
            <p className="lead">
              Every number on Redline comes from public data run through the same model. Here&apos;s each piece in plain English, including where we&apos;re estimating.
            </p>
          </div>
        </header>

        <div className="wrap method-body">
          <nav className="method-toc" aria-label="On this page">
            <span className="mono muted">On this page</span>
            <ol>
              {TOC.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="prose">
            <section id="overview">
              <h2>The short version</h2>
              <p>
                We start with the car you picked, the mileage and asking price from the listing, your ZIP and how far you drive. Then we add up six costs for each of the next
                five years. Costs grow as the car ages: repairs get more likely, and gas, insurance and shop labor get more expensive.
              </p>
              <div className="formula" aria-label="Formula">
                <span>Value you lose</span>+<span>Fuel</span>+<span>Insurance</span>+<span>Maintenance</span>+<span>Repairs</span>+<span>Taxes and registration</span>
                <b>= 5-year cost</b>
              </div>
              <p>
                The monthly number is that total spread over 60 months, rounded to the nearest $5. It&apos;s what to budget <em>on top of</em> a loan payment. Totals show
                the midpoint, with the likely range right under it.
              </p>
            </section>

            <section id="depreciation">
              <h2>{CATEGORY_LABEL.depreciation}</h2>
              <p>
                What the car will be worth less when you&apos;re done with it. We start from today&apos;s market value for that trim and mileage (MarketCheck), then take off a
                yearly share based on the type of car, the brand&apos;s resale record and how much you drive. Older cars lose a smaller share each year.
              </p>
              <p>If the asking price is over market value, the difference counts as value lost on day one. We call that out on the card.</p>
            </section>

            <section id="fuel">
              <h2>{CATEGORY_LABEL.fuel}</h2>
              <p>
                Your yearly miles divided by the trim&apos;s combined MPG (FuelEconomy.gov), times the Washington average gas price (EIA, weekly; the U.S. average from FuelEconomy.gov if EIA is unavailable). We assume gas goes up{" "}
                {pct(RULES.gasInflation)} a year and the engine loses about half a percent of its mileage each year.
              </p>
            </section>

            <section id="insurance">
              <h2>
                {CATEGORY_LABEL.insurance} <span className="tag-est">Estimate</span>
              </h2>
              <p>
                Full-coverage averages for the type of car, adjusted for Washington. For a compact car that&apos;s about {money(ins[0])} to {money(ins[1])} a year. Rates rise
                about {pct(RULES.insuranceInflation)} a year, and collision gets a little cheaper as the car is worth less.
              </p>
              <p className="callout">This is a range, not a quote. Your real price depends on your age, driving record, credit and the coverage you pick.</p>
            </section>

            <section id="maintenance">
              <h2>{CATEGORY_LABEL.maintenance}</h2>
              <p>
                The planned stuff on the maker&apos;s schedule: oil changes, tire rotations, filters and wipers, a new set of tires, brake pads and rotors, transmission fluid,
                spark plugs and coolant, and a 12V battery. Wear items are spread over the miles that wear them out, the way AAA does it, and priced at Washington shop rates
                that rise {pct(RULES.laborInflation)} a year.
              </p>
            </section>

            <section id="repairs">
              <h2>
                {CATEGORY_LABEL.repairs} <span className="tag-est">Estimate</span>
              </h2>
              <p>
                The unplanned stuff, kept separate from maintenance. We start with average repair spend for the type of car at its mileage, then scale it by the model&apos;s
                NHTSA complaint record. A reliability score of 75 is neutral; each point below adds 1%, each point above takes 1% off. Repair costs grow{" "}
                {pct(RULES.repairGrowthPerYear)} a year you own the car.
              </p>
              <p>
                When a model has a known expensive failure, like the 2015 Focus transmission or the hybrid battery on an older Prius, we add its cost weighted by how likely it is,
                mostly around the year it&apos;s most likely to hit. That&apos;s why ranges are wider on those cars.
              </p>
            </section>

            <section id="taxes">
              <h2>{CATEGORY_LABEL.taxes}</h2>
              <p>
                Sales tax for your ZIP (WA DOR) plus the state                Sales tax for your ZIP (WA DOR) on the asking price, plus the title fee, in year one. Then yearly registration (WA DOL).apos;s extra {(RULES.motorVehicleSalesTax * 100).toFixed(1)}% motor vehicle tax on the asking price, plus the title fee, in year one. Then yearly registration (WA DOL), with the $75 hybrid fee where it applies. Inside the Sound Transit district we add
                the RTA motor vehicle excise tax, {(RULES.rtaRate * 100).toFixed(1)}% of the car&apos;s depreciated MSRP each year. That&apos;s why
                this line says &ldquo;based on your ZIP&rdquo;.
              </p>
            </section>

            <section id="reliability">
              <h2>Reliability score</h2>
              <p>
                A score from 0 to 100, higher is better. It&apos;s built from NHTSA owner complaints per 10,000 cars sold (so popular cars aren&apos;t punished for being
                popular), the number of recalls, and an extra penalty when complaints pile up in the engine, transmission or hybrid system, since those failures cost thousands.
              </p>
              <ul className="bands">
                {BANDS.map((b, i) => (
                  <li key={b.band}>
                    <span className="num">{i === 0 ? `${b.min}+` : `${b.min}–${BANDS[i - 1].min - 1}`}</span>
                    <span>{b.label}</span>
                    {b.band === "risky" && (
                      <span className="badge-risk">
                        <Icon name="alert" size={12} />
                        Shown in red
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section id="adjustments">
              <h2>Adjustments</h2>
              <div className="adjust">
                <div className="adjust__card">
                  <span className="num">+{pct(RULES.oldCarRepairMultiplier - 1)}</span>
                  <h3>Repairs on cars over {RULES.oldCarAge} years old</h3>
                  <p>Parts wear out together, rubber and plastic get brittle, and electrical gremlins show up. It kicks in the year the car turns {RULES.oldCarAge + 1}.</p>
                </div>
                <div className="adjust__card">
                  <span className="num">+40–50%</span>
                  <h3>German luxury brands</h3>
                  <p>
                    BMW, Audi, Mercedes and the like cost 40 to 50% more to fix than other cars in their class. We use {pct(RULES.germanLuxuryRepairMultiplier - 1)}, plus
                    pricier oil changes and parts.
                  </p>
                </div>
                <div className="adjust__card">
                  <span className="num">Peak year</span>
                  <h3>Known problems</h3>
                  <p>Model-specific risks are spread around the year they most often show up, so the year-by-year chart shows the bump where it&apos;s likely.</p>
                </div>
              </div>
            </section>

            <section id="sources">
              <h2>Sources and refresh rates</h2>
              <div className="src-table card">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Source</th>
                      <th scope="col">Used for</th>
                      <th scope="col">Refreshed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SOURCES.map((s) => (
                      <tr key={s.id}>
                        <th scope="row">
                          <a href={s.url} target="_blank" rel="noreferrer" className="link">
                            {s.name}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        </th>
                        <td>{s.usedFor}</td>
                        <td>
                          <span className="mono">{s.refresh}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                We cache every source and refresh it on that schedule. If a live feed is down or we hit a usage limit, we keep showing the last good value and say so, for
                example &ldquo;Price from Nov 12, live data paused&rdquo;.
              </p>
            </section>

            <section id="limits">
              <h2>What we don&apos;t count</h2>
              <ul className="ticks">
                <li>Loan interest and the loan payment itself</li>
                <li>Parking, tolls, car washes and accessories</li>
                <li>Accident repairs (that&apos;s what insurance is for)</li>
                <li>States other than Washington, for now</li>
              </ul>
              <p>
                And it&apos;s about the model, not this exact car. Always get a pre-purchase inspection.
              </p>
            </section>

            <div className="method-cta">
              <Link href="/compare?start=1" className="btn btn--primary btn--lg">
                Check a car
                <Icon name="arrow-right" className="btn__arrow" />
              </Link>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter variant="full" />
    </>
  );
}

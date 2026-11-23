# Redline

**The true 5-year cost of a used car in Washington State.** Not just the sticker price: value you lose, fuel, insurance, maintenance, repairs, and taxes and registration, plus a reliability score built from NHTSA recalls and complaints.

UW CSS 496 capstone · Next.js (App Router, TypeScript) · Supabase (Postgres) · Vercel

> **Status: ~90%, live data.** Every screen, state and interaction is built. MPG, recalls, owner complaints, VIN decoding and gas prices come **live** from FuelEconomy.gov, NHTSA and EIA. Market value, insurance, maintenance and WA taxes come from reference tables (no free API has them). Supabase and MarketCheck are not connected yet.

---

## Run it

```bash
npm install
npm run dev                  # http://localhost:3000, live data, no keys needed
# optional: cp .env.example .env.local and add a free EIA_API_KEY for WA gas prices
```

| Command | What it does |
| --- | --- |
| `npm run check` | lint + typecheck + tests + production build |
| `npm test` | Vitest unit tests (pure logic only) |
| `npm run screenshots` | Screens at 390px and 1440px into `screenshots/` (needs `npm start` running and Chrome installed) |

### Env vars (all optional, in `.env.local`)

| Var | Effect |
| --- | --- |
| `EIA_API_KEY` | Live Washington weekly gas price. Without it, gas uses FuelEconomy.gov's U.S. average. |
| `USE_MOCK_DATA=true` | Runs on the seed instead of the APIs (offline demos; tests always do this). |
| `MOCK_LATENCY=0` | Mock mode: turns off the artificial delay. Leave it on to see the loading states. |
| `MOCK_MARKETCHECK_LIMIT_HIT=true` | Mock mode: shows the stale-price state ("Price from Nov 12, live data paused"). |

---

## What's built

| Route | Screen |
| --- | --- |
| `/` | Landing page: sticky header with scrollspy, hero with inline year/make/model, data-source strip, how it works, what we count, Focus vs Corolla "why it matters", sources table, FAQ, dark CTA band, footer |
| `/compare` | Empty state, then the add-car flow (year → make → model → trim with **Not sure**, mileage, price, ZIP, annual miles, optional VIN with a decode animation, inline validation, add/edit/remove up to 3 cars) |
| `/compare?cars=…` | Results: 5-year total + $/mo, 1-year/5-year toggle, biggest-cost callout, expandable breakdown with a "How we got this number" sheet on every line, reliability gauge, best-value pick with reason, share link, change ZIP/miles. Columns on desktop; swipeable cards with tabs on phones |
| `/car/[id]` | Detail: risk flags, year-by-year stacked chart + table, maintenance schedule, recalls with a next step, top complaint categories, inspection note |
| `/methodology` | Every category, sources and refresh rates, the adjustments (repairs +25% over 10 years old, German luxury +40 to 50%). `/how-it-works` redirects here |
| `/states` | Design-review gallery: empty, loading, error, stale price, link to 404 (not linked from the site, `noindex`) |
| any bad URL | 404 page |

**Try these:**
- `/compare?cars=2017-honda-civic-lx.68400.15900~2016-toyota-corolla-le.74200.14200~2015-ford-focus-se.81500.8900&zip=98201`
- Error state: add a **2009 Saturn Astra**
- Hybrid battery risk: `/car/2014-toyota-prius-two`
- VIN decode: on the add-car form, click **Try a sample VIN**, or paste `2T1BURHE5GC512345`

**Design system:** tokens are CSS custom properties in [app/globals.css](app/globals.css). Light mode only. Red is reserved for best value, the biggest cost and risk flags, and it always comes with a label or icon. Barlow Condensed for numbers and headlines, IBM Plex Sans for body text, IBM Plex Mono for sources. Fonts are self-hosted by `next/font`. No CSS framework, no chart library: the chart is HTML/CSS. Motion uses CSS plus one shared IntersectionObserver, and `prefers-reduced-motion` turns it all off.

---

## How the data flows

```
page / API route ──► lib/data/index.ts ──► DataSource (mock | live) ──► raw inputs
                           │                                              (MPG, recalls, gas,
                           ▼                                               market value, ZIP tax)
                     lib/cost/*  (pure, unit tested)
                           │
                           ▼
                  EstimateResponse  ◄── the shape /api/estimate returns
```

- **[lib/data/index.ts](lib/data/index.ts)** is the only module pages and routes call. It picks the source from `USE_MOCK_DATA`, runs the cost model and builds the response.
- **[lib/data/types.ts](lib/data/types.ts)** holds the `DataSource` interface and the `EstimateResponse` shape. The live implementation must keep both.
- **[lib/cost/](lib/cost/)** holds the pure math: cost model, reliability score, best value, horizon/monthly. No I/O.
- **`/api/estimate`** has `stage=summary` (totals) and `stage=full` (breakdown, recalls, complaints). The results page calls summary first, so the total shows before the breakdown, the same way the real API will behave.

### What's live and what's reference data

| Data | Source | Where |
| --- | --- | --- |
| Combined MPG per trim | **Live**, FuelEconomy.gov `/vehicle/{epaId}` (each trim's EPA id is in the seed) | [lib/sources/fueleconomy.ts](lib/sources/fueleconomy.ts) |
| Recalls | **Live**, NHTSA `recallsByVehicle` | [lib/sources/nhtsa.ts](lib/sources/nhtsa.ts) |
| Owner complaints by category | **Live**, NHTSA `complaintsByVehicle`, sorted into categories by component | [lib/sources/nhtsa-normalize.ts](lib/sources/nhtsa-normalize.ts) |
| VIN decode | **Live**, NHTSA vPIC, matched to the catalog | same |
| Gas price | **Live**, EIA weekly WA regular (with key), else FuelEconomy.gov U.S. average | [lib/sources/eia.ts](lib/sources/eia.ts) |
| Catalog of 28 cars, class, resale factor, units sold, risk flags | Reference | [lib/data/mock/seed.ts](lib/data/mock/seed.ts) via [lib/data/reference.ts](lib/data/reference.ts) |
| Market value (typical WA listing ± mileage) | Reference, until MarketCheck is wired up | `referenceMarketValue` |
| Insurance, maintenance, repair factors | Reference (AAA) | `CLASS_PARAMS` in [lib/cost/calculate.ts](lib/cost/calculate.ts) |
| ZIP → sales tax / RTA | Reference (WA DOR) | [lib/data/mock/locales.ts](lib/data/mock/locales.ts) |

[lib/data/live.ts](lib/data/live.ts) ties it together. Responses sit in Next's data cache (MPG 30 days, NHTSA 1 day, gas 12 hours). If an API fails, that line falls back to the reference value and is marked paused, so an outage never breaks a page. NHTSA quirks handled: it answers "no results" with HTTP 400, and it files no complaints under some models (2015 F-150), in which case the reference counts are used and labeled.

The cost model, reliability score, best-value pick, monthly math, URL sharing and validation are all real code with unit tests.

---

## What's left to connect (exact files)

1. **Apply the schema:** [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql). It has reference tables (public read) and cache tables (server only), with RLS on everything.
2. **Load the reference tables** from the contents of [lib/data/mock/seed.ts](lib/data/mock/seed.ts) (models, trims, risk flags) and [lib/data/mock/locales.ts](lib/data/mock/locales.ts) (WA DOR rates). The AAA factors are `CLASS_PARAMS` in [lib/cost/calculate.ts](lib/cost/calculate.ts).
3. **Swap the reference reads in [lib/data/live.ts](lib/data/live.ts) for table reads.** Each spot has a `TODO(db):`. The API calls already work; caching moves from Next's data cache to the cache tables (read the row, refresh past `refresh_after`, return it with `stale: true` on failure).
4. **MarketCheck:** add a client in `lib/sources/` and use it in `getMarketValue` / `getTypicalListing`.
5. **Set env vars** (server-side only, never `NEXT_PUBLIC_`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EIA_API_KEY`, `MARKETCHECK_API_KEY`.

You should **not** need to touch any page, component, `lib/cost`, or `lib/data/index.ts`. Search for `TODO(db)` to find every hand-off point.

Optional later: move the catalog to a cached fetch, since `getCatalog()` is called on `/` and `/compare`.

---

## Project layout

```
app/                 routes, API routes, CSS (globals.css + styles/*)
components/          shared UI (header, footer, gauge, sheet, count-up)
components/compare/  add-car form, roster, result card, states, data hook
components/detail/   year-by-year chart
components/landing/  hero quick start
lib/cost/            pure cost model (tested)
lib/data/            data layer: index (entry), types (contract), reference, mock/, live.ts
lib/sources/         API clients: FuelEconomy.gov, NHTSA, EIA (+ pure normalizers, tested)
lib/share.ts         comparison <-> URL (tested)
lib/view.ts          card/chart view models (tested)
lib/catalog.ts       dropdown helpers (tested)
supabase/migrations/ schema
tests/               Vitest
*.html, style.css    CSS 496 course pages (static, separate from the app)
```

---

A University of Washington capstone project by Kazim Syed. Costs are Washington-specific for now. Estimates, not quotes.

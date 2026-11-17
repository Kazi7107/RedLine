# Redline

**The true 5-year cost of a used car in Washington State.** Not just the sticker price: value you lose, fuel, insurance, maintenance, repairs, and taxes and registration, plus a reliability score built from NHTSA recalls and complaints.

UW CSS 496 capstone · Next.js (App Router, TypeScript) · Supabase (Postgres) · Vercel

> **Status: visual pass, ~90%.** Every screen, state and interaction is built. Everything runs on realistic **mock data** behind one data layer. The cost math is real; the inputs are sample values. Supabase and the live APIs are not connected yet.

---

## Run it

```bash
npm install
cp .env.example .env.local   # USE_MOCK_DATA=true is the default
npm run dev                  # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run check` | lint + typecheck + tests + production build |
| `npm test` | Vitest unit tests (pure logic only) |
| `npm run screenshots` | Screens at 390px and 1440px into `screenshots/` (needs `npm start` running and Chrome installed) |

### Demo knobs (mock mode only, in `.env.local`)

| Var | Effect |
| --- | --- |
| `MOCK_LATENCY=0` | Turns off the artificial delay. Leave it on to see the loading states. |
| `MOCK_MARKETCHECK_LIMIT_HIT=true` | Shows the stale-price state ("Price from Nov 12, live data paused"). |

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

### What's mocked

| Mocked | Where |
| --- | --- |
| Catalog of 28 cars (incl. the required Civic, Corolla, Focus, Camry, Accord, F-150, BMW 3, Priuses, CX-5, RAV4 / Hybrid, Tacoma, Frontier) | [lib/data/mock/seed.ts](lib/data/mock/seed.ts) |
| MPG, recalls, complaints, units sold, risk flags | same |
| Market value (from typical listing ± mileage) | [lib/data/mock/index.ts](lib/data/mock/index.ts) `getMarketValue` |
| WA gas price ($4.29) and source dates | same |
| ZIP → sales tax / RTA | [lib/data/mock/locales.ts](lib/data/mock/locales.ts) |
| VIN decode (sample VINs only) | `decodeVin` in the mock source |
| Network latency | `mockLatency` (off in tests or with `MOCK_LATENCY=0`) |

Everything else is real: the cost model, reliability score, best-value pick, monthly math, URL sharing and validation.

---

## Connecting real data (exact files)

1. **Apply the schema:** [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql). It has reference tables (public read) and cache tables (server only), with RLS on everything.
2. **Load the reference tables** from the contents of [lib/data/mock/seed.ts](lib/data/mock/seed.ts) (models, trims, risk flags) and [lib/data/mock/locales.ts](lib/data/mock/locales.ts) (WA DOR rates). The AAA factors are `CLASS_PARAMS` in [lib/cost/calculate.ts](lib/cost/calculate.ts).
3. **Implement [lib/data/live.ts](lib/data/live.ts).** Each method has a `TODO(db):` saying which table and API it reads. The pattern is: read the cache row, and if it's past `refresh_after`, call the API and upsert. On failure or rate limit, return the cached row with `stale: true` and the UI shows the stale state on its own.
4. **Set env vars** (server-side only, never `NEXT_PUBLIC_`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EIA_API_KEY`, `MARKETCHECK_API_KEY`. FuelEconomy.gov and NHTSA need no key.
5. **Flip `USE_MOCK_DATA=false`.**

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
lib/data/            data layer: index (entry), types (contract), mock/, live.ts
lib/share.ts         comparison <-> URL (tested)
lib/view.ts          card/chart view models (tested)
lib/catalog.ts       dropdown helpers (tested)
supabase/migrations/ schema
tests/               Vitest
```

---

A University of Washington capstone project by Kazim Syed. Costs are Washington-specific for now. Estimates, not quotes.

# Redline app (backend)

Next.js (App Router, TypeScript) backend for Redline: the true 5-year cost of owning a used car.
The portfolio site in the repo root is separate and unaffected.

## Run it

```bash
cd webapp
npm install
cp .env.example .env.local   # optional: add EIA_API_KEY
npm run dev                  # http://localhost:3000
```

```bash
npm test                 # cost-model unit tests (no network)
npm run check:sources    # live smoke test of every external API
npm run build
```

Behind a corporate/sandbox proxy, Node's `fetch` ignores `HTTPS_PROXY` unless you set `NODE_USE_ENV_PROXY=1` (Node 22.21+).

## Data sources

| Source | Used for | Key? | File |
|---|---|---|---|
| FuelEconomy.gov (DOE/EPA) | Year → make → model → trim picker, EPA MPG / kWh, vehicle class, national fuel prices | No | `src/lib/sources/fueleconomy.ts` |
| NHTSA recalls, complaints, 5-Star ratings | Safety & reliability panel | No | `src/lib/sources/nhtsa.ts` |
| NHTSA vPIC | VIN decoding | No | `src/lib/sources/nhtsa.ts` |
| EIA Open Data v2 | Washington weekly gas prices, monthly residential electricity | Yes (free) | `src/lib/sources/eia.ts` |
| WA DOR / WA DOL / Sound Transit | Sales tax, tab fees, RTA excise | Reference table | `src/lib/reference/wa-fees.ts` |
| AAA *Your Driving Costs* + market data | Insurance, maintenance, depreciation | Reference tables | `src/lib/reference/*.ts` |

Live responses are cached with Next's data cache (`revalidate`): menus for a week, vehicle specs for 30 days, prices for 12 hours.
Every upstream call has a 10s timeout, and HTML maintenance pages are detected and reported as errors.
If EIA has no key or fails, fuel prices fall back to FuelEconomy.gov national averages.
Each NHTSA safety sub-request fails on its own, so one outage doesn't blank the panel.

There is no database yet: all state is either live from the APIs (cached) or in versioned reference tables in `src/lib/reference/`.
Those tables are approximations with source notes; review them before relying on the numbers.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/health` | Reachability of every upstream source (`503` only if FuelEconomy.gov is down) |
| `GET /api/vehicles/years` | `[{ text, value }]` |
| `GET /api/vehicles/makes?year=` | `[{ text, value }]` |
| `GET /api/vehicles/models?year=&make=` | `[{ text, value }]` |
| `GET /api/vehicles/options?year=&make=&model=` | Trims, where `value` is the EPA vehicle id |
| `GET /api/vehicles/{epaId}` | `VehicleSpec` |
| `GET /api/vin/{vin}` | `VinDecode` |
| `GET /api/fuel-prices` | `FuelPrices` |
| `GET /api/safety?year=&make=&model=` | `SafetySummary` (use the base model, e.g. `Civic`) |
| `GET /api/reference` | WA locations for the tax/fee dropdown |
| `POST /api/estimate` | `OwnershipEstimate` |

Example:

```bash
curl -X POST localhost:3000/api/estimate -H 'content-type: application/json' -d '{
  "epaId": 39566,
  "inputs": { "purchasePrice": 18000, "currentMileage": 60000, "milesPerYear": 12000,
              "location": "seattle", "driverAge": "25to64", "coverage": "full", "years": 5,
              "downPayment": 3000, "loanApr": 0.08, "loanTermMonths": 60, "fuelInflation": 0 } }'
```

Errors are JSON: `400` with `issues` for bad input, `502` when an upstream API fails, and `404` when it has no data.
Types for every response live in `src/lib/types.ts`.

## Cost model (`src/lib/cost-model.ts`)

This is a pure function and is unit-tested. For each ownership year:

- **Fuel**: miles ÷ EPA combined MPG × price for that fuel type (regular/premium/diesel). EVs use kWh/100 mi × $/kWh. PHEVs split miles using the EPA utility factor. Optional annual price change.
- **Insurance**: WA base premium × vehicle segment × driver age × coverage. Full coverage declines as the car ages, and premiums inflate 4%/yr.
- **Maintenance & repairs**: AAA-based cents per mile by segment, scaled up with vehicle age and odometer.
- **Registration**: WA basic and weight fees, filing fees, local TBD fee, EV/hybrid fees, and Sound Transit RTA excise (1.1% of an estimated MSRP on the RTA schedule).
- **Depreciation**: a declining annual rate by vehicle age, adjusted for brand, powertrain and high mileage. Resale is floored at 15% of the price.
- **Financing**: amortized loan interest paid within the ownership window.
- **Upfront**: sales tax (location rate + 0.3% motor vehicle tax) and title fees.

## Known gaps

- NHTSA vPIC returned `503` (maintenance) on 2026-11-17. `/api/vin` reports that cleanly; menus still work.
- The EIA integration is written to the v2 API but hasn't been run with a real key yet.
- Only Washington taxes and fees are modeled.

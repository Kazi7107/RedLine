-- Redline schema. NOT APPLIED in the mock-data pass.
--
-- Two kinds of tables:
--   * Reference tables: slow-changing facts we load ourselves (catalog, risk
--     flags, WA tax and fee tables, AAA factors). Public read, no public write.
--   * Cache tables: copies of API responses with a pulled_at timestamp. Only the
--     server (service role, which bypasses RLS) reads or writes them.
--
-- lib/data/live.ts reads these. lib/data/mock/seed.ts mirrors the reference
-- tables so the mock and live shapes match.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------

create table public.vehicle_models (
  key            text primary key,                 -- 2016-toyota-corolla
  year           smallint not null check (year between 1990 and 2100),
  make           text not null,
  model          text not null,
  vehicle_class  text not null check (vehicle_class in
                   ('compact','midsize','hybrid','compact-suv','midsize-suv','pickup-midsize','pickup-full')),
  resale_factor  numeric(4,2) not null default 1.0, -- 1 = average; Toyota ~0.85, Ford ~1.2
  synthetic_oil  boolean not null default false,
  german_luxury  boolean not null default false,
  units_sold     integer not null check (units_sold >= 0),
  note           text not null default '',
  missing        text[] not null default '{}',     -- categories we can't price honestly
  unique (year, make, model)
);

create table public.vehicle_trims (
  key               text primary key,              -- 2016-toyota-corolla-le
  model_key         text not null references public.vehicle_models(key) on delete cascade,
  name              text not null,
  engine            text not null,
  fueleconomy_id    integer,                       -- FuelEconomy.gov vehicle id
  msrp              integer not null check (msrp > 0),
  most_common       boolean not null default false,
  unique (model_key, name)
);
-- At most one most-common trim per model.
create unique index vehicle_trims_one_common on public.vehicle_trims (model_key) where most_common;

create table public.risk_flags (
  id            text not null,                     -- powershift, hybrid-battery
  model_key     text not null references public.vehicle_models(key) on delete cascade,
  component     text not null,
  title         text not null,
  body          text not null,
  cost_low      integer not null,
  cost_high     integer not null check (cost_high >= cost_low),
  probability   numeric(3,2) not null check (probability between 0 and 1),
  peak_year     smallint not null check (peak_year between 1 and 5),
  check_tip     text not null,
  primary key (model_key, id)
);

-- WA DOR rates key by location code, so ZIP -> location code -> rate.
create table public.wa_tax_rates (
  location_code  text primary key,
  city           text not null,
  county         text not null,
  sales_tax_rate numeric(6,4) not null,            -- 0.1035
  rta            boolean not null default false,   -- inside the Sound Transit district
  effective_from date not null,
  pulled_at      timestamptz not null default now()
);
create table public.wa_zip_locations (
  zip            char(5) primary key,
  location_code  text not null references public.wa_tax_rates(location_code)
);

create table public.wa_registration_fees (
  vehicle_class  text primary key,
  base_fee       numeric(8,2) not null,
  extra_fee      numeric(8,2) not null default 0,
  title_fee      numeric(8,2) not null,
  rta_rate       numeric(6,4) not null,
  effective_from date not null,
  pulled_at      timestamptz not null default now()
);

-- Loaded by hand once a year from AAA Your Driving Costs.
create table public.aaa_cost_factors (
  vehicle_class     text primary key,
  depreciation_rate numeric(5,3) not null,
  insurance_low     integer not null,
  insurance_high    integer not null,
  repair_base       integer not null,
  tire_set          integer not null,
  brake_job         integer not null,
  edition           text not null,                 -- "2026"
  pulled_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cache tables (server only)
-- ---------------------------------------------------------------------------

create table public.nhtsa_cache (
  model_key       text primary key references public.vehicle_models(key) on delete cascade,
  recalls         jsonb not null default '[]',     -- [{id,title,component,summary,reportedAt}]
  complaints      jsonb not null default '{}',     -- {transmission: 612, ...}
  complaint_summary text not null default '',
  pulled_at       timestamptz not null default now(),
  refresh_after   interval not null default '7 days'
);

create table public.fueleconomy_cache (
  trim_key        text primary key references public.vehicle_trims(key) on delete cascade,
  mpg_combined    numeric(4,1) not null,
  pulled_at       timestamptz not null default now(),
  refresh_after   interval not null default '30 days'
);

create table public.gas_price_cache (
  region          text primary key default 'WA',   -- EIA series EMM_EPMR_PTE_SWA_DPG
  price_per_gal   numeric(5,3) not null,
  week_of         date not null,
  pulled_at       timestamptz not null default now(),
  refresh_after   interval not null default '7 days'
);

-- Market value by trim and 10k-mile bucket. When MarketCheck's limit is hit we
-- keep serving the last row and the app shows "Price from <date>, live data paused".
create table public.marketcheck_cache (
  trim_key        text not null references public.vehicle_trims(key) on delete cascade,
  mileage_bucket  integer not null,                -- floor(mileage / 10000)
  market_value    integer not null,
  median_price    integer,
  median_mileage  integer,
  pulled_at       timestamptz not null default now(),
  refresh_after   interval not null default '1 day',
  primary key (trim_key, mileage_bucket)
);

create table public.vin_decode_cache (
  vin             char(17) primary key,
  model_key       text references public.vehicle_models(key),
  trim_key        text references public.vehicle_trims(key),
  raw             jsonb not null,                  -- NHTSA vPIC response
  pulled_at       timestamptz not null default now()
);

-- Tracks API quota so we can stop before the limit, not after.
create table public.api_usage (
  source          text not null,                   -- marketcheck, eia
  day             date not null default current_date,
  calls           integer not null default 0,
  primary key (source, day)
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.vehicle_models       enable row level security;
alter table public.vehicle_trims        enable row level security;
alter table public.risk_flags           enable row level security;
alter table public.wa_tax_rates         enable row level security;
alter table public.wa_zip_locations     enable row level security;
alter table public.wa_registration_fees enable row level security;
alter table public.aaa_cost_factors     enable row level security;
alter table public.nhtsa_cache          enable row level security;
alter table public.fueleconomy_cache    enable row level security;
alter table public.gas_price_cache      enable row level security;
alter table public.marketcheck_cache    enable row level security;
alter table public.vin_decode_cache     enable row level security;
alter table public.api_usage            enable row level security;

-- Reference data is public information: anyone may read it, nobody may write it
-- through the API. (Loads run with the service role, which bypasses RLS.)
create policy "public read" on public.vehicle_models       for select using (true);
create policy "public read" on public.vehicle_trims        for select using (true);
create policy "public read" on public.risk_flags           for select using (true);
create policy "public read" on public.wa_tax_rates         for select using (true);
create policy "public read" on public.wa_zip_locations     for select using (true);
create policy "public read" on public.wa_registration_fees for select using (true);
create policy "public read" on public.aaa_cost_factors     for select using (true);

-- Cache and usage tables get no policies: with RLS on, anon and authenticated
-- roles can't touch them. Only the server (service role key) can.

create index nhtsa_cache_pulled_at on public.nhtsa_cache (pulled_at);
create index marketcheck_cache_pulled_at on public.marketcheck_cache (pulled_at);

"use client";

import Link from "next/link";
import type { EstimateFull, EstimateUnavailable } from "@/lib/data/types";
import { barScale } from "@/lib/view";
import { CarCard } from "./CarCard";
import { EmptyState, ErrorCard, LoadingStatus, StaleNotice, UnavailableCard } from "./States";

const noop = () => {};

/** Every state from the design, rendered with the real components and fixture data. */
export function StatesGallery({ civic, corolla, saturn }: { civic: EstimateFull; corolla: EstimateFull; saturn: EstimateUnavailable }) {
  const scale = barScale([civic, corolla], 5);
  const staleStamp = { ...corolla.priceStamp, stale: true, pulledAt: "2026-11-12" };
  const staleCorolla = { ...corolla, priceStamp: staleStamp };
  const card = (e: EstimateFull, phase: "loading" | "summary" | "full", extra: Partial<React.ComponentProps<typeof CarCard>> = {}) => (
    <CarCard
      name={e.vehicle.name}
      meta={`${e.inputs.mileage.toLocaleString("en-US")} mi · ${e.vehicle.engine}`}
      summary={phase === "loading" ? undefined : e}
      full={phase === "full" ? e : undefined}
      horizon={5}
      scale={scale}
      detailHref="#"
      price={e.inputs.price}
      index={0}
      {...extra}
    />
  );

  return (
    <div className="gallery">
      <section aria-labelledby="st-empty" className="gallery__sec">
        <h2 id="st-empty" className="gallery__label">
          Empty · no cars added yet
        </h2>
        <EmptyState onStart={noop} sampleHref="/compare" />
      </section>

      <section aria-labelledby="st-load" className="gallery__sec">
        <h2 id="st-load" className="gallery__label">
          Loading · the total shows up first, the breakdown fills in after
        </h2>
        <LoadingStatus progress={0.5} />
        <div className="cards cards--2 gallery__cards">
          <div className="cards__slot">{card(civic, "summary")}</div>
          <div className="cards__slot">{card(corolla, "loading")}</div>
        </div>
      </section>

      <section aria-labelledby="st-err" className="gallery__sec">
        <h2 id="st-err" className="gallery__label">
          Error · a car we don&apos;t have data on
        </h2>
        <div className="cards cards--3 gallery__cards">
          <div className="cards__slot">
            <UnavailableCard data={saturn} onEdit={noop} onRemove={noop} />
          </div>
          <div className="cards__slot">
            <ErrorCard name="1998 Geo Metro" message="We don't have that car in our data yet." onEdit={noop} onRemove={noop} onRetry={noop} />
          </div>
        </div>
        <p className="small muted">Best value is picked only from cars we could fully price.</p>
      </section>

      <section aria-labelledby="st-stale" className="gallery__sec">
        <h2 id="st-stale" className="gallery__label">
          Stale price · MarketCheck limit hit
        </h2>
        <StaleNotice stamp={staleStamp} />
        <div className="cards cards--1 gallery__cards">
          <div className="cards__slot">{card(staleCorolla, "full")}</div>
        </div>
      </section>

      <section aria-labelledby="st-404" className="gallery__sec">
        <h2 id="st-404" className="gallery__label">
          404
        </h2>
        <p>
          <Link className="link" href="/this-page-does-not-exist">
            Open the 404 page
          </Link>
        </p>
      </section>
    </div>
  );
}

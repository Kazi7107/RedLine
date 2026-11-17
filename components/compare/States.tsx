"use client";

import Link from "next/link";
import type { EstimateUnavailable, SourceStamp } from "@/lib/data/types";
import { shortDate } from "@/lib/format";
import { Icon } from "../Icon";

/* ------------------------------------------------------------------ Empty */
export function EmptyState({ onStart, sampleHref }: { onStart: () => void; sampleHref: string }) {
  return (
    <section className="empty card" aria-labelledby="empty-h">
      <div className="empty__head">
        <h1 id="empty-h" className="display">
          Nothing to compare yet
        </h1>
        <p className="lead">Add the cars you&apos;re looking at. 2 or 3 works best. We&apos;ll show you which one actually costs less to own.</p>
      </div>
      <div className="empty__slots">
        <button type="button" className="empty__slot empty__slot--go" onClick={onStart}>
          <span className="empty__plus" aria-hidden="true">
            <Icon name="plus" size={20} />
          </span>
          <span className="empty__go-label">Add your first car</span>
        </button>
        <div className="empty__slot" aria-hidden="true">
          Car 2
        </div>
        <div className="empty__slot empty__slot--faint" aria-hidden="true">
          Car 3 (optional)
        </div>
      </div>
      <p className="small muted">
        Have a listing open? The year, make, model, mileage and price are all you need. Or{" "}
        <Link href={sampleHref} className="link">
          see a sample comparison
        </Link>
        .
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- Loading */
const STEPS = ["Gas mileage", "WA gas prices", "Recalls and complaints", "WA taxes and fees"];

/** "Running the numbers" status. `progress` 0..1 drives which steps are ticked. */
export function LoadingStatus({ progress }: { progress: number }) {
  const done = Math.min(STEPS.length, Math.floor(progress * STEPS.length + 0.001));
  return (
    <div className="loading-status" role="status" aria-live="polite">
      <div className="loading-status__lead">
        <svg width="64" height="38" viewBox="0 0 120 70" aria-hidden="true">
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#E6E8EB" strokeWidth="8" />
          <path d="M75.45 12.44 A50 50 0 0 1 110 60" fill="none" stroke="var(--red-soft)" strokeWidth="8" />
          <line className="loading-status__needle" x1="60" y1="60" x2="60" y2="18" stroke="var(--red)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="60" r="5" fill="var(--ink)" />
        </svg>
        <span className="loading-status__title">Running the numbers</span>
      </div>
      <ul className="loading-status__steps">
        {STEPS.map((s, i) => (
          <li key={s} data-state={i < done ? "done" : i === done ? "active" : "todo"}>
            {i < done ? <Icon name="check" size={14} /> : <span className="loading-status__dot" aria-hidden="true" />}
            {s}
            <span className="sr-only">{i < done ? " (done)" : i === done ? " (in progress)" : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------- Insufficient data */
export function UnavailableCard({ data, onEdit, onRemove }: { data: EstimateUnavailable; onEdit: () => void; onRemove: () => void }) {
  return (
    <article className="car-card car-card--unavailable" role="alert" aria-label={`${data.vehicle.name}: not enough data`}>
      <div className="unavail">
        <div className="unavail__head">
          <span className="unavail__icon" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <h2 className="car-card__name">{data.vehicle.name}</h2>
        </div>
        <div className="unavail__msg">
          <h3 className="display">We can&apos;t price this one honestly</h3>
          <p>{data.message}</p>
        </div>
        <ul className="unavail__coverage">
          {data.coverage.map((c) => (
            <li key={c.label}>
              <span>{c.label}</span>
              <span className={c.found ? "is-found" : "is-missing"}>
                {c.found ? <Icon name="check" size={13} /> : <Icon name="close" size={13} />}
                {c.found ? "Found" : "Not enough data"}
              </span>
            </li>
          ))}
        </ul>
        <div className="unavail__actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onEdit}>
            Check year and trim
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onEdit}>
            Try the VIN
          </button>
          <button type="button" className="link-btn unavail__remove" onClick={onRemove}>
            Remove car
          </button>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- Not found */
export function ErrorCard({ name, message, onEdit, onRemove, onRetry }: { name: string; message: string; onEdit: () => void; onRemove: () => void; onRetry?: () => void }) {
  return (
    <article className="car-card car-card--unavailable" role="alert" aria-label={`${name}: error`}>
      <div className="unavail">
        <div className="unavail__head">
          <span className="unavail__icon" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <h2 className="car-card__name">{name}</h2>
        </div>
        <div className="unavail__msg">
          <h3 className="display">We don&apos;t have data on this car yet</h3>
          <p>{message} Try a different year or trim, or pick another car to compare.</p>
        </div>
        <div className="unavail__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={onEdit}>
            Try another car
          </button>
          {onRetry && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
              Try again
            </button>
          )}
          <button type="button" className="link-btn unavail__remove" onClick={onRemove}>
            Remove car
          </button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ Stale price */
export function StaleNotice({ stamp }: { stamp: SourceStamp }) {
  return (
    <div className="stale" role="note">
      <span className="stale__icon" aria-hidden="true">
        <Icon name="clock" size={16} />
      </span>
      <p>
        <strong>Price from {shortDate(stamp.pulledAt)}, live data paused.</strong>{" "}
        <span>
          We hit today&apos;s limit with {stamp.name}, so market values are from our last update. Everything else is current. Totals may be off by a few hundred dollars.
        </span>
      </p>
    </div>
  );
}

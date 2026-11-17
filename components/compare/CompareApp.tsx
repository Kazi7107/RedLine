"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { carName, resolveKey } from "@/lib/catalog";
import { pickBestValue } from "@/lib/cost/bestValue";
import type { Horizon } from "@/lib/cost/types";
import type { CatalogModel } from "@/lib/data/types";
import { integer, moneyShort } from "@/lib/format";
import { comparisonPath, decodeComparison, detailPath, encodeComparison, MAX_CARS, type CarEntry, type Comparison } from "@/lib/share";
import { annualMilesError, zipError } from "@/lib/validation";
import { barScale, totalsFor } from "@/lib/view";
import { Icon } from "../Icon";
import { Sheet } from "../Sheet";
import { CarCard } from "./CarCard";
import type { FormResult } from "./CarForm";
import { EmptyState, ErrorCard, LoadingStatus, StaleNotice, UnavailableCard } from "./States";
import { useEstimates, type CarState } from "./useEstimates";

// The add-car form (VIN decode, validation) and roster only load when you're adding a car,
// so the results page doesn't ship them.
const CarForm = dynamic(() => import("./CarForm").then((m) => m.CarForm), {
  loading: () => <div className="car-form card" style={{ minHeight: 640 }} aria-busy="true" />,
});
const Roster = dynamic(() => import("./Roster").then((m) => m.Roster));

type Mode = "empty" | "build" | "results";

interface Props {
  catalog: CatalogModel[];
  initial: Comparison;
  initialMode: Mode;
  initialEdit?: number;
  prefillModel?: string;
  sampleVin?: string;
  defaultZip: string;
  sampleHref: string;
}

/** Swap views inside a View Transition when the browser supports it (and motion is OK). */
function transition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) return update();
  doc.startViewTransition(() => flushSync(update));
}

export function CompareApp({ catalog, initial, initialMode, initialEdit, prefillModel, sampleVin, defaultZip, sampleHref }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [cars, setCars] = useState<CarEntry[]>(initial.cars);
  const [zip, setZip] = useState(initial.zip || defaultZip);
  const [annualMiles, setAnnualMiles] = useState(initial.annualMiles);
  const [editing, setEditing] = useState<number>(initialMode === "build" ? (initialEdit ?? initial.cars.length) : 0);
  const [prefill, setPrefill] = useState(prefillModel);
  const [removing, setRemoving] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [horizon, setHorizon] = useState<Horizon>(5);
  const [toast, setToast] = useState<string | null>(null);
  const [assumeOpen, setAssumeOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const states = useEstimates(cars, zip, annualMiles, mode === "results", retry);

  // ------------------------------------------------------------ URL sync
  const urlFor = useCallback(
    (m: Mode, list: CarEntry[] = cars) => {
      if (m === "results" && list.length) return comparisonPath({ cars: list, zip, annualMiles });
      if (m === "build") return list.length ? `/compare?${encodeComparison({ cars: list, zip, annualMiles })}&edit=1` : "/compare?start=1";
      return "/compare";
    },
    [cars, zip, annualMiles],
  );

  useEffect(() => {
    const url = urlFor(mode);
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, "", url);
  }, [mode, urlFor]);

  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const c = decodeComparison(params);
      setCars(c.cars);
      if (c.zip) setZip(c.zip);
      setAnnualMiles(c.annualMiles);
      const m: Mode = c.cars.length && !params.has("edit") ? "results" : params.has("start") || params.has("edit") ? "build" : "empty";
      setMode(m);
      setEditing(c.cars.length);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (m: Mode, list: CarEntry[] = cars, editIndex = list.length) => {
    window.history.pushState(null, "", urlFor(m, list));
    transition(() => {
      setMode(m);
      setEditing(editIndex);
      setFormKey((k) => k + 1);
    });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      mainRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    });
  };

  // ------------------------------------------------------------ Build actions
  const onSubmit = (r: FormResult, then: "add" | "compare") => {
    const next = [...cars];
    if (editing < cars.length) next[editing] = r.car;
    else next.push(r.car);
    setCars(next);
    setZip(r.zip);
    setAnnualMiles(r.annualMiles);
    setPrefill(undefined);
    if (then === "add" && next.length < MAX_CARS) {
      transition(() => {
        setEditing(next.length);
        setFormKey((k) => k + 1);
      });
      setToast(`Saved. Now add car ${next.length + 1}.`);
    } else {
      go("results", next);
    }
  };

  const remove = (i: number) => {
    setRemoving(i);
    window.setTimeout(() => {
      const next = cars.filter((_, j) => j !== i);
      setRemoving(null);
      setCars(next);
      setEditing((e) => (e > i ? e - 1 : e === i ? next.length : e));
      setFormKey((k) => k + 1);
      if (next.length === 0 && mode === "results") transition(() => setMode("empty"));
    }, 220);
  };

  // ------------------------------------------------------------ Results derived
  const resolved = useMemo(() => cars.map((c) => resolveKey(catalog, c.key)), [cars, catalog]);
  const stateAt = (i: number): CarState => states[i] ?? { phase: "loading" };

  const fulls = cars.map((_, i) => {
    const s = stateAt(i);
    return s.phase === "full" ? s.full : null;
  });
  const summaries = cars.map((_, i) => {
    const s = stateAt(i);
    return s.phase === "full" || s.phase === "summary" ? s.summary : null;
  });
  const allDone = cars.every((_, i) => ["full", "unavailable", "error"].includes(stateAt(i).phase));
  const progress = cars.length
    ? cars.reduce((a, _, i) => {
        const p = stateAt(i).phase;
        return a + (p === "loading" ? 0.25 : p === "summary" ? 0.5 : 1);
      }, 0) / cars.length
    : 0;

  const scale = barScale(fulls.filter((f): f is NonNullable<typeof f> => f !== null), horizon);

  const best = useMemo(() => {
    if (!allDone) return null;
    return pickBestValue(
      cars.map((c, i) => {
        const s = summaries[i];
        const f = fulls[i];
        return {
          id: String(i),
          shortName: resolved[i]?.model.model ?? c.key,
          total: s ? totalsFor(s.years, 5).total.mid : null,
          reliability: s?.reliability.score ?? 0,
          hasRiskFlags: (f?.riskFlags.length ?? 0) > 0,
        };
      }),
    );
    // Recompute when the loaded data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, states, cars, resolved]);

  const stale = summaries.find((s) => s?.priceStamp.stale)?.priceStamp ?? null;
  const location = summaries.find(Boolean)?.inputs;

  // ------------------------------------------------------------ Share
  const share = async () => {
    const url = `${window.location.origin}${comparisonPath({ cars, zip, annualMiles })}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied. Anyone with it sees this exact comparison.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // ------------------------------------------------------------ Mobile carousel
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || mode !== "results") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root: track, threshold: 0.6 },
    );
    track.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [mode, cars.length]);
  const scrollToCar = (i: number) => {
    const el = trackRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    if (!el || !trackRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trackRef.current.scrollTo({ left: el.offsetLeft - trackRef.current.offsetLeft, behavior: reduce ? "auto" : "smooth" });
    setActive(i);
  };

  // ================================================================ Render
  if (mode === "empty") {
    return (
      <div ref={mainRef} className="wrap wrap--wide compare-main">
        <EmptyState onStart={() => go("build", cars, cars.length)} sampleHref={sampleHref} />
      </div>
    );
  }

  if (mode === "build") {
    const isNew = editing >= cars.length;
    const position = editing + 1;
    const savedOthers = isNew ? cars.length : cars.length - 1;
    return (
      <div ref={mainRef} className="wrap compare-main build">
        <section className="build__form" aria-labelledby="build-h">
          <div className="build__head">
            <p className="eyebrow">
              Car {position} of {MAX_CARS}
            </p>
            <h1 id="build-h" className="display build__title" tabIndex={-1}>
              {!isNew ? "Edit this car" : position === 1 ? "Add a car" : position === 2 ? "Add another car" : "Add a third car"}
            </h1>
            <p className="lead">
              {position === 1
                ? "Copy these straight from the listing. Trim matters a little: it changes gas mileage and insurance."
                : "Same as before. Add one more to see them side by side, or compare what you have."}
            </p>
          </div>
          <div className="build__swap" key={formKey}>
            <CarForm
              catalog={catalog}
              initial={isNew ? undefined : cars[editing]}
              prefillModel={isNew ? prefill : undefined}
              zip={zip}
              annualMiles={annualMiles}
              locationOpen={cars.length === 0 || !zip}
              position={position}
              savedCount={savedOthers}
              canAddAnother={isNew && position < MAX_CARS}
              sampleVin={sampleVin}
              onSubmit={onSubmit}
              onCancel={cars.length > 0 ? () => go("results", cars) : undefined}
            />
          </div>
        </section>
        <Roster
          catalog={catalog}
          cars={cars}
          editing={editing}
          removing={removing}
          zip={zip}
          annualMiles={annualMiles}
          onEdit={(i) =>
            transition(() => {
              setEditing(i);
              setFormKey((k) => k + 1);
            })
          }
          onRemove={remove}
        />
        {toast && (
          <div className="toast" role="status">
            <Icon name="check" />
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------ Results
  return (
    <div ref={mainRef} className="wrap wrap--wide compare-main results">
      <div className="results__top">
        <div className="results__title">
          <h1 className="display" tabIndex={-1}>
            {horizon === 5 ? "5-year cost to own" : "First-year cost to own"}
          </h1>
          <p>Everything you&apos;ll spend besides the loan payment, plus the value the car loses.</p>
        </div>
        <div className="results__tools">
          <fieldset className="seg" aria-label="Time frame">
            <legend className="sr-only">Time frame</legend>
            <span className="seg__thumb" data-pos={horizon === 1 ? 0 : 1} aria-hidden="true" />
            {([1, 5] as Horizon[]).map((h) => (
              <label key={h} className={horizon === h ? "is-on" : undefined}>
                <input type="radio" name="horizon" value={h} checked={horizon === h} onChange={() => setHorizon(h)} />
                {h === 1 ? "1 year" : "5 years"}
              </label>
            ))}
          </fieldset>
          <button type="button" className="btn btn--secondary btn--sm" onClick={share}>
            <Icon name="share" />
            Share
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => go("build", cars, cars.length < MAX_CARS ? cars.length : 0)}>
            <Icon name={cars.length < MAX_CARS ? "plus" : "edit"} />
            {cars.length < MAX_CARS ? "Add a car" : "Edit cars"}
          </button>
        </div>
      </div>

      <div className="results__assume">
        <span className="pill">{integer(annualMiles)} mi/yr</span>
        <span className="pill">{location ? `Gas $${location.gasPrice.toFixed(2)}/gal` : "Gas price…"}</span>
        <span className="pill">{location ? `${location.county} Co., WA` : `ZIP ${zip}`}</span>
        <button type="button" className="link-btn" onClick={() => setAssumeOpen(true)}>
          Change
        </button>
      </div>

      {stale && <StaleNotice stamp={stale} />}

      {/* One slot for "running the numbers" then the best-value pick, so the cards below don't jump. */}
      {(cars.length > 1 || !allDone) && (
        <div className="results__status">
          {!allDone ? (
            <LoadingStatus progress={progress} />
          ) : best && resolved[Number(best.id)] ? (
            <section className="best" aria-label="Best value pick">
              <span className="best__tag">
                <Icon name="star" size={15} />
                Best value
              </span>
              <p>
                <strong>{carName(resolved[Number(best.id)]!)}.</strong> <span>{best.reason}</span>
              </p>
            </section>
          ) : null}
        </div>
      )}

      {cars.length > 1 && (
        <div className="car-tabs" role="tablist" aria-label="Cars">
          {cars.map((c, i) => {
            const s = summaries[i];
            const isBest = best?.id === String(i);
            return (
              <button
                key={`${c.key}-${i}`}
                type="button"
                role="tab"
                aria-selected={active === i}
                aria-controls={`car-panel-${i}`}
                className={`car-tabs__tab${isBest ? " is-best" : ""}`}
                onClick={() => scrollToCar(i)}
              >
                <span className="car-tabs__name">
                  {resolved[i]?.model.model ?? "Car"}
                  {isBest && " · Best"}
                </span>
                <span className="num car-tabs__total">{s ? moneyShort(totalsFor(s.years, horizon).total.mid) : "…"}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={`cards cards--${cars.length}`} ref={trackRef}>
        {cars.map((c, i) => {
          const r = resolved[i];
          const st = stateAt(i);
          const name = r ? carName(r) : c.key;
          const editThis = () => go("build", cars, i);
          let inner: React.ReactNode;
          if (st.phase === "unavailable") inner = <UnavailableCard data={st.data} onEdit={editThis} onRemove={() => remove(i)} />;
          else if (st.phase === "error")
            inner = (
              <ErrorCard
                name={name}
                message={st.error.message}
                onEdit={editThis}
                onRemove={() => remove(i)}
                onRetry={st.error.code === "not_connected" ? () => setRetry((n) => n + 1) : undefined}
              />
            );
          else
            inner = (
              <CarCard
                name={name}
                meta={`${integer(c.mileage)} mi · ${r?.trim.engine ?? ""}`}
                trimNote={r?.assumed ? `Trim not picked, so we used the ${r.trim.name}, the most common one.` : undefined}
                summary={st.phase === "loading" ? undefined : st.summary}
                full={st.phase === "full" ? st.full : undefined}
                horizon={horizon}
                scale={scale}
                best={best?.id === String(i) ? best : null}
                detailHref={detailPath(c, zip, annualMiles)}
                price={c.price}
                index={i}
              />
            );
          return (
            <div key={`${c.key}-${i}`} className={`cards__slot${removing === i ? " is-leaving" : ""}`} data-index={i} id={`car-panel-${i}`} role={cars.length > 1 ? "tabpanel" : undefined}>
              {inner}
            </div>
          );
        })}
      </div>

      {cars.length > 1 && (
        <div className="car-dots" aria-hidden="true">
          {cars.map((_, i) => (
            <span key={i} className={active === i ? "is-on" : undefined} />
          ))}
        </div>
      )}

      {allDone && cars.length > 1 && cars.some((_, i) => ["unavailable", "error"].includes(stateAt(i).phase)) && (
        <p className="small muted">Best value is picked only from cars we could fully price{best ? "" : ", so there's no pick this time"}.</p>
      )}

      {cars.length === 1 && (
        <div className="add-more card">
          <div>
            <h2>Compare it with another car</h2>
            <p className="muted">Best value only shows up when there are 2 or 3 cars to compare.</p>
          </div>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => go("build", cars, cars.length)}>
            <Icon name="plus" />
            Add a car
          </button>
        </div>
      )}

      <section className="sources-note" aria-labelledby="src-note-h">
        <h2 id="src-note-h">Where the numbers come from</h2>
        <ol>
          <li>
            <span className="mono">FuelEconomy.gov</span> combined MPG for the exact trim
          </li>
          <li>
            <span className="mono">EIA</span> weekly retail gas price, Washington average
          </li>
          <li>
            <span className="mono">AAA</span> Your Driving Costs, scaled for age, mileage and type of car
          </li>
          <li>
            <span className="mono">NHTSA</span> recalls and owner complaints
          </li>
          <li>
            <span className="mono">WA DOR / DOL</span> sales tax for your ZIP and registration fees
          </li>
          <li>
            <span className="mono">MarketCheck</span> current market value for this trim and mileage
          </li>
        </ol>
        <p>Ranges mean we&apos;re estimating. Your actual insurance quote and repair bills will depend on you and the car.</p>
      </section>

      <AssumptionsSheet
        open={assumeOpen}
        zip={zip}
        annualMiles={annualMiles}
        onClose={() => setAssumeOpen(false)}
        onSave={(z, m) => {
          setZip(z);
          setAnnualMiles(m);
          setAssumeOpen(false);
          setToast("Updated. Running the numbers again.");
        }}
      />

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}

function AssumptionsSheet({ open, zip, annualMiles, onClose, onSave }: { open: boolean; zip: string; annualMiles: number; onClose: () => void; onSave: (zip: string, miles: number) => void }) {
  const [z, setZ] = useState(zip);
  const [m, setM] = useState(integer(annualMiles));
  const [err, setErr] = useState<{ zip?: string; miles?: string }>({});
  useEffect(() => {
    if (open) {
      setZ(zip);
      setM(integer(annualMiles));
      setErr({});
    }
  }, [open, zip, annualMiles]);
  return (
    <Sheet open={open} onClose={onClose} title="Change what we assume">
      <form
        className="assume-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const milesN = Number(m.replace(/\D/g, "")) || null;
          const next = { zip: zipError(z) ?? undefined, miles: annualMilesError(milesN) ?? undefined };
          setErr(next);
          if (!next.zip && !next.miles) onSave(z, milesN!);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="assume-zip">
            ZIP code
          </label>
          <span className="control" data-invalid={Boolean(err.zip)}>
            <input id="assume-zip" className="is-mono" inputMode="numeric" maxLength={5} value={z} onChange={(e) => setZ(e.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(err.zip)} aria-describedby={err.zip ? "assume-zip-err" : undefined} />
          </span>
          {err.zip && (
            <span className="field__error" id="assume-zip-err">
              <Icon name="alert" size={14} />
              {err.zip}
            </span>
          )}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="assume-miles">
            Miles you drive a year
          </label>
          <span className="control" data-invalid={Boolean(err.miles)}>
            <input id="assume-miles" className="is-mono" inputMode="numeric" value={m} onChange={(e) => setM(e.target.value.replace(/[^\d,]/g, ""))} aria-invalid={Boolean(err.miles)} aria-describedby={err.miles ? "assume-miles-err" : undefined} />
            <span className="control__affix">mi/yr</span>
          </span>
          {err.miles && (
            <span className="field__error" id="assume-miles-err">
              <Icon name="alert" size={14} />
              {err.miles}
            </span>
          )}
        </div>
        <p className="small muted">We also assume a clean driving record for the insurance range.</p>
        <button type="submit" className="btn btn--primary btn--md btn--block">
          Update the numbers
        </button>
      </form>
    </Sheet>
  );
}

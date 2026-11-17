"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { NOT_SURE, makesOf, modelsOf, mostCommonTrim, resolveKey, yearsOf } from "@/lib/catalog";
import type { CatalogModel, VinDecodeResult } from "@/lib/data/types";
import { integer, parseDigits } from "@/lib/format";
import { DEFAULT_ANNUAL_MILES, type CarEntry } from "@/lib/share";
import { annualMilesError, mileageError, priceError, vinError, zipError } from "@/lib/validation";
import { Icon } from "../Icon";

type FieldName = "model" | "trim" | "mileage" | "price" | "zip" | "miles";
type Errors = Partial<Record<FieldName, string>>;

export interface FormResult {
  car: CarEntry;
  zip: string;
  annualMiles: number;
}

interface Props {
  catalog: CatalogModel[];
  /** Car being edited, if any. */
  initial?: CarEntry;
  /** Model key to preselect (from the landing page quick start). */
  prefillModel?: string;
  zip: string;
  annualMiles: number;
  /** Show ZIP + annual miles open (first car) or as a one-line summary. */
  locationOpen: boolean;
  /** 1-based position of this car. */
  position: number;
  savedCount: number;
  canAddAnother: boolean;
  sampleVin?: string;
  onSubmit: (result: FormResult, then: "add" | "compare") => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CarForm(props: Props) {
  const { catalog, initial, prefillModel, position, savedCount, canAddAnother, sampleVin, onSubmit, onCancel } = props;
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;

  const start = useMemo(() => {
    const r = initial ? resolveKey(catalog, initial.key) : prefillModel ? resolveKey(catalog, prefillModel) : null;
    return {
      year: r?.model.year ?? null,
      make: r?.model.make ?? "",
      modelKey: r?.model.key ?? "",
      trim: initial && r ? (r.assumed ? NOT_SURE : r.trim.key) : "",
    };
  }, [catalog, initial, prefillModel]);

  const [year, setYear] = useState<number | null>(start.year);
  const [make, setMake] = useState(start.make);
  const [modelKey, setModelKey] = useState(start.modelKey);
  const [trim, setTrim] = useState(start.trim);
  const [mileage, setMileage] = useState(initial ? integer(initial.mileage) : "");
  const [price, setPrice] = useState(initial ? integer(initial.price) : "");
  const [zip, setZip] = useState(props.zip);
  const [miles, setMiles] = useState(integer(props.annualMiles || DEFAULT_ANNUAL_MILES));
  const [locationOpen, setLocationOpen] = useState(props.locationOpen);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [vin, setVin] = useState("");
  const [vinState, setVinState] = useState<{ status: "idle" | "decoding" | "done" | "error"; message?: string }>({ status: "idle" });
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const years = useMemo(() => yearsOf(catalog), [catalog]);
  const makes = useMemo(() => makesOf(catalog, year), [catalog, year]);
  const models = useMemo(() => (make ? modelsOf(catalog, year, make) : []), [catalog, year, make]);
  const model = catalog.find((m) => m.key === modelKey) ?? null;
  const common = model ? mostCommonTrim(model) : null;

  useEffect(() => {
    // Focus the first empty dropdown when the form opens (keyboard users land in the right place).
    firstFieldRef.current?.focus({ preventScroll: true });
  }, []);

  const dirty = Boolean(modelKey || mileage || price);
  const { onDirtyChange } = props;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // ---------------------------------------------------------------- validation
  const validate = (only?: FieldName): Errors => {
    const e: Errors = {};
    if (!modelKey) e.model = "Pick a year, make and model.";
    else if (!trim) e.trim = "Pick a trim, or choose “Not sure”.";
    const m = mileageError(parseDigits(mileage));
    if (m) e.mileage = m;
    const p = priceError(parseDigits(price));
    if (p) e.price = p;
    const z = zipError(zip.trim());
    if (z) e.zip = z;
    const a = annualMilesError(parseDigits(miles));
    if (a) e.miles = a;
    if (only) return e[only] ? { [only]: e[only] } : {};
    return e;
  };

  const blur = (f: FieldName) => {
    setTouched((t) => ({ ...t, [f]: true }));
    const e = validate(f);
    setErrors((prev) => {
      const next = { ...prev };
      if (e[f]) next[f] = e[f];
      else delete next[f];
      return next;
    });
  };

  // Clear an error as soon as the field becomes valid, without waiting for blur.
  // (New errors only appear on blur or submit, so typing never nags.)
  useEffect(() => {
    setErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const now = validate();
      const next: Errors = {};
      for (const k of Object.keys(prev) as FieldName[]) if (prev[k] && now[k]) next[k] = now[k];
      return next;
    });
    // validate() reads exactly these values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey, trim, mileage, price, zip, miles]);

  const submit = (then: "add" | "compare") => {
    const e = validate();
    setErrors(e);
    setTouched({ model: true, trim: true, mileage: true, price: true, zip: true, miles: true });
    const firstBad = (Object.keys(e) as FieldName[])[0];
    if (firstBad) {
      if ((firstBad === "zip" || firstBad === "miles") && !locationOpen) setLocationOpen(true);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[data-field="${firstBad}"]`)?.focus());
      return;
    }
    onSubmit(
      {
        car: { key: trim === NOT_SURE ? modelKey : trim, mileage: parseDigits(mileage)!, price: parseDigits(price)! },
        zip: zip.trim(),
        annualMiles: parseDigits(miles)!,
      },
      then,
    );
  };

  // ---------------------------------------------------------------- dropdown cascade
  const pickYear = (y: number | null) => {
    setYear(y);
    const nextMakes = makesOf(catalog, y);
    if (!nextMakes.includes(make)) {
      setMake("");
      setModelKey("");
      setTrim("");
    } else {
      const stillThere = modelsOf(catalog, y, make).find((m) => m.model === model?.model);
      setModelKey(stillThere?.key ?? "");
      setTrim("");
    }
  };
  const pickMake = (m: string) => {
    setMake(m);
    const list = modelsOf(catalog, year, m);
    setModelKey(list.length === 1 ? list[0].key : "");
    setTrim("");
  };
  const pickModel = (k: string) => {
    setModelKey(k);
    setTrim("");
    const picked = catalog.find((m) => m.key === k);
    if (picked && year === null) setYear(picked.year);
  };

  // ---------------------------------------------------------------- VIN decode
  const doFlash = (names: string[]) => {
    setFlash(new Set(names));
    setTimeout(() => setFlash(new Set()), 950);
  };

  const decode = async (raw = vin) => {
    const v = raw.trim().toUpperCase();
    const err = vinError(v) ?? (v ? null : "Paste the 17-character VIN first.");
    if (err) {
      setVinState({ status: "error", message: err });
      return;
    }
    setVinState({ status: "decoding" });
    const started = performance.now();
    try {
      const res = await fetch(`/api/vin?vin=${encodeURIComponent(v)}`);
      const body = (await res.json()) as { status: "ok"; result: VinDecodeResult } | { status: "error"; message: string };
      // Let the scan read as a scan, even when the mock answers instantly.
      const elapsed = performance.now() - started;
      if (elapsed < 900) await sleep(900 - elapsed);
      if (body.status !== "ok") {
        setVinState({ status: "error", message: body.message });
        return;
      }
      const r = body.result;
      // Fill the dropdowns one after another so you can see what changed.
      setYear(r.year);
      doFlash(["year"]);
      await sleep(160);
      setMake(r.make);
      doFlash(["make"]);
      await sleep(160);
      setModelKey(r.modelKey);
      doFlash(["model"]);
      await sleep(160);
      setTrim(r.trimKey ?? NOT_SURE);
      doFlash(["trim"]);
      setErrors((e) => ({ ...e, model: undefined, trim: undefined }));
      setVinState({
        status: "done",
        message: `Found it: ${r.year} ${r.make} ${r.model}${r.trim ? ` ${r.trim}` : ""}${r.engine ? ` · ${r.engine}` : ""}. Now add the mileage and price.`,
      });
      if (!mileage) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[data-field="mileage"]')?.focus());
    } catch {
      setVinState({ status: "error", message: "VIN lookup didn't respond. Pick the car from the lists instead." });
    }
  };

  const err = (f: FieldName) => (touched[f] || errors[f] ? errors[f] : undefined);
  const errorText = (f: FieldName) =>
    err(f) ? (
      <span className="field__error" id={id(`${f}-err`)}>
        <Icon name="alert" size={14} />
        {err(f)}
      </span>
    ) : null;
  const describedBy = (f: FieldName, hint?: string) => [err(f) ? id(`${f}-err`) : null, hint ?? null].filter(Boolean).join(" ") || undefined;

  const ctaCount = savedCount + 1;
  const vinBusy = vinState.status === "decoding";

  return (
    <form
      ref={formRef}
      className="car-form card"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit("compare");
      }}
    >
      <fieldset className="car-form__group">
        <legend className="sr-only">The car</legend>
        <div className="car-form__grid">
          <div className="field">
            <label className="field__label" htmlFor={id("year")}>
              Year
            </label>
            <span className="control control--select" data-filled-flash={flash.has("year")}>
              <select
                ref={!year ? firstFieldRef : undefined}
                id={id("year")}
                value={year ?? ""}
                onChange={(e) => pickYear(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Any year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={id("make")}>
              Make
            </label>
            <span className="control control--select" data-filled-flash={flash.has("make")}>
              <select ref={year && !make ? firstFieldRef : undefined} id={id("make")} value={make} onChange={(e) => pickMake(e.target.value)}>
                <option value="">Pick a make</option>
                {makes.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={id("model")}>
              Model
            </label>
            <span className={`control control--select${!make ? " control--disabled" : ""}`} data-invalid={Boolean(err("model"))} data-filled-flash={flash.has("model")}>
              <select
                ref={make && !modelKey ? firstFieldRef : undefined}
                id={id("model")}
                data-field="model"
                value={modelKey}
                disabled={!make}
                aria-invalid={Boolean(err("model"))}
                aria-describedby={describedBy("model")}
                onChange={(e) => pickModel(e.target.value)}
                onBlur={() => touched.model && blur("model")}
              >
                <option value="">{make ? "Pick a model" : "Make first"}</option>
                {models.map((m) => (
                  <option key={m.key} value={m.key}>
                    {year === null ? `${m.year} ${m.model}` : m.model}
                  </option>
                ))}
              </select>
            </span>
            {errorText("model")}
          </div>

          <div className="field">
            <label className="field__label" htmlFor={id("trim")}>
              Trim
            </label>
            <span className={`control control--select${!model ? " control--disabled" : ""}`} data-invalid={Boolean(err("trim"))} data-filled-flash={flash.has("trim")}>
              <select
                ref={modelKey && !trim ? firstFieldRef : undefined}
                id={id("trim")}
                data-field="trim"
                value={trim}
                disabled={!model}
                aria-invalid={Boolean(err("trim"))}
                aria-describedby={describedBy("trim", trim === NOT_SURE ? id("trim-note") : undefined)}
                onChange={(e) => setTrim(e.target.value)}
                onBlur={() => touched.trim && blur("trim")}
              >
                <option value="">{model ? "Pick a trim" : "Model first"}</option>
                {model?.trims.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name} · {t.engine}
                  </option>
                ))}
                {model && <option value={NOT_SURE}>Not sure</option>}
              </select>
            </span>
            {errorText("trim")}
            {trim === NOT_SURE && common && (
              <span className="field__hint field__hint--assume" id={id("trim-note")}>
                <Icon name="info" size={14} />
                We&apos;ll use the {common.name}, the most common trim. Trim changes gas mileage and insurance a little.
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor={id("mileage")}>
              Mileage
            </label>
            <span className="control" data-invalid={Boolean(err("mileage"))}>
              <input
                id={id("mileage")}
                data-field="mileage"
                className="is-mono"
                inputMode="numeric"
                autoComplete="off"
                placeholder="74,200"
                value={mileage}
                aria-invalid={Boolean(err("mileage"))}
                aria-describedby={describedBy("mileage")}
                onChange={(e) => {
                  setMileage(e.target.value.replace(/[^\d,]/g, ""));
                }}
                onBlur={() => {
                  const n = parseDigits(mileage);
                  if (n !== null) setMileage(integer(n));
                  blur("mileage");
                }}
              />
              <span className="control__affix">mi</span>
            </span>
            {errorText("mileage")}
          </div>

          <div className="field">
            <label className="field__label" htmlFor={id("price")}>
              Asking price
            </label>
            <span className="control" data-invalid={Boolean(err("price"))}>
              <span className="control__affix">$</span>
              <input
                id={id("price")}
                data-field="price"
                className="is-mono"
                inputMode="numeric"
                autoComplete="off"
                placeholder="14,200"
                value={price}
                aria-invalid={Boolean(err("price"))}
                aria-describedby={describedBy("price")}
                onChange={(e) => {
                  setPrice(e.target.value.replace(/[^\d,]/g, ""));
                }}
                onBlur={() => {
                  const n = parseDigits(price);
                  if (n !== null) setPrice(integer(n));
                  blur("price");
                }}
              />
            </span>
            {errorText("price")}
          </div>
        </div>
      </fieldset>

      <fieldset className="car-form__group car-form__where">
        <legend className="car-form__legend">
          Where and how much you&apos;ll drive
          <span className="muted"> · same for every car</span>
        </legend>
        {locationOpen ? (
          <div className="car-form__grid">
            <div className="field">
              <label className="field__label" htmlFor={id("zip")}>
                ZIP code
              </label>
              <span className="control" data-invalid={Boolean(err("zip"))}>
                <input
                  id={id("zip")}
                  data-field="zip"
                  className="is-mono"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  placeholder="98201"
                  value={zip}
                  aria-invalid={Boolean(err("zip"))}
                  aria-describedby={describedBy("zip", id("zip-hint"))}
                  onChange={(e) => {
                    setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                  }}
                  onBlur={() => blur("zip")}
                />
              </span>
              {errorText("zip") ?? (
                <span className="field__hint" id={id("zip-hint")}>
                  Where you&apos;ll register it. Sets your sales tax.
                </span>
              )}
            </div>
            <div className="field">
              <label className="field__label" htmlFor={id("miles")}>
                Miles you drive a year
              </label>
              <span className="control" data-invalid={Boolean(err("miles"))}>
                <input
                  id={id("miles")}
                  data-field="miles"
                  className="is-mono"
                  inputMode="numeric"
                  autoComplete="off"
                  value={miles}
                  aria-invalid={Boolean(err("miles"))}
                  aria-describedby={describedBy("miles", id("miles-hint"))}
                  onChange={(e) => {
                    setMiles(e.target.value.replace(/[^\d,]/g, ""));
                  }}
                  onBlur={() => {
                    const n = parseDigits(miles);
                    if (n !== null) setMiles(integer(n));
                    blur("miles");
                  }}
                />
                <span className="control__affix">mi/yr</span>
              </span>
              {errorText("miles") ?? (
                <span className="field__hint" id={id("miles-hint")}>
                  Most people drive about 12,000.
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="car-form__where-sum">
            <span className="mono">ZIP {zip}</span>
            <span className="mono">{miles} mi a year</span>
            <button type="button" className="link-btn" onClick={() => setLocationOpen(true)}>
              Change
            </button>
          </p>
        )}
      </fieldset>

      <div className={`vin${vinBusy ? " is-decoding" : ""}${vinState.status === "done" ? " is-done" : ""}`}>
        <label htmlFor={id("vin")} className="vin__label">
          <Icon name="scan" size={16} />
          <span>
            Have the VIN? Paste it to fill this in <span className="muted">(optional)</span>
          </span>
        </label>
        <div className="vin__row">
          <span className="vin__input">
            <input
              id={id("vin")}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={17}
              placeholder="17 characters, on the windshield or title"
              value={vin}
              disabled={vinBusy}
              aria-describedby={id("vin-status")}
              onChange={(e) => {
                setVin(e.target.value.toUpperCase().replace(/\s/g, ""));
                if (vinState.status !== "idle") setVinState({ status: "idle" });
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text").trim().toUpperCase();
                if (text.length === 17) {
                  e.preventDefault();
                  setVin(text);
                  void decode(text);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void decode();
                }
              }}
            />
            <span className="vin__scan" aria-hidden="true" />
          </span>
          <button type="button" className="btn btn--secondary btn--md" onClick={() => decode()} disabled={vinBusy}>
            {vinBusy ? "Reading VIN…" : "Fill from VIN"}
          </button>
        </div>
        <p className="vin__status" id={id("vin-status")} role="status" aria-live="polite">
          {vinState.status === "error" && (
            <span className="field__error">
              <Icon name="alert" size={14} />
              {vinState.message}
            </span>
          )}
          {vinState.status === "done" && (
            <span className="vin__found">
              <Icon name="check" size={14} />
              {vinState.message}
            </span>
          )}
          {vinState.status === "decoding" && <span className="muted">Matching the VIN to a year, make, model and trim…</span>}
          {vinState.status === "idle" && (
            <span className="muted">
              A VIN also lets you check open recalls on NHTSA.gov.
              {sampleVin && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="link-btn link-btn--inline"
                    onClick={() => {
                      setVin(sampleVin);
                      void decode(sampleVin);
                    }}
                  >
                    Try a sample VIN
                  </button>
                </>
              )}
            </span>
          )}
        </p>
      </div>

      <div className="car-form__actions">
        <div className="car-form__actions-left">
          {onCancel && (
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          {canAddAnother && (
            <button type="button" className="btn btn--quiet btn--md" onClick={() => submit("add")}>
              <Icon name="plus" />
              {position === 1 ? "Save and add another" : position === 2 ? "Save and add a third" : "Save"}
            </button>
          )}
        </div>
        <button type="submit" className="btn btn--primary btn--md">
          {ctaCount > 1 ? `Compare ${ctaCount} cars` : "See the real cost"}
          <Icon name="arrow-right" className="btn__arrow" />
        </button>
      </div>
    </form>
  );
}

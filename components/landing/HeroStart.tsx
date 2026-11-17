"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { makesOf, modelsOf, yearsOf } from "@/lib/catalog";
import type { CatalogModel } from "@/lib/data/types";
import { Icon } from "../Icon";

/** Year / make / model inline in the hero. Hands off to the add-car form with the model picked. */
export function HeroStart({ catalog, initial }: { catalog: CatalogModel[]; initial: { year: number; make: string; modelKey: string } }) {
  const router = useRouter();
  const [year, setYear] = useState<number>(initial.year);
  const [make, setMake] = useState(initial.make);
  const [modelKey, setModelKey] = useState(initial.modelKey);
  const [busy, setBusy] = useState(false);

  const years = useMemo(() => yearsOf(catalog), [catalog]);
  const makes = useMemo(() => makesOf(catalog, year), [catalog, year]);
  const models = useMemo(() => modelsOf(catalog, year, make), [catalog, year, make]);

  const pickYear = (y: number) => {
    setYear(y);
    const nextMakes = makesOf(catalog, y);
    const nextMake = nextMakes.includes(make) ? make : nextMakes[0];
    setMake(nextMake);
    setModelKey(modelsOf(catalog, y, nextMake)[0]?.key ?? "");
  };
  const pickMake = (m: string) => {
    setMake(m);
    setModelKey(modelsOf(catalog, year, m)[0]?.key ?? "");
  };

  return (
    <form
      className="hero-start"
      aria-label="Start with a car"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        router.push(`/compare?start=1${modelKey ? `&model=${modelKey}` : ""}`);
      }}
    >
      <label className="hero-start__field">
        <span>Year</span>
        <select value={year} onChange={(e) => pickYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="hero-start__field">
        <span>Make</span>
        <select value={make} onChange={(e) => pickMake(e.target.value)}>
          {makes.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="hero-start__field">
        <span>Model</span>
        <select value={modelKey} onChange={(e) => setModelKey(e.target.value)}>
          {models.map((m) => (
            <option key={m.key} value={m.key}>
              {m.model}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn--primary btn--md hero-start__go" disabled={busy}>
        See the real cost
        <Icon name="arrow-right" className="btn__arrow" />
      </button>
    </form>
  );
}

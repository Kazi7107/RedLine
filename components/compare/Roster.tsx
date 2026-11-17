"use client";

import { carName, resolveKey } from "@/lib/catalog";
import type { CatalogModel } from "@/lib/data/types";
import { integer, money } from "@/lib/format";
import { MAX_CARS, type CarEntry } from "@/lib/share";
import { Icon } from "../Icon";

/** "Your cars" sidebar on the add-car step: saved cars, the one being filled, empty slots. */
export function Roster({
  catalog,
  cars,
  editing,
  removing,
  zip,
  annualMiles,
  onEdit,
  onRemove,
}: {
  catalog: CatalogModel[];
  cars: CarEntry[];
  /** Index being edited, or cars.length when adding a new one. */
  editing: number;
  removing: number | null;
  zip: string;
  annualMiles: number;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
}) {
  const slots = Array.from({ length: MAX_CARS }, (_, i) => i);
  return (
    <aside className="roster" aria-label="Your cars">
      <h2 className="roster__title">
        Your cars <span className="muted">{cars.length} of {MAX_CARS}</span>
      </h2>
      <ol className="roster__list">
        {slots.map((i) => {
          const car = cars[i];
          const isCurrent = i === editing;
          if (car && !isCurrent) {
            const r = resolveKey(catalog, car.key);
            const name = r ? carName(r, { withAssumedTrim: false }) : car.key;
            return (
              <li key={`car-${car.key}-${i}`} className={`roster__item${removing === i ? " is-leaving" : ""}`}>
                <span className="roster__n num">{i + 1}</span>
                <span className="roster__body">
                  <span className="roster__name">{name}</span>
                  <span className="mono muted">
                    {integer(car.mileage)} mi · {money(car.price, { exact: true })}
                  </span>
                </span>
                <span className="roster__actions">
                  <button type="button" className="icon-btn" aria-label={`Edit ${name}`} onClick={() => onEdit(i)}>
                    <Icon name="edit" size={17} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Remove ${name}`} onClick={() => onRemove(i)}>
                    <Icon name="trash" size={17} />
                  </button>
                </span>
              </li>
            );
          }
          if (isCurrent) {
            return (
              <li key={`current-${i}`} className="roster__item roster__item--current" aria-current="step">
                <span className="roster__n num">{i + 1}</span>
                <span className="roster__body">
                  <span className="roster__name">{car ? "Editing this car" : `Car ${i + 1}`}</span>
                  <span className="roster__live">
                    <span className="roster__pulse" aria-hidden="true" />
                    Filling in now
                  </span>
                </span>
              </li>
            );
          }
          return (
            <li key={`empty-${i}`} className="roster__item roster__item--empty">
              <span className="roster__n num">{i + 1}</span>
              <span className="muted">{i === 2 ? "Optional third car" : `Car ${i + 1}`}</span>
            </li>
          );
        })}
      </ol>
      <div className="roster__assume">
        <span className="roster__assume-title">We assume</span>
        <p>
          {integer(annualMiles)} miles a year, {zip ? `ZIP ${zip}` : "a Washington ZIP"} and a clean driving record. You can change the miles and ZIP on the results page.
        </p>
      </div>
    </aside>
  );
}

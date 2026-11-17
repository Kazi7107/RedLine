"use client";

import { useEffect, useState } from "react";
import type { EstimateError, EstimateFull, EstimateSummary, EstimateUnavailable } from "@/lib/data/types";
import type { CarEntry } from "@/lib/share";

export type CarState =
  | { phase: "loading" }
  | { phase: "summary"; summary: EstimateSummary }
  | { phase: "full"; summary: EstimateSummary; full: EstimateFull }
  | { phase: "unavailable"; data: EstimateUnavailable }
  | { phase: "error"; error: Pick<EstimateError, "code" | "message"> };

type Response = EstimateSummary | EstimateFull | EstimateUnavailable | EstimateError;

async function fetchStage(car: CarEntry, zip: string, annualMiles: number, stage: "summary" | "full", signal: AbortSignal): Promise<Response> {
  const q = new URLSearchParams({ key: car.key, mileage: String(car.mileage), price: String(car.price), zip, miles: String(annualMiles), stage });
  const res = await fetch(`/api/estimate?${q.toString()}`, { signal });
  return (await res.json()) as Response;
}

/**
 * Loads every car in parallel, in two stages: the summary (total + reliability)
 * shows up first, then the full breakdown fills in. That's how the real API
 * behaves too: totals come from cache, recalls/complaints can take longer.
 */
export function useEstimates(cars: CarEntry[], zip: string, annualMiles: number, enabled: boolean, nonce = 0) {
  const [states, setStates] = useState<CarState[]>(() => cars.map(() => ({ phase: "loading" })));
  const signature = `${cars.map((c) => `${c.key}.${c.mileage}.${c.price}`).join("~")}|${zip}|${annualMiles}`;

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    setStates(cars.map(() => ({ phase: "loading" })));
    const set = (i: number, s: CarState) => setStates((prev) => prev.map((p, j) => (j === i ? s : p)));

    cars.forEach(async (car, i) => {
      try {
        const first = await fetchStage(car, zip, annualMiles, "summary", ctrl.signal);
        if (first.status === "insufficient_data") return set(i, { phase: "unavailable", data: first });
        if (first.status === "error") return set(i, { phase: "error", error: first });
        const summary = first as EstimateSummary;
        set(i, { phase: "summary", summary });

        const second = await fetchStage(car, zip, annualMiles, "full", ctrl.signal);
        if (second.status === "ok" && second.stage === "full") set(i, { phase: "full", summary, full: second });
        else if (second.status === "error") set(i, { phase: "error", error: second });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        set(i, { phase: "error", error: { code: "not_connected", message: "We couldn't reach our data. Check your connection and try again." } });
      }
    });
    return () => ctrl.abort();
    // `signature` captures cars/zip/annualMiles by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled, nonce]);

  return states;
}

"use client";

import { useEffect, useRef } from "react";
import { integer, money } from "@/lib/format";

type Format = "money" | "integer";
const fmt = (n: number, f: Format) => (f === "money" ? money(n) : integer(n));

/**
 * Ticks a number up from zero the first time it's on screen. Server-renders the
 * final value, so it's correct with no JS and for screen readers (the live
 * text is aria-hidden while it ticks; the final value is in screen-reader text).
 * Writes textContent directly: no React re-render per frame.
 */
export function CountUp({ value, format = "money", duration = 1100, className }: { value: number; format?: Format; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current ?? 0;
    prev.current = value;
    if (reduce || from === value) {
      el.textContent = fmt(value, format);
      return;
    }

    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(from + (value - from) * eased, format);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const run = () => {
      el.textContent = fmt(from, format);
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, format, duration]);

  return (
    <span className={`count ${className ?? ""}`}>
      <span className="sr-only">{fmt(value, format)}</span>
      <span ref={ref} aria-hidden="true">
        {fmt(value, format)}
      </span>
    </span>
  );
}

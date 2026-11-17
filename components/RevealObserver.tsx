"use client";

import { useEffect } from "react";

const SELECTOR = "[data-reveal]:not(.is-in), [data-inview]:not(.is-in), .gauge[data-animate]:not(.is-in)";

/**
 * One IntersectionObserver for the whole app. Anything with data-reveal,
 * data-inview or an animated gauge gets `.is-in` once it scrolls into view.
 * A MutationObserver picks up elements that mount later (results cards).
 */
export function RevealObserver() {
  useEffect(() => {
    // No IntersectionObserver, or reduced motion: everything is simply visible.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      const all = () => document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add("is-in"));
      all();
      const mo = new MutationObserver(all);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const scan = () => document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    scan();

    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

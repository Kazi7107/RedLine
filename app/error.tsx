"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="app-shell">
      <div className="wrap lost">
        <p className="eyebrow">Something stalled</p>
        <h1 className="display">We hit a snag running the numbers</h1>
        <p className="lead">It&apos;s on our end, not yours. Try again, and if it keeps happening, start a new comparison.</p>
        <div className="lost__actions">
          <button type="button" className="btn btn--primary btn--md" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn--secondary btn--md">
            Go to the home page
          </Link>
        </div>
      </div>
    </main>
  );
}

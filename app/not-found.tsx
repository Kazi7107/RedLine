import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main id="main" className="app-main">
        <div className="wrap lost">
          <svg className="lost__gauge" viewBox="0 0 240 140" aria-hidden="true" focusable="false">
            <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="#E6E8EB" strokeWidth="14" strokeLinecap="round" />
            <path d="M190.7 49.3 A100 100 0 0 1 220 120" fill="none" stroke="var(--red)" strokeWidth="14" strokeLinecap="round" />
            <line className="lost__needle" x1="120" y1="120" x2="120" y2="36" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="120" cy="120" r="9" fill="var(--ink)" />
          </svg>
          <p className="eyebrow">404 · Off the chart</p>
          <h1 className="display">This page is past the redline</h1>
          <p className="lead">We couldn&apos;t find that page. If someone sent you a comparison link, it might have been cut off when it was pasted.</p>
          <div className="lost__actions">
            <Link href="/compare?start=1" className="btn btn--primary btn--md">
              Check a car
              <Icon name="arrow-right" className="btn__arrow" />
            </Link>
            <Link href="/" className="btn btn--secondary btn--md">
              Go to the home page
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

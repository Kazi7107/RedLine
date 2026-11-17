import Link from "next/link";
import { LogoMark } from "./Logo";

const CREDIT = "A University of Washington capstone project by Kazim Syed";
const SCOPE = "Costs are Washington-specific for now. Estimates, not quotes.";

export function SiteFooter({ variant = "slim" }: { variant?: "slim" | "full" }) {
  if (variant === "slim") {
    return (
      <footer className="site-footer">
        <div className="wrap wrap--wide site-footer__slim">
          <span>{SCOPE}</span>
          <nav aria-label="Footer">
            <Link href="/methodology">How we calculate</Link>
            <Link href="/#sources">Data sources</Link>
            <Link href="/#faq">FAQ</Link>
          </nav>
        </div>
      </footer>
    );
  }
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__full">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <span className="logo" style={{ minHeight: 0 }}>
              <LogoMark size={30} />
              <span className="logo__word" style={{ fontSize: 24 }}>
                Redline
              </span>
            </span>
            <p>The true cost of a used car, in plain numbers.</p>
          </div>
          <nav aria-label="Footer" className="site-footer__cols">
            <div className="site-footer__col">
              <h2>Product</h2>
              <Link href="/compare?start=1">Compare cars</Link>
              <Link href="/#how">How it works</Link>
              <Link href="/methodology">How we calculate</Link>
            </div>
            <div className="site-footer__col">
              <h2>Learn</h2>
              <Link href="/#sources">Data sources</Link>
              <Link href="/#faq">FAQ</Link>
              <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noreferrer">
                NHTSA recall lookup
              </a>
            </div>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <span>{SCOPE}</span>
          <span>{CREDIT}</span>
        </div>
      </div>
    </footer>
  );
}

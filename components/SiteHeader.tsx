"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "what", label: "What we count" },
  { id: "sources", label: "Data sources" },
  { id: "faq", label: "FAQ" },
];

interface Cta {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
}

/**
 * Sticky header. On the landing page the section links scroll and highlight
 * the section in view; everywhere else they link back to the landing page.
 */
export function SiteHeader({ variant = "app", cta = { href: "/compare?start=1", label: "Check a car" } }: { variant?: "landing" | "app"; cta?: Cta | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy: the section crossing the upper third of the viewport is "current".
  useEffect(() => {
    if (variant !== "landing") return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [variant]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const href = (id: string) => (variant === "landing" ? `#${id}` : `/#${id}`);

  return (
    <header className="site-header" data-scrolled={scrolled || open}>
      <div className="wrap wrap--wide site-header__inner">
        <Logo />
        <nav className="nav" aria-label="Main">
          <ul className="nav__links">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                {variant === "landing" ? (
                  <a className="nav__link" href={href(s.id)} aria-current={active === s.id ? "true" : undefined}>
                    {s.label}
                  </a>
                ) : (
                  <Link className="nav__link" href={href(s.id)}>
                    {s.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {cta && (
            <Link href={cta.href} className={`btn btn--sm btn--header ${cta.tone === "secondary" ? "btn--secondary" : "btn--primary"}`}>
              {cta.label}
            </Link>
          )}
          <button
            ref={toggleRef}
            type="button"
            className="icon-btn icon-btn--bordered menu-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </nav>
      </div>
      {open && (
        <div id="mobile-menu" className="mobile-menu">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Link href={href(s.id)} onClick={() => setOpen(false)}>
                  {s.label}
                  <Icon name="arrow-right" />
                </Link>
              </li>
            ))}
            <li>
              <Link href="/methodology" onClick={() => setOpen(false)}>
                How we calculate
                <Icon name="arrow-right" />
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

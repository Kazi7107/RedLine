import Link from "next/link";

/** The tach mark: a gauge arc whose last stretch is the redline. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 22) / 34} viewBox="0 0 34 22" aria-hidden="true" focusable="false">
      <path d="M3 19 A14 14 0 0 1 31 19" fill="none" stroke="#C9CDD3" strokeWidth="3" strokeLinecap="round" />
      <path d="M26.9 9.1 A14 14 0 0 1 31 19" fill="none" stroke="var(--red)" strokeWidth="3" strokeLinecap="round" />
      <line className="logo__needle" x1="17" y1="19" x2="25" y2="10" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Redline home">
      <LogoMark />
      <span className="logo__word">Redline</span>
    </Link>
  );
}

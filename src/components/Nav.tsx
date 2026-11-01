import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="logo">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="var(--accent)" />
        <path d="M8 15l4 4 8-9" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      BelastingBuddy
    </Link>
  );
}

export function Nav() {
  return (
    <nav className="nav tile" aria-label="Main">
      <Logo />
      <div className="nav-links">
        <Link href="/guides/">Guides</Link>
        <Link href="/privacy/">Privacy</Link>
        <Link href="/return/" className="btn btn-dark">
          Start free
        </Link>
      </div>
    </nav>
  );
}

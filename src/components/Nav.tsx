"use client";

import Link from "next/link";
import { LangSwitch, T } from "@/lib/i18n";

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
        <Link href="/guides/">
          <T>Guides</T>
        </Link>
        <Link href="/privacy/">
          <T>Privacy</T>
        </Link>
        <LangSwitch />
        <Link href="/return/" className="btn btn-dark">
          <T>Start free</T>
        </Link>
      </div>
    </nav>
  );
}

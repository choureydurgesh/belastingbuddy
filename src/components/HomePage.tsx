"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Nav } from "./Nav";
import { loadSaved } from "@/lib/storage";
import { YEARS } from "@/lib/tax/calculate";
import { GUIDES } from "@/lib/guides";

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function HomePage() {
  // F10: show "continue" if the user already started.
  const [hasSaved, setHasSaved] = useState(false);
  useEffect(() => {
    const s = loadSaved();
    setHasSaved(!!s && Object.keys(s.answers).length > 0);
  }, []);

  return (
    <div className="page">
      <div className="wrap">
        <Nav />

        <div className="row">
          <section className="tile hero">
            <div className="pill">Tax years {YEARS.slice().reverse().join(" and ")} · for expats and residents</div>
            <h1>
              Dutch taxes,
              <br />
              without the Dutch.
            </h1>
            <div className="hero-foot">
              <p className="lead">
                We ask simple questions in plain English. You get a checklist and exactly what to type into Mijn Belastingdienst.
              </p>
              <div className="cta-group">
                <Link href="/return/" className="btn btn-accent btn-lg">
                  {hasSaved ? "Continue my return" : "Start my return"} <Arrow />
                </Link>
              </div>
            </div>
          </section>

          <div className="stack side">
            <div className="tile tile-dark">
              <div className="eyebrow eyebrow-muted">What it feels like</div>
              <div className="tile-q">Did you have the 30% ruling?</div>
              <div className="chips">
                <Link href="/return/" className="chip chip-accent">Yes</Link>
                <Link href="/return/" className="chip chip-dark">No</Link>
                <Link href="/return/" className="chip chip-dark">Not sure</Link>
              </div>
            </div>
            <div className="tile tile-blue">
              <div className="eyebrow eyebrow-blue">Refund estimate</div>
              <div className="big-number">Live</div>
              <div className="muted-blue">Updates every time you answer a question.</div>
            </div>
          </div>
        </div>

        <div className="row" id="how">
          <FeatureTile title="Moved this year?" text="We spot it and guide you through the M form." icon="arrow" />
          <FeatureTile title="Home and mortgage" text="WOZ value, mortgage interest and loans in one place." icon="home" />
          <FeatureTile title="Savings (box 3)" text="Bank, shares and crypto on 1 January, explained." icon="card" accent />
          <FeatureTile title="Your filing guide" text="Every number, and the section it goes in." icon="check" />
        </div>

        <section className="tile guides-strip" aria-labelledby="guides-title">
          <div className="guides-strip-head">
            <h2 id="guides-title">Guides</h2>
            <Link href="/guides/">All guides →</Link>
          </div>
          <ul className="guides-links">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}/`}>{g.title}</Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="footnote">
          BelastingBuddy is a guide, not a tax advisor. You file your own return on Mijn Belastingdienst. Your answers stay in this
          browser. <Link href="/privacy/">Privacy</Link>
        </p>
      </div>
    </div>
  );
}

function FeatureTile({ title, text, icon, accent }: { title: string; text: string; icon: string; accent?: boolean }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M3 12h18M12 3l9 9-9 9" />,
    home: (
      <>
        <path d="M3 11l9-7 9 7v9H3z" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    check: (
      <>
        <path d="M9 11l3 3 8-8" />
        <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
      </>
    ),
  };
  return (
    <div className={"tile feature" + (accent ? " tile-accent" : "")}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths[icon]}
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

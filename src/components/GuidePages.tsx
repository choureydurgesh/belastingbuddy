import Link from "next/link";
import { Nav } from "./Nav";
import { GUIDES, type Block, type Guide } from "@/lib/guides";

export function GuidesIndex() {
  return (
    <div className="page">
      <div className="wrap">
        <Nav />
        <section className="tile guide-head">
          <div className="pill">Guides</div>
          <h1>Dutch tax, in plain English</h1>
          <p className="lead">Short guides for expats and residents. No jargon, just what you need for your return.</p>
        </section>
        <div className="row">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}/`} className="tile feature guide-card">
              <h3>{g.title}</h3>
              <p>{g.summary}</p>
              <span className="read-more">Read the guide →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GuidePage({ guide }: { guide: Guide }) {
  const others = GUIDES.filter((g) => g.slug !== guide.slug);
  return (
    <div className="page">
      <div className="wrap">
        <Nav />
        <div className="row">
          <article className="tile article">
            <Link href="/guides/" className="back-link">
              ← All guides
            </Link>
            <h1>{guide.title}</h1>
            <p className="lead">{guide.summary}</p>
            <p className="checked">Facts checked on {guide.checked}.</p>
            {guide.sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
                {s.blocks.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </section>
            ))}
            <section className="sources">
              <h2>Sources</h2>
              <ul>
                {guide.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="muted">BelastingBuddy is a guide, not a tax advisor. Rules can change; check the Belastingdienst if in doubt.</p>
            </section>
          </article>
          <aside className="stack side">
            <div className="tile tile-dark">
              <div className="eyebrow">Ready to start?</div>
              <div className="tile-q">Find out what to fill in, step by step.</div>
              <Link href="/return/" className="btn btn-accent">
                Start my return →
              </Link>
            </div>
            <div className="tile">
              <div className="eyebrow">More guides</div>
              <ul className="more-guides">
                {others.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}/`}>{g.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "note":
      return <p className="note">{block.text}</p>;
    case "list":
      return (
        <ul>
          {block.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol>
          {block.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r) => (
                <tr key={r.join("|")}>
                  {r.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

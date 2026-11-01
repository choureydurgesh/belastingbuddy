"use client";

// First step of the return: upload one or more jaaropgaven (PDF or photo).
// We read them in the browser, show what we found, let the user fix it, then fill in the answers.
import { useState, type ChangeEvent } from "react";
import { readDocument } from "./ScanJaaropgaaf";
import { answersFromDocs, extractJaaropgaaf, type ScannedDoc } from "@/lib/scan";
import { parseMoney } from "@/lib/money";
import { YEARS } from "@/lib/tax/calculate";
import { useLang } from "@/lib/i18n";

let nextId = 1;

export function JaaropgaafStep({ onDone }: { onDone: (found: Record<string, unknown>) => void }) {
  const { t } = useLang();
  const [docs, setDocs] = useState<ScannedDoc[]>([]);
  const [reading, setReading] = useState(0);
  const [unread, setUnread] = useState<string[]>([]);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setReading((n) => n + files.length);
    for (const file of files) {
      let result = extractJaaropgaaf("");
      try {
        result = extractJaaropgaaf(await readDocument(file));
      } catch {
        // keep the empty result; the user can type the numbers
      }
      const found = result.fiscalWage !== null || result.taxWithheld !== null;
      if (!found) setUnread((u) => [...u, file.name]);
      setDocs((d) => [...d, { id: String(nextId++), fileName: file.name, owner: "me", result }]);
      setReading((n) => n - 1);
    }
  }

  function update(id: string, change: (d: ScannedDoc) => ScannedDoc) {
    setDocs((list) => list.map((d) => (d.id === id ? change(d) : d)));
  }

  const ready = docs.length > 0 && reading === 0;

  return (
    <div className="jo-step">
      <label className="btn btn-accent btn-lg jo-upload">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M6 10l6-6 6 6" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        {docs.length ? t("Add another jaaropgaaf") : t("Upload jaaropgaaf (PDF or photo)")}
        <input id="jo-files" type="file" accept="application/pdf,image/*" multiple onChange={onFiles} className="sr-only" />
      </label>
      <p className="small-muted">{t("Have more than one job, or a partner? Add each jaaropgaaf. They're read in your browser and never uploaded.")}</p>

      {reading > 0 && (
        <p role="status" className="scan-status">
          {t("Reading your jaaropgaaf…")}
        </p>
      )}

      {docs.map((d) => (
        <div key={d.id} className="jo-doc">
          <div className="jo-doc-head">
            <div>
              <strong>{d.result.employer || d.fileName}</strong>
              <div className="small-muted">
                {d.result.year ? `${d.result.year} · ` : ""}
                {d.fileName}
              </div>
            </div>
            <button className="btn-link" onClick={() => setDocs((list) => list.filter((x) => x.id !== d.id))}>
              {t("Remove")}
            </button>
          </div>
          {unread.includes(d.fileName) && d.result.fiscalWage === null && (
            <p className="error">{t("We couldn't read this one. Type the numbers, or remove it.")}</p>
          )}
          <div className="jo-fields">
            <MoneyField
              id={`jo-w-${d.id}`}
              label={t("Fiscal wage")}
              value={d.result.fiscalWage}
              onChange={(v) => update(d.id, (x) => ({ ...x, result: { ...x.result, fiscalWage: v } }))}
            />
            <MoneyField
              id={`jo-t-${d.id}`}
              label={t("Tax withheld")}
              value={d.result.taxWithheld}
              onChange={(v) => update(d.id, (x) => ({ ...x, result: { ...x.result, taxWithheld: v } }))}
            />
          </div>
          <div className="chips" role="radiogroup" aria-label={t("Whose jaaropgaaf is this?")}>
            {(["me", "partner"] as const).map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={d.owner === o}
                className={"chip " + (d.owner === o ? "chip-accent" : "chip-outline")}
                onClick={() => update(d.id, (x) => ({ ...x, owner: o }))}
              >
                {t(o === "me" ? "Mine" : "My partner's")}
              </button>
            ))}
          </div>
          {d.result.ruling30 && <p className="small-muted">{t("We see the 30% ruling on this jaaropgaaf.")}</p>}
        </div>
      ))}

      <div className="cta-group">
        {ready && (
          <button className="btn btn-dark" onClick={() => onDone(answersFromDocs(docs, YEARS))}>
            {t("Use these numbers")}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => onDone(answersFromDocs([], YEARS))}>
          {t("Skip, I'll type the numbers")}
        </button>
      </div>
    </div>
  );
}

function MoneyField({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value !== null ? String(value) : "");
  return (
    <div className="jo-field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <span className="prefix" aria-hidden="true">
          €
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseMoney(e.target.value);
            onChange(v === null ? null : Math.round(v));
          }}
        />
      </div>
    </div>
  );
}

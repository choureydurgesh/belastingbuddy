"use client";

// F24: read a WOZ letter, mortgage statement, bank or broker statement in the browser,
// and offer the number we found. Several bank or broker statements are added up.
import { useState, type ChangeEvent } from "react";
import { readDocument } from "./ScanJaaropgaaf";
import { extractDocument, type DocKind } from "@/lib/scan";
import { formatEuro } from "@/lib/questions";
import type { Answers } from "@/lib/tax/types";
import { useLang } from "@/lib/i18n";

/** Which questions can be answered from which document. */
export const DOC_FOR: Partial<Record<keyof Answers, DocKind>> = {
  wozValue: "woz",
  oldWozValue: "woz",
  dutchProperty: "woz",
  mortgageInterest: "mortgage",
  savings: "bank",
  investments: "investments",
};

const BUTTON: Record<DocKind, string> = {
  woz: "Read it from your WOZ letter",
  mortgage: "Read it from your mortgage statement",
  bank: "Read it from your bank statements",
  investments: "Read it from your broker statements",
};

interface Read {
  name: string;
  amount: number | null;
}

export function DocReader({ kind, onUse }: { kind: DocKind; onUse: (amount: number) => void }) {
  const { t } = useLang();
  const [files, setFiles] = useState<Read[]>([]);
  const [reading, setReading] = useState(0);
  const several = kind === "bank" || kind === "investments" || kind === "mortgage";

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    setReading((n) => n + list.length);
    for (const file of list) {
      let amount: number | null = null;
      try {
        amount = extractDocument(kind, await readDocument(file)).amount;
      } catch {
        // stays null: the user types the number
      }
      setFiles((f) => [...f, { name: file.name, amount }]);
      setReading((n) => n - 1);
    }
  }

  const found = files.filter((f) => f.amount !== null);
  const total = found.reduce((s, f) => s + (f.amount ?? 0), 0);

  return (
    <div className="scan">
      <label className="btn btn-ghost scan-button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
        </svg>
        {t(BUTTON[kind])}
        <input id={`doc-${kind}`} type="file" accept="application/pdf,image/*" multiple={several} onChange={onFiles} className="sr-only" />
      </label>
      <p className="small-muted">
        {t(several ? "PDF or photo. Add one for each account or loan. Read in your browser, never uploaded." : "PDF or photo. Read in your browser, never uploaded.")}
      </p>
      {reading > 0 && (
        <p role="status" className="scan-status">
          {t("Reading your document…")}
        </p>
      )}
      {files.length > 0 && (
        <div className="scan-result" role="status">
          <table className="breakdown">
            <tbody>
              {files.map((f, i) => (
                <tr key={i}>
                  <td>{f.name}</td>
                  <td className="num">{f.amount !== null ? formatEuro(f.amount) : t("not found")}</td>
                </tr>
              ))}
              {found.length > 1 && (
                <tr>
                  <td>
                    <strong>{t("Total")}</strong>
                  </td>
                  <td className="num">
                    <strong>{formatEuro(total)}</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {found.length > 0 ? (
            <>
              <p className="small-muted">{t("Check the number before you use it.")}</p>
              <button className="btn btn-dark" onClick={() => onUse(total)}>
                {t(`Use ${formatEuro(total)}`)}
              </button>
            </>
          ) : (
            <p className="error">{t("We couldn't find the number. Please type it in.")}</p>
          )}
        </div>
      )}
    </div>
  );
}

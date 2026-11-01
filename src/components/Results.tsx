"use client";

import { useState } from "react";
import type { Answers, Estimate, PersonResult } from "@/lib/tax/types";
import { rulesFor } from "@/lib/tax/calculate";
import { formatEuro } from "@/lib/questions";
import { buildChecklist } from "@/lib/checklist";
import { buildGuide } from "@/lib/guide";
import { DeleteButton } from "./DeleteButton";
import { useLang } from "@/lib/i18n";
import { ReminderSignup } from "./ReminderSignup";

const FORM_NAME: Record<string, string> = {
  resident: "P form (normal return)",
  moved_in: "M form (migration year)",
  moved_out: "M form (migration year)",
  non_resident: "C form (non-residents)",
};

export function Results({
  answers,
  estimate,
  onEdit,
  onDelete,
}: {
  answers: Answers;
  estimate: Estimate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, lang } = useLang();
  const RULES = rulesFor(answers);
  const checklist = buildChecklist(answers);
  const guide = buildGuide(answers, estimate);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const refund = estimate.result >= 0;
  const deadline = new Date(RULES.deadline);
  const deadlineText = deadline.toLocaleDateString(lang === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const pastDeadline = Date.now() > deadline.getTime();

  return (
    <div className="results">
      <div className="row">
        <section className="tile hero results-hero">
          <div className="pill">{t(`Your ${RULES.year} return · ${t(FORM_NAME[answers.residency ?? "resident"])}`)}</div>
          {estimate.available ? (
            <>
              <h1 className="result-number">
                <span className="result-label">
                  {t(estimate.partner ? (refund ? "Together you may get back" : "Together you may need to pay") : refund ? "You may get back" : "You may need to pay")}
                </span>
                {formatEuro(Math.abs(estimate.result))}
              </h1>
              <p className="lead">
                {t(estimate.rough ? "This is a rough estimate. " : "This is an estimate. ")}
                {t("The Belastingdienst decides the final amount.")}
              </p>
            </>
          ) : (
            <>
              <h1 className="result-number small">{t("We can't estimate this one yet")}</h1>
              <p className="lead">{t("Your checklist and filing guide below still work.")}</p>
            </>
          )}
          {estimate.notes.length > 0 && (
            <ul className="notes">
              {estimate.notes.map((n) => (
                <li key={n}>{t(n)}</li>
              ))}
            </ul>
          )}
          <div className="cta-group">
            {process.env.NEXT_PUBLIC_PREVIEW !== "1" && (
              <button className="btn btn-dark" onClick={() => window.print()}>
                {t("Print or save as PDF")}
              </button>
            )}
            <button className="btn btn-ghost" onClick={onEdit}>
              {t("Change my answers")}
            </button>
          </div>
        </section>

        <aside className="stack side">
          <div className={"tile " + (pastDeadline ? "tile-accent" : "tile-dark")}>
            <div className="eyebrow">{t("Deadline")}</div>
            <div className="tile-q">{deadlineText}</div>
            <p className="small-text">
              {t(
                pastDeadline
                  ? "The normal deadline has passed. If you haven't filed yet, file as soon as you can."
                  : "File before this date, or ask for more time in Mijn Belastingdienst.",
              )}
            </p>
          </div>
          <ReminderSignup year={RULES.year} />
          {estimate.available && (
            <div className="tile">
              <div className="eyebrow">{t("How we got there")}</div>
              {estimate.partner ? (
                <>
                  <Breakdown title="You" p={estimate.you} />
                  <Breakdown title="Your partner" p={estimate.partner} />
                  <table className="breakdown">
                    <tbody>
                      <Line label="Together" value={estimate.result} strong signed />
                    </tbody>
                  </table>
                </>
              ) : (
                <Breakdown p={estimate.you} />
              )}
            </div>
          )}
        </aside>
      </div>

      <div className="row">
        <section className="tile half" aria-labelledby="checklist-title">
          <h2 id="checklist-title">{t("Your document checklist")}</h2>
          <p className="muted">
            {t(`${checklist.length} things to collect before you start. Ticked ${Object.values(ticked).filter(Boolean).length} of ${checklist.length}.`)}
          </p>
          <ul className="checklist">
            {checklist.map((item) => (
              <li key={item.id}>
                <input
                  type="checkbox"
                  id={`chk-${item.id}`}
                  checked={!!ticked[item.id]}
                  onChange={(e) => setTicked({ ...ticked, [item.id]: e.target.checked })}
                />
                <label htmlFor={`chk-${item.id}`}>
                  <strong>{t(item.title)}</strong>
                  <span>{t(item.where)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="tile half" aria-labelledby="guide-title">
          <h2 id="guide-title">{t("Your filing guide")}</h2>
          <p className="muted">{t("Follow these steps in Mijn Belastingdienst. Dutch section names are shown so you can find them.")}</p>
          <ol className="guide">
            {guide.map((step) => (
              <li key={step.title}>
                <div className="guide-title">
                  {t(step.title)} <span className="dutch">{step.dutch}</span>
                </div>
                <ul>
                  {step.lines.map((l) => (
                    <li key={l.label}>
                      <span>{t(l.label)}</span>
                      {l.value && <strong className="value">{l.value}</strong>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="footnote no-print">
        {t("BelastingBuddy is a guide, not a tax advisor. For complex situations, ask a tax advisor.")}{" "}
        <DeleteButton onConfirm={onDelete} />
      </p>
    </div>
  );
}

function Breakdown({ title, p }: { title?: string; p: PersonResult }) {
  const { t } = useLang();
  const credits = p.generalCredit + p.labourCredit + p.elderlyCredit;
  return (
    <table className="breakdown">
      {title && <caption>{t(title)}</caption>}
      <tbody>
        {p.wage > 0 && <Line label="Salary" value={p.wage} />}
        {p.sideIncome !== 0 && <Line label="Side income (taxable)" value={p.sideIncome} />}
        {p.foreignIncome > 0 && <Line label="Income from abroad" value={p.foreignIncome} />}
        {p.homeIncome !== 0 && <Line label="Home (forfait minus interest and costs)" value={p.homeIncome} />}
        {p.deductions > 0 && <Line label="Deductions" value={-p.deductions} />}
        <Line label="Taxable income (box 1)" value={p.box1Taxable} strong />
        <Line label="Tax on box 1" value={p.box1Tax} />
        {p.foreignRelief > 0 && <Line label="Relief for tax paid abroad" value={-p.foreignRelief} />}
        {p.box3Tax > 0 && <Line label="Tax on savings (box 3)" value={p.box3Tax} />}
        {credits > 0 && <Line label="Tax credits" value={-credits} />}
        <Line label="Tax owed" value={p.totalTax} strong />
        {p.withheld > 0 && <Line label="Already paid via salary" value={p.withheld} />}
        {p.provisionalPaid > 0 && <Line label="Paid via provisional assessment" value={p.provisionalPaid} />}
        {p.provisionalReceived > 0 && <Line label="Received via provisional assessment" value={-p.provisionalReceived} />}
        <Line label={p.result >= 0 ? "Back to you" : "To pay"} value={Math.abs(p.result)} strong />
      </tbody>
    </table>
  );
}

function Line({ label, value, strong, signed }: { label: string; value: number; strong?: boolean; signed?: boolean }) {
  const { t } = useLang();
  const text = signed
    ? t((value >= 0 ? "back " : "pay ") + formatEuro(Math.abs(value)))
    : (value < 0 ? "− " : "") + formatEuro(Math.abs(value));
  return (
    <tr className={strong ? "strong" : ""}>
      <td>{t(label)}</td>
      <td className="num">{text}</td>
    </tr>
  );
}

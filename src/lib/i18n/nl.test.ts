// Checks that every text the question flow and results can show has a Dutch version.
import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "./index";
import { QUESTIONS, SECTIONS, withYear } from "../questions";
import { calculate } from "../tax/calculate";
import { buildChecklist } from "../checklist";
import { buildGuide } from "../guide";
import type { Answers } from "../tax/types";

// Texts that are already Dutch (names of sections in Mijn Belastingdienst) don't need a translation.
const DUTCH = /^(Aangifte inkomstenbelasting|Loon, uitkeringen|Inkomsten uit|Winst uit|Resultaat uit|Eigen woning|Bankrekeningen|Aftrekposten|Verdelen met|Overzicht en|Feedback$|Privacy$|Live$|Deadline$)/;
const missing = (texts: string[]) => texts.filter((s) => s && !DUTCH.test(s) && translate(s, "nl") === s);

const scenarios: Answers[] = [
  { taxYear: 2026, residency: "resident", partner: "yes", pensionAge: "during", turned67Month: 4, hasJob: "yes", fiscalWage: 30000, taxWithheld: 5000, ruling30: "yes", ruling2023: "yes", foreignIncome: "yes", foreignIncomeAmount: 5000, foreignTaxed: "yes", sideIncome: "yes", sideType: "business", sideHours: "yes", sideStarter: "yes", sideIncomeAmount: 20000, provisional: "received", provisionalAmount: 1000, partnerPensionAge: "no", partnerWage: 20000, partnerWithheld: 2000, partnerProvisional: "paid", partnerProvisionalAmount: 500, ownHome: "yes", homeChange: "both", homeShare: 100, homeMonths: 6, wozValue: 400000, oldWozValue: 300000, oldHomeMonths: 6, mortgageInterest: 9000, mortgageType: "unsure", purchaseCosts: 3000, groundLease: "yes", groundLeaseAmount: 900, saleResult: "profit", studentLoan: "yes", studentLoanAmount: 20000, otherDebts: 1000, savings: 200000, investments: 50000, otherProperty: 100000, dutchProperty: 0, healthcare: "yes", healthcareAmount: 3000, gifts: "yes", giftsAmount: 500, alimony: "yes", alimonyAmount: 2000 },
  { taxYear: 2025, residency: "moved_in", moveMonth: 4, partner: "unsure", pensionAge: "no", hasJob: "yes", fiscalWage: 50000, taxWithheld: 15000, foreignIncome: "yes", foreignIncomeAmount: 3000, foreignTaxed: "no", sideIncome: "yes", sideType: "other", sideIncomeAmount: 2000, ownHome: "yes", homeChange: "sold", homeShare: 50, homeMonths: 3, wozValue: 300000, mortgageInterest: 5000, mortgageType: "interestOnlyNew", groundLease: "no", saleResult: "loss" },
  { taxYear: 2025, residency: "non_resident", qualifyingNonResident: "no", ownHome: "no" },
  { taxYear: 2025, residency: "non_resident", qualifyingNonResident: "yes", hasJob: "yes", fiscalWage: 40000, taxWithheld: 12000 },
  { taxYear: 2026, residency: "moved_out", pensionAge: "yes", ownHome: "yes", homeChange: "bought", homeShare: 100, homeMonths: 12, wozValue: 300000, mortgageInterest: 0, purchaseCosts: 2000, healthcare: "yes", healthcareAmount: 1000, ruling30: "yes", ruling2023: "no" },
];

test("every question, option and help text has Dutch", () => {
  const texts: string[] = SECTIONS.map((s) => s.title);
  for (const a of scenarios) {
    for (const q of QUESTIONS) {
      texts.push(withYear(q.text, a));
      if (q.help) texts.push(withYear(q.help, a));
      for (const o of q.options ?? []) if (!/^\d+$/.test(o.label)) texts.push(withYear(o.label, a));
    }
  }
  assert.deepEqual([...new Set(missing(texts))], []);
});

test("every result note, checklist item and guide line has Dutch", () => {
  const texts: string[] = [];
  for (const a of scenarios) {
    const e = calculate(a);
    texts.push(...e.notes);
    for (const c of buildChecklist(a)) texts.push(c.title, c.where);
    for (const g of buildGuide(a, e)) {
      texts.push(g.title, g.dutch);
      for (const l of g.lines) texts.push(l.label);
    }
  }
  assert.deepEqual([...new Set(missing(texts))], []);
});

test("placeholders carry values into Dutch", () => {
  assert.equal(translate("Bank balances on 1 January 2026", "nl"), "Banksaldi op 1 januari 2026");
  assert.equal(translate("Question 3 of 20", "nl"), "Vraag 3 van 20");
  assert.equal(translate("Where did you live in 2025?", "nl"), "Waar woonde je in 2025?");
  assert.equal(translate("Anything unknown", "nl"), "Anything unknown");
});

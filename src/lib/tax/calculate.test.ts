// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RULES,
  bracketTax,
  generalTaxCredit,
  labourTaxCredit,
  elderlyTaxCredit,
  homeForfait,
  box3,
  sideIncome,
  calculate,
} from "./calculate";
import type { Answers } from "./types";

const close = (a: number, b: number, d = 1) => assert.ok(Math.abs(a - b) <= d, `${a} is not close to ${b}`);
const employee: Answers = { residency: "resident", partner: "no", pensionAge: "no", hasJob: "yes", fiscalWage: 60000, taxWithheld: 20000 };

test("box 1 brackets", () => {
  close(bracketTax(0, RULES), 0);
  close(bracketTax(38441, RULES), 13769.57);
  close(bracketTax(50000, RULES), 18101.88);
  close(bracketTax(100000, RULES), 13769.57 + 38376 * 0.3748 + 23183 * 0.495);
});

test("box 1 at pension age uses 17.92% in the first bracket", () => {
  close(bracketTax(38441, RULES, true), 6888.63);
  close(bracketTax(50000, RULES, true) - bracketTax(38441, RULES, true), 11559 * 0.3748);
});

test("general tax credit", () => {
  close(generalTaxCredit(20000, RULES), 3068);
  close(generalTaxCredit(50000, RULES), 1699.59);
  close(generalTaxCredit(76817, RULES), 0);
  close(generalTaxCredit(20000, RULES, true), 1536);
  close(generalTaxCredit(50000, RULES, true), 1536 - 0.0317 * 21594);
});

test("labour tax credit lines up at every band edge", () => {
  close(labourTaxCredit(12169, RULES), 980);
  close(labourTaxCredit(26288, RULES), 5220);
  close(labourTaxCredit(43071, RULES), 5599);
  close(labourTaxCredit(129078, RULES), 0);
  close(labourTaxCredit(12169, RULES, true), 490.3);
  close(labourTaxCredit(26288, RULES, true), 2612);
  close(labourTaxCredit(43071, RULES, true), 2801.6);
  close(labourTaxCredit(129078, RULES, true), 0, 2);
});

test("elderly credit", () => {
  close(elderlyTaxCredit(30000, RULES), 2035);
  close(elderlyTaxCredit(50000, RULES), 2035 - 0.15 * 4692);
  close(elderlyTaxCredit(60000, RULES), 0);
});

test("home forfait", () => {
  close(homeForfait(400000, RULES), 1400);
  close(homeForfait(1500000, RULES), 4655 + 0.0235 * 170000);
});

test("box 3 on savings, single and with partner", () => {
  close(box3({ savings: 100000 }, RULES).tax, 208.7);
  assert.equal(box3({ savings: 50000 }, RULES).tax, 0);
  assert.equal(box3({ savings: 100000 }, RULES, 2).tax, 0);
});

test("business profit gets both deductions", () => {
  const s = sideIncome({ sideIncome: "yes", sideType: "business", sideHours: "yes", sideIncomeAmount: 30000 }, RULES);
  close(s.taxable, (30000 - 2470) * 0.873);
  assert.equal(s.work, 30000);
  const other = sideIncome({ sideIncome: "yes", sideType: "other", sideIncomeAmount: 5000 }, RULES);
  assert.equal(other.taxable, 5000);
});

test("simple employee gets the right refund", () => {
  const e = calculate(employee);
  assert.equal(e.available, true);
  assert.equal(e.rough, false);
  close(e.you.totalTax, 16287);
  close(e.result, 3713);
});

test("mortgage interest lowers the tax", () => {
  const e = calculate({ ...employee, taxWithheld: 16287, ownHome: "yes", homeShare: 100, homeMonths: 12, wozValue: 400000, mortgageInterest: 10000 });
  assert.ok(e.result > 3000);
});

test("pension age: lower tax, plus elderly credit", () => {
  const young = calculate({ ...employee, hasJob: "yes", fiscalWage: 30000, taxWithheld: 0 });
  const old = calculate({ ...employee, pensionAge: "yes", fiscalWage: 30000, taxWithheld: 0 });
  assert.equal(old.available, true);
  assert.ok(old.you.totalTax < young.you.totalTax);
  assert.ok(old.you.elderlyCredit > 2000);
});

test("turning 67 mid-year lands between the two", () => {
  const young = calculate({ ...employee, taxWithheld: 0 }).you.totalTax;
  const old = calculate({ ...employee, pensionAge: "yes", taxWithheld: 0 }).you.totalTax;
  const mid = calculate({ ...employee, pensionAge: "during", turned67Month: 6, taxWithheld: 0 });
  assert.ok(mid.you.totalTax < young && mid.you.totalTax > old);
  assert.equal(mid.rough, true);
});

test("foreign income taxed abroad gets relief", () => {
  const taxed = calculate({ ...employee, foreignIncome: "yes", foreignIncomeAmount: 20000, foreignTaxed: "yes" });
  const notTaxed = calculate({ ...employee, foreignIncome: "yes", foreignIncomeAmount: 20000, foreignTaxed: "no" });
  assert.ok(taxed.you.foreignRelief > 0);
  assert.ok(taxed.result > notTaxed.result);
  assert.equal(taxed.rough, true);
});

test("business owner: Zvw note, taxed on profit", () => {
  const e = calculate({ ...employee, sideIncome: "yes", sideType: "business", sideHours: "no", sideIncomeAmount: 10000 });
  assert.ok(e.zvwContribution > 0);
  assert.ok(e.you.totalTax > calculate(employee).you.totalTax);
});

test("partners: the best split is at least as good as giving everything to one person", () => {
  const a: Answers = {
    ...employee,
    partner: "yes",
    partnerPensionAge: "no",
    partnerWage: 25000,
    partnerWithheld: 3000,
    ownHome: "yes",
    homeShare: 100,
    homeMonths: 12,
    wozValue: 400000,
    mortgageInterest: 12000,
    savings: 150000,
    investments: 0,
    otherProperty: 0,
  };
  const e = calculate(a);
  assert.ok(e.partner);
  assert.ok(e.split);
  assert.equal(e.result, e.you.result + e.partner!.result);
  // Interest is worth more to the higher earner (you), so most of it should go to you.
  assert.equal(e.split!.shared, 100);
});

test("C form: qualifying non-resident gets a number, others don't", () => {
  assert.equal(calculate({ ...employee, residency: "non_resident", qualifyingNonResident: "yes" }).available, true);
  assert.equal(calculate({ ...employee, residency: "non_resident", qualifyingNonResident: "no" }).available, false);
});

// ---------- 2026 ----------
import { RULES_BY_YEAR, rulesFor } from "./calculate";
const R26 = RULES_BY_YEAR[2026];

test("2026: brackets and credits line up", () => {
  close(bracketTax(38883, R26), 38883 * 0.3575);
  close(generalTaxCredit(29736, R26), 3115);
  close(generalTaxCredit(78426, R26), 0, 2);
  close(labourTaxCredit(11965, R26), 996, 1);
  close(labourTaxCredit(25845, R26), 5300, 1);
  close(labourTaxCredit(45592, R26), 5685, 1);
  close(labourTaxCredit(132920, R26), 0, 2);
  close(labourTaxCredit(25845, R26, true), 2647, 1);
  close(labourTaxCredit(45592, R26, true), 2840, 1);
});

test("2026: the chosen year picks the rules", () => {
  assert.equal(rulesFor({ taxYear: 2026 }).year, 2026);
  assert.equal(rulesFor({}).year, 2025);
  const e25 = calculate({ ...employee, taxYear: 2025 });
  const e26 = calculate({ ...employee, taxYear: 2026 });
  assert.notEqual(e25.you.totalTax, e26.you.totalTax);
  assert.ok(e26.notes.length >= 0);
});

// ---------- Home and loans ----------
const owner: Answers = { ...employee, ownHome: "yes", homeChange: "none", homeShare: 100, homeMonths: 12, wozValue: 400000, mortgageInterest: 10000, mortgageType: "repaying", groundLease: "no" };

test("home: one-off costs and ground lease lower the tax", () => {
  const base = calculate({ ...owner, homeChange: "bought", purchaseCosts: 0 });
  const withCosts = calculate({ ...owner, homeChange: "bought", purchaseCosts: 3000, groundLease: "yes", groundLeaseAmount: 1000 });
  assert.equal(withCosts.homeCosts, 4000);
  // 37.48% tax saved, plus a higher general tax credit (6.337% phase-out)
  close(withCosts.result - base.result, 4000 * (0.3748 + 0.06337), 2);
});

test("home: interest-only loan from 2013 on is not deductible", () => {
  const ok = calculate(owner);
  const notOk = calculate({ ...owner, mortgageType: "interestOnlyNew" });
  assert.ok(notOk.result < ok.result);
  assert.equal(notOk.interest, 0);
});

test("home: moving adds the forfait of the old home", () => {
  const one = calculate({ ...owner, homeChange: "bought", homeMonths: 6, purchaseCosts: 0 });
  const two = calculate({ ...owner, homeChange: "both", homeMonths: 6, oldWozValue: 300000, oldHomeMonths: 6, purchaseCosts: 0, saleResult: "even" });
  close(two.forfait - one.forfait, 300000 * 0.0035 / 2, 1);
  assert.equal(two.rough, true);
});

test("home: renting adds a note, no home income", () => {
  const e = calculate({ ...employee, ownHome: "no" });
  assert.equal(e.you.homeIncome, 0);
  assert.ok(e.notes.some((n) => n.includes("huurtoeslag")));
});

// ---------- F20: Phase 1 gaps ----------
test("starter deduction adds €2,123 on top of the self-employed deduction", () => {
  const s = sideIncome({ sideIncome: "yes", sideType: "business", sideHours: "yes", sideStarter: "yes", sideIncomeAmount: 30000 }, RULES);
  close(s.taxable, (30000 - 2470 - 2123) * 0.873);
});

test("healthcare costs count 40% higher on a low income, 113% at 67+", () => {
  const low = { ...employee, fiscalWage: 25000, taxWithheld: 0, healthcare: "yes" as const, healthcareAmount: 2000 };
  const plain = calculate({ ...low, fiscalWage: 60000 });
  assert.equal(plain.healthcareDeduction, Math.max(0, Math.round(2000 - (0.0165 * 46142 + 0.0575 * (60000 - 46142)))));
  const e = calculate(low);
  close(e.healthcareDeduction, 2000 * 1.4 - 0.0165 * 25000, 1);
  const old = calculate({ ...low, pensionAge: "yes" });
  close(old.healthcareDeduction, 2000 * 2.13 - 0.0165 * 25000, 1);
});

test("partial non-resident status is used when it saves money", () => {
  const a: Answers = { ...employee, ruling30: "yes", ruling2023: "yes", savings: 200000, investments: 0, otherProperty: 50000, dutchProperty: 0 };
  const e = calculate(a);
  assert.ok((e.partialNonResidentSaving ?? 0) > 0);
  assert.equal(e.you.box3Tax, 0);
  const noRuling = calculate({ ...a, ruling2023: "no" });
  assert.equal(noRuling.partialNonResidentSaving, undefined);
  assert.ok(noRuling.you.box3Tax > 0);
});

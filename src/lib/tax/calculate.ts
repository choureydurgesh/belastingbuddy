import type { Answers, Estimate, PersonResult, TaxRules } from "./types";
import rules2025 from "./rules/2025.json";

export const RULES: TaxRules = rules2025 as TaxRules;

const n = (v: number | undefined) => (typeof v === "number" && isFinite(v) ? Math.max(0, v) : 0);
const round = (v: number) => Math.round(v);
const credit = (income: number, c: { max: number; phaseOutStart: number; phaseOutRate: number }) =>
  Math.max(0, c.max - c.phaseOutRate * Math.max(0, income - c.phaseOutStart));

// ---------- Small building blocks (each one is tested) ----------

/** Tax on box 1 income using the brackets. `aow` = state pension age (lower first bracket). */
export function bracketTax(income: number, rules: TaxRules, aow = false): number {
  let tax = 0;
  let lower = 0;
  rules.box1.brackets.forEach((b, i) => {
    const upper = b.upTo ?? Infinity;
    const rate = aow && i === 0 ? rules.aow.box1FirstRate : b.rate;
    if (income > lower) tax += (Math.min(income, upper) - lower) * rate;
    lower = upper;
  });
  return tax;
}

/** Algemene heffingskorting (general tax credit). */
export function generalTaxCredit(income: number, rules: TaxRules, aow = false): number {
  return credit(income, aow ? rules.aow.generalTaxCredit : rules.generalTaxCredit);
}

/** Arbeidskorting (labour tax credit), based on income from work. */
export function labourTaxCredit(workIncome: number, rules: TaxRules, aow = false): number {
  if (workIncome <= 0) return 0;
  const bands = (aow ? rules.aow.labourTaxCredit : rules.labourTaxCredit).bands;
  for (const band of bands) {
    if (workIncome <= band.to) return Math.max(0, band.base + band.rate * (workIncome - band.from));
  }
  return 0;
}

/** Ouderenkorting (credit for people at state pension age). */
export function elderlyTaxCredit(income: number, rules: TaxRules): number {
  return credit(income, rules.aow.elderlyCredit);
}

/** Eigenwoningforfait: the fixed "income" you add for owning your home. */
export function homeForfait(woz: number, rules: TaxRules): number {
  if (woz <= 0) return 0;
  const top = rules.home.forfaitTop;
  if (woz > top.from) return top.base + top.rate * (woz - top.from);
  const band = rules.home.forfaitBands.find((b) => woz <= b.upTo);
  return band ? woz * band.rate : 0;
}

/** The minimum healthcare costs you pay yourself before you can deduct. */
export function healthcareThreshold(income: number, rules: TaxRules): number {
  const h = rules.healthcare;
  if (income <= h.lowIncomeLimit) return h.lowIncomeThreshold;
  if (income <= h.midIncomeLimit) return h.midRate * income;
  return h.midRate * h.midIncomeLimit + h.highRate * (income - h.midIncomeLimit);
}

/** Box 3: taxable benefit from savings and investments on 1 January. Partners get double allowances. */
export function box3(answers: Answers, rules: TaxRules, people = 1) {
  const r = rules.box3;
  const savings = n(answers.savings);
  const other = n(answers.investments) + n(answers.otherProperty);
  const debts = Math.max(0, n(answers.studentLoanAmount) + n(answers.otherDebts) - r.debtThreshold * people);
  const base = Math.max(0, savings + other - debts);
  const benefit = savings * r.returnSavings + other * r.returnOther - debts * r.returnDebts;
  if (base <= 0 || benefit <= 0) return { base, benefit: 0, tax: 0 };
  const taxableBenefit = (benefit / base) * Math.max(0, base - r.taxFreeAllowance * people);
  return { base, benefit: taxableBenefit, tax: taxableBenefit * r.rate };
}

/** Freelance or business profit: what is taxed, what counts as work income, and the healthcare contribution. */
export function sideIncome(answers: Answers, rules: TaxRules) {
  if (answers.sideIncome !== "yes") return { taxable: 0, work: 0, zvw: 0 };
  const profit = n(answers.sideIncomeAmount);
  if (answers.sideType !== "business") return { taxable: profit, work: profit, zvw: 0 };
  const b = rules.business;
  const afterDeduction = profit - (answers.sideHours === "yes" ? Math.min(b.selfEmployedDeduction, profit) : 0);
  const taxable = afterDeduction * (1 - b.smeExemptionRate);
  return { taxable, work: profit, zvw: b.zvwRate * Math.min(taxable, b.zvwMaxIncome) };
}

// ---------- Tax for one person ----------

interface PersonInput {
  wage: number;
  side: { taxable: number; work: number };
  foreign: number;
  foreignRelief: boolean;
  homeIncome: number;
  interest: number;
  deductions: number;
  box3Benefit: number;
  /** Part of the year at state pension age, 0 to 1. */
  aowShare: number;
  single: boolean;
  withheld: number;
  provisionalPaid: number;
  provisionalReceived: number;
}

export function personTax(p: PersonInput, rules: TaxRules): PersonResult {
  const income = p.wage + p.side.taxable + p.foreign + p.homeIncome;
  const box1Taxable = Math.max(0, income - p.deductions);

  // Deductions only give back the 37.48% rate, even in the 49.5% bracket.
  const brackets = rules.box1.brackets;
  const topStart = brackets[brackets.length - 2].upTo ?? 0;
  const topRate = brackets[brackets.length - 1].rate;
  const capped = (topRate - rules.box1.maxDeductionRate) * Math.min(p.interest + p.deductions, Math.max(0, box1Taxable - topStart));

  // Blend normal and pension-age rules by the part of the year at pension age.
  const f = p.aowShare;
  const mix = (normal: number, aow: number) => (1 - f) * normal + f * aow;
  let box1Tax = mix(bracketTax(box1Taxable, rules), bracketTax(box1Taxable, rules, true)) + capped;

  // Relief for income already taxed abroad (simple share method).
  let foreignRelief = 0;
  if (p.foreignRelief && p.foreign > 0 && box1Taxable > 0) {
    foreignRelief = box1Tax * Math.min(1, p.foreign / Math.max(p.foreign, income));
    box1Tax -= foreignRelief;
  }

  const box3Tax = p.box3Benefit * rules.box3.rate;
  const totalIncome = box1Taxable + p.box3Benefit;
  let generalCredit = mix(generalTaxCredit(box1Taxable, rules), generalTaxCredit(box1Taxable, rules, true));
  let labourCredit = mix(labourTaxCredit(p.wage + p.side.work, rules), labourTaxCredit(p.wage + p.side.work, rules, true));
  let elderlyCredit = f * (elderlyTaxCredit(totalIncome, rules) + (p.single ? rules.aow.singleElderlyCredit : 0));

  // Credits can't make your tax lower than zero.
  const before = box1Tax + box3Tax;
  const credits = generalCredit + labourCredit + elderlyCredit;
  if (credits > before && credits > 0) {
    const k = before / credits;
    generalCredit *= k;
    labourCredit *= k;
    elderlyCredit *= k;
  }
  const totalTax = Math.max(0, before - generalCredit - labourCredit - elderlyCredit);

  return {
    wage: round(p.wage),
    sideIncome: round(p.side.taxable),
    foreignIncome: round(p.foreign),
    homeIncome: round(p.homeIncome),
    deductions: round(p.deductions),
    box1Taxable: round(box1Taxable),
    box1Tax: round(box1Tax + foreignRelief),
    foreignRelief: round(foreignRelief),
    box3Benefit: round(p.box3Benefit),
    box3Tax: round(box3Tax),
    generalCredit: round(generalCredit),
    labourCredit: round(labourCredit),
    elderlyCredit: round(elderlyCredit),
    totalTax: round(totalTax),
    withheld: round(p.withheld),
    provisionalPaid: round(p.provisionalPaid),
    provisionalReceived: round(p.provisionalReceived),
    result: round(p.withheld + p.provisionalPaid - p.provisionalReceived - totalTax),
  };
}

// ---------- The full estimate ----------

export function calculate(answers: Answers, rules: TaxRules = RULES): Estimate {
  const notes: string[] = [];
  let available = true;
  let rough = false;
  const hasPartner = answers.partner === "yes";

  if (answers.residency === "non_resident") {
    if (answers.qualifyingNonResident === "yes") {
      rough = true;
      notes.push("C form: we used your Dutch income only. Savings (box 3) are left out, except Dutch property.");
    } else {
      available = false;
      notes.push("We can only estimate the C form if at least 90% of your income is taxed in the Netherlands. Your checklist and guide still work.");
    }
  }
  if (answers.residency === "moved_in" || answers.residency === "moved_out") {
    rough = true;
    notes.push("M form: we count only income from the months you lived here. The Belastingdienst may split some credits differently.");
  }
  if (answers.partner === "unsure") {
    notes.push("You weren't sure about a fiscal partner, so we calculated as if you have none.");
  }

  // 1. Income
  const wage = answers.hasJob === "yes" ? n(answers.fiscalWage) : 0;
  const withheld = answers.hasJob === "yes" ? n(answers.taxWithheld) : 0;
  const side = sideIncome(answers, rules);
  if (side.zvw > 0) {
    notes.push(`As a business owner you also pay a healthcare contribution (Zvw) of about €${round(side.zvw)}. It comes as a separate bill and is not in this result.`);
  }
  if (answers.sideIncome === "yes" && answers.sideType === "business") {
    notes.push("Business costs, starter deduction and investment deductions are not in this estimate. Enter profit after costs.");
  }
  const foreign = answers.residency !== "non_resident" && answers.foreignIncome === "yes" ? n(answers.foreignIncomeAmount) : 0;
  const foreignRelief = answers.foreignTaxed === "yes";
  if (foreign > 0) {
    rough = true;
    notes.push(
      foreignRelief
        ? "Income from abroad: we gave a simple estimate of the relief for tax paid abroad. The real relief depends on the tax treaty."
        : "Income from abroad: you said no tax was paid on it abroad, so we taxed it fully here.",
    );
  }

  // 2. Own home (shared between partners)
  let forfait = 0;
  let interest = 0;
  let homeIncome = 0;
  if (answers.ownHome === "yes") {
    const share = (answers.homeShare ?? 100) / 100;
    const months = Math.min(12, Math.max(1, answers.homeMonths ?? 12));
    forfait = homeForfait(n(answers.wozValue), rules) * share * (months / 12);
    interest = n(answers.mortgageInterest) * share;
    homeIncome = forfait - interest;
    // Little or no mortgage: part of the forfait is cancelled out ("Wet Hillen").
    if (homeIncome > 0) homeIncome *= 1 - rules.home.lowDebtDeductionRate;
  }

  // 3. Box 3 (only if you lived here on 1 January)
  const people = hasPartner ? 2 : 1;
  let b3 = { base: 0, benefit: 0, tax: 0 };
  if (answers.residency === "moved_in") {
    notes.push("You didn't live here on 1 January 2025, so box 3 usually doesn't apply this year.");
  } else if (answers.residency !== "non_resident") {
    b3 = box3(answers, rules, people);
  }
  if (answers.ruling2023 === "yes" && b3.base > 0) {
    notes.push("You may be able to choose partial non-resident status. Then savings abroad are not taxed. We didn't include this.");
  }

  // 4. Personal deductions, using the combined income of both partners
  const partnerWage = hasPartner ? n(answers.partnerWage) : 0;
  const thresholdIncome = Math.max(0, wage + side.taxable + foreign + homeIncome + partnerWage + b3.benefit);
  const alimonyDeduction = answers.alimony === "yes" ? n(answers.alimonyAmount) : 0;
  const healthcareDeduction =
    answers.healthcare === "yes" ? Math.max(0, n(answers.healthcareAmount) - healthcareThreshold(thresholdIncome, rules)) : 0;
  const g = rules.gifts;
  const giftsDeduction =
    answers.gifts === "yes"
      ? Math.min(
          Math.max(0, n(answers.giftsAmount) - Math.max(g.minThreshold, g.thresholdRate * thresholdIncome)),
          g.maxRate * thresholdIncome,
        )
      : 0;
  const deductions = alimonyDeduction + healthcareDeduction + giftsDeduction;

  // 5. Pension age
  const yourAow =
    answers.pensionAge === "yes" ? 1 : answers.pensionAge === "during" ? (12 - Math.min(12, Math.max(1, answers.turned67Month ?? 12))) / 12 : 0;
  if (answers.pensionAge === "during") {
    rough = true;
    notes.push("You turned 67 in 2025. We split the year into months before and after. The real amount can differ a little.");
  }

  const provisional = (who: "you" | "partner") => {
    const kind = who === "you" ? answers.provisional : answers.partnerProvisional;
    const amount = n(who === "you" ? answers.provisionalAmount : answers.partnerProvisionalAmount);
    return { paid: kind === "paid" ? amount : 0, received: kind === "received" ? amount : 0 };
  };

  const yourBase = {
    wage,
    side,
    foreign,
    foreignRelief,
    aowShare: yourAow,
    single: !hasPartner,
    withheld,
    provisionalPaid: provisional("you").paid,
    provisionalReceived: provisional("you").received,
  };

  // 6. Single: everything is yours
  if (!hasPartner) {
    const you = personTax({ ...yourBase, homeIncome, interest, deductions, box3Benefit: b3.benefit }, rules);
    return finish(you);
  }

  // 7. Partners: try different splits of the shared items and keep the best one
  const partnerBase = {
    wage: partnerWage,
    side: { taxable: 0, work: 0 },
    foreign: 0,
    foreignRelief: false,
    aowShare: answers.partnerPensionAge === "yes" ? 1 : 0,
    single: false,
    withheld: n(answers.partnerWithheld),
    provisionalPaid: provisional("partner").paid,
    provisionalReceived: provisional("partner").received,
  };
  const steps = [1, 0.5, 0];
  let best: { you: PersonResult; partner: PersonResult; shared: number; savings: number } | null = null;
  for (const s of steps) {
    for (const v of steps) {
      const you = personTax(
        { ...yourBase, homeIncome: homeIncome * s, interest: interest * s, deductions: deductions * s, box3Benefit: b3.benefit * v },
        rules,
      );
      const partner = personTax(
        {
          ...partnerBase,
          homeIncome: homeIncome * (1 - s),
          interest: interest * (1 - s),
          deductions: deductions * (1 - s),
          box3Benefit: b3.benefit * (1 - v),
        },
        rules,
      );
      if (!best || you.result + partner.result > best.you.result + best.partner.result + 0.5) {
        best = { you, partner, shared: s, savings: v };
      }
    }
  }
  notes.push(
    "With a fiscal partner you can split your home, deductions and savings between you. We picked the split that gives you the most back together.",
  );
  return finish(best!.you, best!.partner, { shared: best!.shared * 100, savings: best!.savings * 100 });

  function finish(you: PersonResult, partner?: PersonResult, split?: { shared: number; savings: number }): Estimate {
    return {
      available,
      rough,
      notes,
      you,
      partner,
      split,
      forfait: round(forfait),
      interest: round(interest),
      healthcareDeduction: round(healthcareDeduction),
      giftsDeduction: round(giftsDeduction),
      alimonyDeduction: round(alimonyDeduction),
      box3Base: round(b3.base),
      zvwContribution: round(side.zvw),
      result: you.result + (partner?.result ?? 0),
    };
  }
}

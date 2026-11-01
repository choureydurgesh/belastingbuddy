// The answers a user gives. Every field is optional because
// the user fills them in step by step.
export type Residency = "resident" | "moved_in" | "moved_out" | "non_resident";
export type YesNo = "yes" | "no" | "unsure";

export interface Answers {
  // Start check
  taxYear?: number;
  residency?: Residency;
  moveMonth?: number; // 1–12
  qualifyingNonResident?: YesNo; // C form only
  partner?: YesNo;
  pensionAge?: "yes" | "during" | "no";
  turned67Month?: number; // 1–12, when pensionAge = "during"

  // Income
  hasJob?: "yes" | "no";
  fiscalWage?: number;
  taxWithheld?: number;
  ruling30?: YesNo;
  ruling2023?: YesNo;
  foreignIncome?: "yes" | "no";
  foreignIncomeAmount?: number;
  foreignTaxed?: YesNo;
  sideIncome?: "yes" | "no";
  sideType?: "business" | "other";
  sideHours?: "yes" | "no";
  sideIncomeAmount?: number;
  provisional?: "none" | "received" | "paid";
  provisionalAmount?: number;

  // Fiscal partner
  partnerPensionAge?: "yes" | "no";
  partnerWage?: number;
  partnerWithheld?: number;
  partnerProvisional?: "none" | "received" | "paid";
  partnerProvisionalAmount?: number;

  // Home and loans
  ownHome?: "yes" | "no";
  homeChange?: "none" | "bought" | "sold" | "both";
  homeShare?: number; // 100 or 50
  homeMonths?: number; // 1–12
  wozValue?: number;
  oldWozValue?: number;
  oldHomeMonths?: number; // 1–12
  mortgageInterest?: number;
  mortgageType?: "repaying" | "interestOnlyOld" | "interestOnlyNew" | "unsure";
  purchaseCosts?: number;
  groundLease?: "yes" | "no";
  groundLeaseAmount?: number;
  saleResult?: "profit" | "loss" | "even";
  studentLoan?: "yes" | "no";
  studentLoanAmount?: number;
  otherDebts?: number;

  // Savings and investments (box 3)
  savings?: number;
  investments?: number;
  otherProperty?: number;

  // Deductions
  healthcare?: "yes" | "no";
  healthcareAmount?: number;
  gifts?: "yes" | "no";
  giftsAmount?: number;
  alimony?: "yes" | "no";
  alimonyAmount?: number;
}

interface Credit {
  max: number;
  phaseOutStart: number;
  phaseOutRate: number;
}
interface Bands {
  bands: { from: number; to: number; base: number; rate: number }[];
}

export interface TaxRules {
  year: number;
  note: string;
  deadline: string;
  box1: { brackets: { upTo: number | null; rate: number }[]; maxDeductionRate: number };
  generalTaxCredit: Credit;
  labourTaxCredit: Bands;
  home: {
    forfaitBands: { upTo: number; rate: number }[];
    forfaitTop: { from: number; base: number; rate: number };
    lowDebtDeductionRate: number;
  };
  box3: {
    taxFreeAllowance: number;
    debtThreshold: number;
    returnSavings: number;
    returnOther: number;
    returnDebts: number;
    rate: number;
  };
  healthcare: {
    lowIncomeLimit: number;
    lowIncomeThreshold: number;
    midIncomeLimit: number;
    midRate: number;
    highRate: number;
  };
  gifts: { minThreshold: number; thresholdRate: number; maxRate: number };
  aow: {
    box1FirstRate: number;
    generalTaxCredit: Credit;
    labourTaxCredit: Bands;
    elderlyCredit: Credit;
    singleElderlyCredit: number;
  };
  business: {
    selfEmployedDeduction: number;
    smeExemptionRate: number;
    hoursRequired: number;
    zvwRate: number;
    zvwMaxIncome: number;
  };
}

/** The tax for one person. */
export interface PersonResult {
  wage: number;
  sideIncome: number;
  foreignIncome: number;
  homeIncome: number;
  deductions: number;
  box1Taxable: number;
  box1Tax: number;
  foreignRelief: number;
  box3Benefit: number;
  box3Tax: number;
  generalCredit: number;
  labourCredit: number;
  elderlyCredit: number;
  totalTax: number;
  withheld: number;
  provisionalPaid: number;
  provisionalReceived: number;
  /** positive = refund, negative = pay */
  result: number;
}

export interface Estimate {
  /** false = we can't give a number for this situation yet */
  available: boolean;
  /** true = we give a number, but it is less exact */
  rough: boolean;
  notes: string[];
  you: PersonResult;
  partner?: PersonResult;
  /** With a partner: share (0–100) of home, deductions and savings given to "you" in the best split. */
  split?: { shared: number; savings: number };
  /** Home and deduction totals before splitting (for the breakdown). */
  forfait: number;
  interest: number;
  /** One-off mortgage costs and ground lease, deducted with the interest. */
  homeCosts: number;
  healthcareDeduction: number;
  giftsDeduction: number;
  alimonyDeduction: number;
  box3Base: number;
  /** Income-related healthcare contribution for business owners (a separate bill). */
  zvwContribution: number;
  /** Household total: positive = refund, negative = pay */
  result: number;
}

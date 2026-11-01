import type { Answers } from "./tax/types";
import { YEARS, yearOf } from "./tax/calculate";

export type SectionId = "start" | "income" | "partner" | "home" | "savings" | "deductions";

export const SECTIONS: { id: SectionId; title: string }[] = [
  { id: "start", title: "Start check" },
  { id: "income", title: "Income" },
  { id: "partner", title: "Your partner" },
  { id: "home", title: "Home and loans" },
  { id: "savings", title: "Savings" },
  { id: "deductions", title: "Deductions" },
];

export interface Option {
  value: string | number;
  label: string;
}

export interface Question {
  id: keyof Answers;
  section: SectionId;
  text: string;
  help?: string;
  kind: "choice" | "money" | "number";
  options?: Option[];
  min?: number;
  max?: number;
  /** Only ask this question when this returns true. */
  showIf?: (a: Answers) => boolean;
}

const yesNo: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const yesNoUnsure: Option[] = [...yesNo, { value: "unsure", label: "Not sure" }];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const isOwner = (a: Answers) => a.ownHome === "yes";
const livedHereJan1 = (a: Answers) => a.residency === "resident" || a.residency === "moved_out";

export const QUESTIONS: Question[] = [
  // ---------- F1 Start check ----------
  {
    id: "taxYear",
    section: "start",
    kind: "choice",
    text: "Which year are you filing for?",
    help: "You file in spring for the year before. For 2026, filing opens on 1 March 2027.",
    options: YEARS.map((y) => ({ value: y, label: String(y) })),
  },
  {
    id: "residency",
    section: "start",
    kind: "choice",
    text: "Where did you live in {year}?",
    help: "This decides which tax form you need: P form (lived here all year), M form (moved in or out) or C form (lived abroad).",
    options: [
      { value: "resident", label: "In the Netherlands, all year" },
      { value: "moved_in", label: "I moved to the Netherlands in {year}" },
      { value: "moved_out", label: "I moved away in {year}" },
      { value: "non_resident", label: "Abroad, but I earned money here" },
    ],
  },
  {
    id: "moveMonth",
    section: "start",
    kind: "choice",
    text: "In which month did you move?",
    help: "Use the month you registered (or deregistered) at your municipality.",
    options: MONTHS.map((m, i) => ({ value: i + 1, label: m })),
    showIf: (a) => a.residency === "moved_in" || a.residency === "moved_out",
  },
  {
    id: "qualifyingNonResident",
    section: "start",
    kind: "choice",
    text: "Did you live in the EU, EEA, Switzerland or the Caribbean Netherlands, and was at least 90% of your income taxed in the Netherlands?",
    help: "If yes, you are a 'qualifying non-resident'. You then get the same tax credits and deductions as residents.",
    options: yesNoUnsure,
    showIf: (a) => a.residency === "non_resident",
  },
  {
    id: "partner",
    section: "start",
    kind: "choice",
    text: "Did you have a fiscal partner in {year}?",
    help: "Yes if you were married or registered partners. Living together can also count, for example if you bought a home or have a child together.",
    options: yesNoUnsure,
  },
  {
    id: "pensionAge",
    section: "start",
    kind: "choice",
    text: "Were you 67 or older in {year}?",
    help: "67 is the Dutch state pension (AOW) age. Lower tax rates apply after it.",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes, all of {year}" },
      { value: "during", label: "I turned 67 during {year}" },
    ],
  },
  {
    id: "turned67Month",
    section: "start",
    kind: "choice",
    text: "In which month did you turn 67?",
    options: MONTHS.map((m, i) => ({ value: i + 1, label: m })),
    showIf: (a) => a.pensionAge === "during",
  },

  // ---------- F3 Income ----------
  {
    id: "hasJob",
    section: "income",
    kind: "choice",
    text: "Did you get a salary or benefit from a Dutch employer or agency in {year}?",
    help: "This includes a job, UWV benefits or a pension. You get a yearly statement (jaaropgaaf) for each one.",
    options: yesNo,
  },
  {
    id: "fiscalWage",
    section: "income",
    kind: "money",
    text: "What is your total fiscal wage for {year}?",
    help: "Find 'Fiscaal loon' on each jaaropgaaf and add them up. With the 30% ruling, this number already leaves out the tax-free part.",
    showIf: (a) => a.hasJob === "yes",
  },
  {
    id: "taxWithheld",
    section: "income",
    kind: "money",
    text: "How much tax was taken from your pay in {year}?",
    help: "Find 'Ingehouden loonheffing' on each jaaropgaaf and add them up.",
    showIf: (a) => a.hasJob === "yes",
  },
  {
    id: "ruling30",
    section: "income",
    kind: "choice",
    text: "Did you have the 30% ruling in {year}?",
    help: "A tax break for some expats: up to 30% of salary is paid tax-free. Your employer arranges it, and it is shown on your payslip.",
    options: yesNoUnsure,
  },
  {
    id: "ruling2023",
    section: "income",
    kind: "choice",
    text: "Did you already have the 30% ruling in December 2023?",
    help: "If so, you may still be able to choose 'partial non-resident' status until the end of 2026. That changes how your savings are taxed.",
    options: yesNoUnsure,
    showIf: (a) => a.ruling30 === "yes",
  },
  {
    id: "foreignIncome",
    section: "income",
    kind: "choice",
    text: "Did you earn money outside the Netherlands in {year}?",
    help: "For example salary from a job abroad. If you moved in {year}, only count the months you lived here. Property abroad comes later, under savings.",
    options: yesNo,
    showIf: (a) => a.residency !== "non_resident",
  },
  {
    id: "foreignIncomeAmount",
    section: "income",
    kind: "money",
    text: "How much, in euros, before tax?",
    help: "Convert from your local currency with the average {year} rate. A close estimate is fine.",
    showIf: (a) => a.residency !== "non_resident" && a.foreignIncome === "yes",
  },
  {
    id: "foreignTaxed",
    section: "income",
    kind: "choice",
    text: "Was tax paid on it in that country?",
    help: "If yes, you can usually get relief so you don't pay tax twice. Keep proof of the tax paid.",
    options: yesNoUnsure,
    showIf: (a) => a.residency !== "non_resident" && a.foreignIncome === "yes",
  },
  {
    id: "sideIncome",
    section: "income",
    kind: "choice",
    text: "Did you have freelance work or other side income in the Netherlands?",
    help: "For example as a self-employed person (zzp), or occasional paid work.",
    options: yesNo,
  },
  {
    id: "sideType",
    section: "income",
    kind: "choice",
    text: "What kind of side income was it?",
    help: "A business is registered at the KVK and has several clients. Otherwise it's 'other work', like a one-off job.",
    options: [
      { value: "business", label: "My own business (zzp, KVK)" },
      { value: "other", label: "Other paid work" },
    ],
    showIf: (a) => a.sideIncome === "yes",
  },
  {
    id: "sideHours",
    section: "income",
    kind: "choice",
    text: "Did you work at least 1,225 hours on your business in {year}?",
    help: "That's about 24 hours a week. If yes, you get an extra deduction (zelfstandigenaftrek).",
    options: yesNo,
    showIf: (a) => a.sideIncome === "yes" && a.sideType === "business",
  },
  {
    id: "sideStarter",
    section: "income",
    kind: "choice",
    text: "Did you start your business in the last 5 years?",
    help: "Starters get an extra deduction (startersaftrek), up to 3 times in the first 5 years. Answer no if you already used it 3 times.",
    options: yesNo,
    showIf: (a) => a.sideIncome === "yes" && a.sideType === "business" && a.sideHours === "yes",
  },
  {
    id: "sideIncomeAmount",
    section: "income",
    kind: "money",
    text: "What was your profit? That's income minus costs.",
    help: "Use your bookkeeping. Enter 0 if you made a loss.",
    showIf: (a) => a.sideIncome === "yes",
  },
  {
    id: "provisional",
    section: "income",
    kind: "choice",
    text: "Did you get a provisional assessment (voorlopige aanslag) for {year}?",
    help: "Many homeowners get one. It means you got money back every month, or paid every month, during {year}.",
    options: [
      { value: "none", label: "No" },
      { value: "received", label: "Yes, I got money back" },
      { value: "paid", label: "Yes, I paid money" },
    ],
  },
  {
    id: "provisionalAmount",
    section: "income",
    kind: "money",
    text: "What was the total amount for {year}?",
    help: "It is on the letter from the Belastingdienst, or in Mijn Belastingdienst.",
    showIf: (a) => a.provisional === "received" || a.provisional === "paid",
  },

  // ---------- Fiscal partner ----------
  {
    id: "partnerPensionAge",
    section: "partner",
    kind: "choice",
    text: "Was your partner 67 or older for all of {year}?",
    options: yesNo,
    showIf: (a) => a.partner === "yes",
  },
  {
    id: "partnerWage",
    section: "partner",
    kind: "money",
    text: "What is your partner's total fiscal wage for {year}?",
    help: "From your partner's jaaropgaaf ('Fiscaal loon'). Enter 0 if they had no income.",
    showIf: (a) => a.partner === "yes",
  },
  {
    id: "partnerWithheld",
    section: "partner",
    kind: "money",
    text: "How much tax was taken from your partner's pay?",
    help: "'Ingehouden loonheffing' on their jaaropgaaf. Enter 0 if none.",
    showIf: (a) => a.partner === "yes",
  },
  {
    id: "partnerProvisional",
    section: "partner",
    kind: "choice",
    text: "Did your partner get a provisional assessment (voorlopige aanslag) for {year}?",
    options: [
      { value: "none", label: "No" },
      { value: "received", label: "Yes, they got money back" },
      { value: "paid", label: "Yes, they paid money" },
    ],
    showIf: (a) => a.partner === "yes",
  },
  {
    id: "partnerProvisionalAmount",
    section: "partner",
    kind: "money",
    text: "What was the total amount for your partner?",
    showIf: (a) => a.partner === "yes" && (a.partnerProvisional === "received" || a.partnerProvisional === "paid"),
  },

  // ---------- F4 Home and loans ----------
  // Order follows the "Eigen woning" part of the Belastingdienst return:
  // own or rent → bought/sold → share and months → WOZ → mortgage → one-off costs → ground lease.
  {
    id: "ownHome",
    section: "home",
    kind: "choice",
    text: "Did you rent or own the home you lived in during {year}?",
    help: "If you owned it for part of the year, choose 'I owned it'.",
    options: [
      { value: "no", label: "I rented, or lived with others" },
      { value: "yes", label: "I owned it" },
    ],
  },
  {
    id: "homeChange",
    section: "home",
    kind: "choice",
    text: "Did you buy or sell a home in {year}?",
    help: "Use the date you signed at the notary, not the date you agreed the price.",
    options: [
      { value: "none", label: "No" },
      { value: "bought", label: "I bought one" },
      { value: "sold", label: "I sold one" },
      { value: "both", label: "I sold one and bought another" },
    ],
    showIf: isOwner,
  },
  {
    id: "homeShare",
    section: "home",
    kind: "choice",
    text: "How much of the home is yours?",
    help: "With a fiscal partner, count what you own together.",
    options: [
      { value: 100, label: "All of it" },
      { value: 50, label: "Half" },
    ],
    showIf: isOwner,
  },
  {
    id: "homeMonths",
    section: "home",
    kind: "number",
    text: "For how many months of {year} did you own and live in your (new) home?",
    help: "Count from the month you got the keys. If you sold your only home, count the months until the sale.",
    min: 1,
    max: 12,
    showIf: isOwner,
  },
  {
    id: "wozValue",
    section: "home",
    kind: "money",
    text: "What is the WOZ value of that home?",
    help: "It's on the WOZ letter (WOZ-beschikking) from your municipality, dated early {year}. Just bought it? The seller's letter or the municipality's website (wozwaardeloket.nl) shows it. Use the full value, not your share.",
    showIf: isOwner,
  },
  {
    id: "oldWozValue",
    section: "home",
    kind: "money",
    text: "What is the WOZ value of the home you sold?",
    help: "From the WOZ letter for that home, dated early {year}.",
    showIf: (a) => isOwner(a) && a.homeChange === "both",
  },
  {
    id: "oldHomeMonths",
    section: "home",
    kind: "number",
    text: "For how many months of {year} did you still own the home you sold?",
    help: "Count until the month you signed the sale at the notary. If it stood empty and for sale, those months count too.",
    min: 1,
    max: 12,
    showIf: (a) => isOwner(a) && a.homeChange === "both",
  },
  {
    id: "mortgageInterest",
    section: "home",
    kind: "money",
    text: "How much mortgage interest was paid in {year}?",
    help: "It's on the yearly statement from your bank (jaaroverzicht). Use the full amount, not your share. If you moved, add up the interest for both homes. Enter 0 if you have no mortgage.",
    showIf: isOwner,
  },
  {
    id: "mortgageType",
    section: "home",
    kind: "choice",
    text: "How is your mortgage paid off?",
    help: "Interest is only deductible if you pay off the loan within 30 years (annuity or linear). Interest-only loans from before 2013 are still allowed. Your bank's statement or offer shows the type.",
    options: [
      { value: "repaying", label: "Annuity or linear (I pay it off)" },
      { value: "interestOnlyOld", label: "Interest-only, from before 2013" },
      { value: "interestOnlyNew", label: "Interest-only, from 2013 or later" },
      { value: "unsure", label: "I don't know" },
    ],
    showIf: (a) => isOwner(a) && (a.mortgageInterest ?? 0) > 0,
  },
  {
    id: "purchaseCosts",
    section: "home",
    kind: "money",
    text: "How much did you pay in one-off costs to get your mortgage?",
    help: "These count: mortgage advisor fee, notary costs for the mortgage deed, valuation report (taxatie) and the NHG fee. These don't: transfer tax, notary costs for the purchase deed, estate agent. Your notary's statement (nota van afrekening) lists them. Enter 0 if none.",
    showIf: (a) => isOwner(a) && (a.homeChange === "bought" || a.homeChange === "both"),
  },
  {
    id: "groundLease",
    section: "home",
    kind: "choice",
    text: "Do you pay ground lease (erfpacht) for the land?",
    help: "Common in Amsterdam and some other cities. You pay the city a yearly fee (canon) for the land under your home.",
    options: yesNo,
    showIf: isOwner,
  },
  {
    id: "groundLeaseAmount",
    section: "home",
    kind: "money",
    text: "How much ground lease did you pay in {year}?",
    help: "Only the yearly fee (canon). A one-off buyout doesn't count.",
    showIf: (a) => isOwner(a) && a.groundLease === "yes",
  },
  {
    id: "saleResult",
    section: "home",
    kind: "choice",
    text: "When you sold, was the price more than the mortgage left on that home?",
    help: "This changes how much of a new mortgage is deductible, or what happens to any debt left over.",
    options: [
      { value: "profit", label: "Yes, I made a profit" },
      { value: "loss", label: "No, some debt was left" },
      { value: "even", label: "About the same" },
    ],
    showIf: (a) => isOwner(a) && (a.homeChange === "sold" || a.homeChange === "both"),
  },
  {
    id: "studentLoan",
    section: "home",
    kind: "choice",
    text: "Did you have a student loan on 1 January {year}?",
    help: "From DUO or from a lender abroad. It isn't deductible, but it counts as a debt for your savings tax.",
    options: yesNo,
    showIf: livedHereJan1,
  },
  {
    id: "studentLoanAmount",
    section: "home",
    kind: "money",
    text: "How much was left on it on 1 January {year}?",
    help: "Mijn DUO shows the amount. Or use the yearly overview from your lender.",
    showIf: (a) => livedHereJan1(a) && a.studentLoan === "yes",
  },
  {
    id: "otherDebts",
    section: "home",
    kind: "money",
    text: "Any other debts on 1 January {year}?",
    help: "For example a personal loan, car loan or credit card. Don't include your home mortgage. With a partner, enter both. Enter 0 if none.",
    showIf: livedHereJan1,
  },

  // ---------- F5 Savings and investments (box 3) ----------
  {
    id: "savings",
    section: "savings",
    kind: "money",
    text: "How much was in your bank and savings accounts on 1 January {year}?",
    help: "Add up all accounts, also the ones abroad. With a fiscal partner, enter what you have together. Enter 0 if none.",
    showIf: livedHereJan1,
  },
  {
    id: "investments",
    section: "savings",
    kind: "money",
    text: "What were your shares, funds and crypto worth on 1 January {year}?",
    help: "Use the value from your broker or exchange statement. With a fiscal partner, enter the total for both of you. Enter 0 if none.",
    showIf: livedHereJan1,
  },
  {
    id: "otherProperty",
    section: "savings",
    kind: "money",
    text: "Did you own any other property on 1 January {year}? Enter its value.",
    help: "For example a second home or a home you rent out, here or abroad. Enter 0 if none.",
    showIf: livedHereJan1,
  },
  {
    id: "dutchProperty",
    section: "savings",
    kind: "money",
    text: "How much of that property is in the Netherlands?",
    help: "With the 30% ruling from before 2024 you may choose partial non-resident status. Then only Dutch property is taxed here. We work out if that saves you money. Enter 0 if it's all abroad.",
    showIf: (a) => livedHereJan1(a) && a.ruling2023 === "yes" && yearOf(a) <= 2026 && (a.otherProperty ?? 0) > 0,
  },

  // ---------- F6 Deductions ----------
  {
    id: "healthcare",
    section: "deductions",
    kind: "choice",
    text: "Did you pay healthcare costs yourself that insurance didn't cover?",
    help: "For example some medicines, aids or travel to hospital. Your 'eigen risico' and regular doctor or dentist bills don't count.",
    options: yesNo,
  },
  {
    id: "healthcareAmount",
    section: "deductions",
    kind: "money",
    text: "How much did you pay in total?",
    showIf: (a) => a.healthcare === "yes",
  },
  {
    id: "gifts",
    section: "deductions",
    kind: "choice",
    text: "Did you give money to a registered charity (ANBI)?",
    help: "Only gifts to organisations with ANBI status count. You can check this on the Belastingdienst website.",
    options: yesNo,
  },
  {
    id: "giftsAmount",
    section: "deductions",
    kind: "money",
    text: "How much did you give in total?",
    showIf: (a) => a.gifts === "yes",
  },
  {
    id: "alimony",
    section: "deductions",
    kind: "choice",
    text: "Did you pay alimony to an ex-partner?",
    help: "Only alimony for your ex-partner counts. Child support does not.",
    options: yesNo,
  },
  {
    id: "alimonyAmount",
    section: "deductions",
    kind: "money",
    text: "How much did you pay in {year}?",
    showIf: (a) => a.alimony === "yes",
  },
];

export const visibleQuestions = (a: Answers) => QUESTIONS.filter((q) => !q.showIf || q.showIf(a));

/** Drops answers to questions that no longer apply (for example after the user changed an earlier answer). */
export function cleanAnswers(a: Answers): Answers {
  const out: Answers = {};
  for (const q of visibleQuestions(a)) {
    if (a[q.id] !== undefined) (out as Record<string, unknown>)[q.id] = a[q.id];
  }
  return out;
}

/** The first question the user hasn't answered yet, or null when done. */
export function nextQuestion(a: Answers): Question | null {
  return visibleQuestions(a).find((q) => a[q.id] === undefined) ?? null;
}

/** Text for showing an answer back to the user. */
export function answerLabel(q: Question, value: unknown): string {
  if (q.kind === "money") return formatEuro(Number(value));
  const opt = q.options?.find((o) => o.value === value);
  return opt ? opt.label : String(value);
}

export function formatEuro(v: number): string {
  return "€ " + Math.round(v).toLocaleString("nl-NL");
}

/** Puts the chosen tax year into a question's text. */
export function withYear(text: string, a: Answers): string {
  const y = yearOf(a);
  return text.split("{year}").join(String(y));
}

import type { Answers } from "./tax/types";

export interface ChecklistItem {
  id: string;
  title: string;
  where: string;
}

/** F7: the papers this user needs, based on their answers. */
export function buildChecklist(a: Answers): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { id: "digid", title: "Your DigiD login (app)", where: "digid.nl – you need it to log in to Mijn Belastingdienst." },
  ];
  if (a.residency === "moved_in" || a.residency === "moved_out") {
    items.push({
      id: "mform",
      title: "The M form (migration form)",
      where: "Check Mijn Belastingdienst, or request it from the Belastingdienst if you didn't get it.",
    });
    items.push({ id: "move-date", title: "Your exact moving date", where: "From your municipality registration (BRP)." });
  }
  if (a.residency === "non_resident") {
    items.push({ id: "cform", title: "The C form (non-residents)", where: "Mijn Belastingdienst, under 'buitenlandse belastingplichtigen'." });
  }
  if (a.hasJob === "yes") {
    items.push({ id: "jaaropgaaf", title: "A jaaropgaaf from every employer or agency", where: "From your employer, UWV or pension fund. Often in your payroll app." });
  }
  if (a.partner === "yes") {
    items.push({ id: "partner", title: "Your partner's jaaropgaaf and DigiD", where: "You file together, so you need their numbers too." });
  }
  if (a.residency === "non_resident" && a.qualifyingNonResident !== "no") {
    items.push({ id: "income-statement", title: "Proof of your worldwide income (Inkomensverklaring)", where: "Get it signed by the tax office where you live. You need it to be a qualifying non-resident." });
  }
  if (a.ruling30 === "yes" || a.ruling30 === "unsure") {
    items.push({ id: "ruling", title: "Your 30% ruling decision letter", where: "Ask your employer or HR if you don't have it." });
  }
  if (a.foreignIncome === "yes") {
    items.push({ id: "foreign", title: "Proof of income abroad and tax paid there", where: "Payslips, foreign tax returns or tax assessments." });
  }
  if (a.sideIncome === "yes") {
    items.push({ id: "side", title: "Your income and costs from side work", where: "Your invoices and bookkeeping." });
    if (a.sideType === "business") {
      items.push({ id: "hours", title: "Your hours log for the business", where: "Needed if you claim the 1,225-hour deduction (zelfstandigenaftrek)." });
    }
  }
  if (a.provisional === "received" || a.provisional === "paid") {
    items.push({ id: "provisional", title: "Your provisional assessment letter (voorlopige aanslag)", where: "Mijn Belastingdienst or the letter by post." });
  }
  if (a.ownHome === "yes") {
    items.push({ id: "woz", title: "WOZ letter (WOZ-beschikking)", where: "From your municipality, often in MijnOverheid." });
    items.push({ id: "mortgage", title: "Mortgage yearly statement (jaaroverzicht)", where: "From your bank or mortgage provider." });
  }
  if (a.studentLoan === "yes") {
    items.push({ id: "duo", title: "Student loan balance on 1 January 2025", where: "Mijn DUO, or your lender's yearly overview." });
  }
  if ((a.otherDebts ?? 0) > 0) {
    items.push({ id: "debts", title: "Statements for your other debts", where: "From your lender or credit card provider." });
  }
  if ((a.savings ?? 0) > 0) {
    items.push({ id: "bank", title: "Bank balances on 1 January 2025", where: "Yearly statements from every bank, also abroad." });
  }
  if ((a.investments ?? 0) > 0) {
    items.push({ id: "invest", title: "Investment values on 1 January 2025", where: "Yearly statement from your broker or crypto exchange." });
  }
  if ((a.otherProperty ?? 0) > 0) {
    items.push({ id: "property", title: "Value of your other property", where: "WOZ letter, or a valuation for property abroad." });
  }
  if (a.healthcare === "yes") {
    items.push({ id: "health", title: "Receipts for healthcare costs", where: "Bills, and what your insurer paid back." });
  }
  if (a.gifts === "yes") {
    items.push({ id: "gifts", title: "Proof of gifts to charities", where: "Bank statements or receipts from the charity." });
  }
  if (a.alimony === "yes") {
    items.push({ id: "alimony", title: "Alimony agreement and payments", where: "Your court order or agreement, plus bank statements." });
  }
  return items;
}

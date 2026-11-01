import type { Answers, Estimate } from "./tax/types";
import { yearOf } from "./tax/calculate";
import { formatEuro } from "./questions";

export interface GuideStep {
  title: string;
  /** Dutch name of the section in Mijn Belastingdienst */
  dutch: string;
  lines: { label: string; value?: string }[];
}

/** F9: what to check or type in Mijn Belastingdienst, in order. */
export function buildGuide(a: Answers, e: Estimate): GuideStep[] {
  const y = yearOf(a);
  const steps: GuideStep[] = [];

  steps.push({
    title: `Log in and open your ${y} return`,
    dutch: `Aangifte inkomstenbelasting ${y}`,
    lines: [
      { label: "Go to Mijn Belastingdienst and log in with DigiD." },
      {
        label:
          a.residency === "moved_in" || a.residency === "moved_out"
            ? "Choose the M form (migration year)."
            : a.residency === "non_resident"
              ? "Choose the return for non-residents (C form)."
              : `Choose the normal ${y} return.`,
      },
      ...(a.partner === "yes" ? [{ label: "Choose to file together with your fiscal partner. It's usually easier." }] : []),
    ],
  });

  if (a.hasJob === "yes") {
    steps.push({
      title: "Check your income",
      dutch: "Loon, uitkeringen en pensioenen",
      lines: [
        { label: "This is usually filled in already. Compare it with your jaaropgaaf." },
        { label: "Fiscal wage (fiscaal loon)", value: formatEuro(e.you.wage) },
        { label: "Tax withheld (ingehouden loonheffing)", value: formatEuro(e.you.withheld) },
        ...(e.partner
          ? [
              { label: "Your partner's fiscal wage", value: formatEuro(e.partner.wage) },
              { label: "Your partner's tax withheld", value: formatEuro(e.partner.withheld) },
            ]
          : []),
      ],
    });
  }
  if (a.sideIncome === "yes") {
    const business = a.sideType === "business";
    steps.push({
      title: business ? "Fill in your business profit" : "Fill in your other work",
      dutch: business ? "Winst uit onderneming" : "Resultaat uit overige werkzaamheden",
      lines: [
        { label: "Profit (income minus costs)", value: formatEuro(a.sideIncomeAmount ?? 0) },
        ...(business
          ? [
              { label: a.sideHours === "yes" ? "Tick that you met the hours rule (urencriterium)." : "Don't tick the hours rule (urencriterium)." },
              { label: "The SME profit exemption (mkb-winstvrijstelling) is applied for you." },
            ]
          : []),
      ],
    });
  }
  if (a.foreignIncome === "yes") {
    steps.push({
      title: "Add your income from abroad",
      dutch: "Inkomsten uit het buitenland",
      lines: [
        { label: "Income abroad, before tax", value: formatEuro(a.foreignIncomeAmount ?? 0) },
        {
          label:
            a.foreignTaxed === "yes"
              ? "Ask for relief from double taxation (voorkoming dubbele belasting). Fill in the country and the amount."
              : "If tax was paid abroad after all, ask for relief. Keep proof.",
        },
      ],
    });
  }
  if (a.ownHome === "yes") {
    const moved = a.homeChange === "both";
    const bought = a.homeChange === "bought" || moved;
    steps.push({
      title: "Fill in your home",
      dutch: "Eigen woning",
      lines: [
        { label: "WOZ value (full home)", value: formatEuro(a.wozValue ?? 0) },
        ...(moved
          ? [
              { label: "WOZ value of the home you sold", value: formatEuro(a.oldWozValue ?? 0) },
              { label: "Add both homes, each with its own dates." },
            ]
          : []),
        { label: "Mortgage interest paid (full amount)", value: formatEuro(a.mortgageInterest ?? 0) },
        ...(a.mortgageType === "interestOnlyNew"
          ? [{ label: "Don't deduct this interest. Report the loan under box 3 debts." }]
          : []),
        ...(bought && (a.purchaseCosts ?? 0) > 0
          ? [{ label: "One-off mortgage costs (financieringskosten)", value: formatEuro(a.purchaseCosts ?? 0) }]
          : []),
        ...(a.groundLease === "yes"
          ? [{ label: "Ground lease paid (erfpachtcanon)", value: formatEuro(a.groundLeaseAmount ?? 0) }]
          : []),
        { label: "Your share of the home", value: `${a.homeShare ?? 100}%` },
        ...(bought
          ? [{ label: "Mijn Belastingdienst asks if you used profit from an earlier home. Answer with your notary statements at hand." }]
          : []),
        { label: "Check the bank details are already filled in. Interest is often pre-filled." },
      ],
    });
  }
  if (e.box3Base > 0 || (a.studentLoanAmount ?? 0) > 0 || (a.otherDebts ?? 0) > 0) {
    steps.push({
      title: "Fill in savings, investments and debts",
      dutch: "Bankrekeningen, beleggingen en schulden (box 3)",
      lines: [
        { label: "Bank and savings on 1 January", value: formatEuro(a.savings ?? 0) },
        { label: "Shares, funds and crypto on 1 January", value: formatEuro(a.investments ?? 0) },
        ...((a.otherProperty ?? 0) > 0 ? [{ label: "Other property", value: formatEuro(a.otherProperty ?? 0) }] : []),
        ...((a.studentLoanAmount ?? 0) > 0 ? [{ label: "Student loan on 1 January", value: formatEuro(a.studentLoanAmount ?? 0) }] : []),
        ...((a.otherDebts ?? 0) > 0 ? [{ label: "Other debts on 1 January", value: formatEuro(a.otherDebts ?? 0) }] : []),
        { label: "Dutch bank accounts are often pre-filled. Add accounts abroad yourself." },
        ...(a.ruling2023 === "yes"
          ? [{ label: "You may be able to choose partial non-resident status. Ask a tax advisor before you file." }]
          : []),
      ],
    });
  }
  const deductions: GuideStep["lines"] = [];
  if (a.healthcare === "yes") deductions.push({ label: "Healthcare costs you paid (specifieke zorgkosten)", value: formatEuro(a.healthcareAmount ?? 0) });
  if (a.gifts === "yes") deductions.push({ label: "Gifts to charities (giften)", value: formatEuro(a.giftsAmount ?? 0) });
  if (a.alimony === "yes") deductions.push({ label: "Alimony paid (partneralimentatie)", value: formatEuro(a.alimonyAmount ?? 0) });
  if (deductions.length) {
    if (e.split) deductions.push({ label: "Give this share of the deductions to you (the rest to your partner)", value: `${e.split.shared}%` });
    steps.push({ title: "Add your deductions", dutch: "Aftrekposten", lines: deductions });
  }
  if (e.split) {
    steps.push({
      title: "Split shared items with your partner",
      dutch: "Verdelen met uw fiscale partner",
      lines: [
        { label: "Home and deductions: your share", value: `${e.split.shared}%` },
        { label: "Savings and investments (box 3): your share", value: `${e.split.savings}%` },
        { label: "Mijn Belastingdienst often suggests the best split itself. Compare it with ours." },
      ],
    });
  }
  steps.push({
    title: "Check the result and send",
    dutch: "Overzicht en verzenden",
    lines: [
      { label: "Compare the final amount with our estimate. A big difference means something is missing." },
      { label: "Download a copy (PDF) for your records, then send." },
    ],
  });
  return steps;
}

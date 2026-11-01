// F15: plain-English help articles. Each article is data, so adding one is just a new entry here.

export type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "note"; text: string };

export interface Guide {
  slug: string;
  title: string;
  /** One sentence for Google and the guide list. */
  summary: string;
  checked: string; // date the facts were last checked
  sections: { heading: string; blocks: Block[] }[];
  sources: { title: string; url: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "30-percent-ruling",
    title: "The 30% ruling, explained",
    summary: "What the Dutch 30% ruling is, who gets it, what changes in 2027, and what it means for your tax return.",
    checked: "1 November 2026",
    sections: [
      {
        heading: "What it is",
        blocks: [
          { type: "p", text: "The 30% ruling is a tax break for people recruited from abroad. Your employer can pay up to 30% of your salary tax-free, to cover the extra costs of moving here." },
          { type: "p", text: "Your employer applies for it, together with you. The Belastingdienst decides." },
        ],
      },
      {
        heading: "Who can get it",
        blocks: [
          {
            type: "list",
            items: [
              "You were hired or sent from abroad to work in the Netherlands.",
              "In the 2 years before you started, you lived more than 150 km from the Dutch border for more than 16 of those 24 months.",
              "Your taxable salary is above the minimum: €48,013 in 2026, or €36,497 if you are under 30 and have a master's degree.",
            ],
          },
          { type: "p", text: "You can have the ruling for at most 5 years. Earlier time you lived or worked here in the last 25 years is taken off." },
        ],
      },
      {
        heading: "What changes",
        blocks: [
          {
            type: "table",
            head: ["Year", "Tax-free part", "Good to know"],
            rows: [
              ["2025 and 2026", "30%", "Calculated over salary up to €262,000 (2026)."],
              ["From 2027", "27%", "If you already had the ruling in December 2023, you keep 30% until your ruling ends."],
            ],
          },
        ],
      },
      {
        heading: "Partial non-resident status",
        blocks: [
          { type: "p", text: "This option lets you be taxed as a non-resident for your savings and investments (box 3). Savings and investments abroad are then not taxed here." },
          { type: "p", text: "It was ended in 2025. If you already had the 30% ruling in December 2023, you can still choose it on your 2025 and 2026 tax returns. From 2027 it is gone for everyone." },
          { type: "note", text: "Choosing it is not always better. If you have Dutch savings or a home abroad, ask a tax advisor before you choose." },
        ],
      },
      {
        heading: "In your tax return",
        blocks: [
          { type: "p", text: "The fiscal wage (fiscaal loon) on your jaaropgaaf already leaves out the tax-free part. Use that number as it is. Don't take 30% off again." },
          { type: "p", text: "BelastingBuddy asks about the ruling and adds the right papers to your checklist." },
        ],
      },
    ],
    sources: [
      { title: "Forvis Mazars – Dutch expat ruling in 2026 and 2027", url: "https://www.forvismazars.com/nl/en/who-we-are/news-events-and-publications/news/dutch-expat-ruling-in-2026-and-2027" },
      { title: "The Hague International Centre – Income tax return FAQ", url: "https://www.thehagueinternationalcentre.nl/news/2026-04/income-tax-return-in-the-netherlands-frequently-asked-questions" },
    ],
  },
  {
    slug: "m-form",
    title: "The M form: your tax return in the year you moved",
    summary: "Moved to or from the Netherlands? Here's what the M form is, when to file it, and what you need.",
    checked: "1 November 2026",
    sections: [
      {
        heading: "What it is",
        blocks: [
          { type: "p", text: "The M form (M-biljet) is the tax return for the year you moved to or away from the Netherlands. M stands for migration." },
          { type: "p", text: "It covers the whole year in one form, split into two parts: the months you lived here, and the months you lived abroad." },
        ],
      },
      {
        heading: "When to file",
        blocks: [
          {
            type: "table",
            head: ["Tax year", "File between", "More time"],
            rows: [["2025", "1 May and 1 July 2026", "Ask before 1 July. You then have until 1 November 2026."]],
          },
          { type: "note", text: "For the 2026 tax year, check the letter from the Belastingdienst for your dates." },
        ],
      },
      {
        heading: "How to file",
        blocks: [
          {
            type: "steps",
            items: [
              "Log in to Mijn Belastingdienst with DigiD.",
              "Go to Inkomstenbelasting, then Belastingaangifte, then the right year.",
              "Choose the form for people who lived outside the Netherlands for part of the year.",
            ],
          },
          { type: "p", text: "No DigiD? You can file on paper with form M. You can ask the Belastingdienst to send it." },
        ],
      },
      {
        heading: "What you need",
        blocks: [
          {
            type: "list",
            items: [
              "Your exact moving date, as registered at your municipality.",
              "Your Dutch jaaropgaaf, from your employer.",
              "Your income from abroad for the months you lived here.",
              "Your savings and investments on 1 January, but only if you lived here on that day.",
            ],
          },
        ],
      },
      {
        heading: "Common mistakes",
        blocks: [
          {
            type: "list",
            items: [
              "Filing the normal P form instead. You may miss money back.",
              "Reporting box 3 savings when you didn't live here on 1 January.",
              "Forgetting income from abroad earned after you moved here.",
            ],
          },
          { type: "p", text: "BelastingBuddy spots that you moved and guides you through the M form." },
        ],
      },
    ],
    sources: [
      { title: "Belastingdienst – Filing your M return", url: "https://www.belastingdienst.nl/wps/wcm/connect/bldcontenten/themaoverstijgend/applications_and_forms/order-m-form-2020" },
      { title: "The Hague International Centre – Income tax return FAQ", url: "https://www.thehagueinternationalcentre.nl/news/2026-04/income-tax-return-in-the-netherlands-frequently-asked-questions" },
    ],
  },
  {
    slug: "box-3",
    title: "Box 3: tax on your savings and investments",
    summary: "How the Netherlands taxes savings, shares and crypto, the tax-free amount, and a worked example.",
    checked: "1 November 2026",
    sections: [
      {
        heading: "What counts",
        blocks: [
          {
            type: "list",
            items: [
              "Bank and savings accounts, also abroad.",
              "Shares, funds and crypto.",
              "A second home or a home you rent out.",
              "Minus debts, like a personal loan or student loan. Your home mortgage does not count here.",
            ],
          },
          { type: "p", text: "What matters is the value on 1 January of the tax year. Changes later in the year don't count." },
        ],
      },
      {
        heading: "The tax-free amount",
        blocks: [
          {
            type: "table",
            head: ["Year", "Tax-free per person", "With a fiscal partner"],
            rows: [
              ["2025", "€57,684", "€115,368"],
              ["2026", "€59,357", "€118,714"],
            ],
          },
          { type: "p", text: "The first €3,800 of debts per person also doesn't count." },
        ],
      },
      {
        heading: "How the tax is worked out",
        blocks: [
          { type: "p", text: "The Belastingdienst assumes a return on what you own, then taxes that return at 36%." },
          {
            type: "table",
            head: ["Assumed return", "2025", "2026"],
            rows: [
              ["Bank and savings", "1.37%", "1.28% (provisional)"],
              ["Shares, crypto, property", "5.88%", "6.00%"],
              ["Debts", "2.70%", "2.70%"],
            ],
          },
        ],
      },
      {
        heading: "Example: €100,000 in savings in 2025",
        blocks: [
          {
            type: "steps",
            items: [
              "Assumed return: 1.37% of €100,000 = €1,370.",
              "Part above the tax-free amount: €100,000 − €57,684 = €42,316, which is 42.3% of the total.",
              "Taxable return: 42.3% of €1,370 = €580.",
              "Tax: 36% of €580 = about €209.",
            ],
          },
        ],
      },
      {
        heading: "If your real return was lower",
        blocks: [
          { type: "p", text: "For 2025 and 2026 you can also report your actual return, for example if your shares went down. The Belastingdienst then uses whichever gives you the lower tax." },
          { type: "note", text: "This is optional. Mijn Belastingdienst asks about it when your savings are above the tax-free amount." },
        ],
      },
      {
        heading: "Expats",
        blocks: [
          { type: "p", text: "If you live here, savings and investments abroad count too. If you had the 30% ruling in December 2023, you may be able to leave them out for 2025 and 2026. See our 30% ruling guide." },
        ],
      },
    ],
    sources: [
      { title: "Belastingdienst – Actual return in your 2025 tax return", url: "https://www.belastingdienst.nl/wps/wcm/connect/en/income-in-box-3/content/actual-return-2025-tax-return" },
      { title: "Belastingdienst – Rates and tax credits 2026", url: "https://www.belastingdienst.nl/wps/wcm/connect/nl/voorlopige-aanslag/content/voorlopige-aanslag-tarieven-en-heffingskortingen" },
      { title: "Van Lanschot Kempen – Box 3 percentages", url: "https://www.vanlanschotkempen.com/nl-nl/private-banking/inspiratie/beleggen-en-sparen/2026/01/rendementspercentages-box-3" },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

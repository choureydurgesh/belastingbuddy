# BelastingBuddy

A simple guide for expats (and Dutch residents) to the Dutch income tax return, tax year 2025.

## Run it on your computer

You need **Node.js 20 or newer** (download from nodejs.org).

```bash
cd belastingbuddy
npm install      # downloads the tools (one time)
npm run dev      # starts the site
```

Open **http://localhost:3000** in your browser.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Checks the tax maths |
| `npm run build` | Makes the final site in the `out` folder |
| `npm run deploy` | Builds and uploads to Cloudflare Pages (log in first with `npx wrangler login`) |

## Where things are

| Folder / file | What's inside |
|---|---|
| `src/app/` | The pages: home (`page.tsx`), `return/`, `privacy/`, and all styles (`globals.css`) |
| `src/components/` | The building blocks: homepage, question chat, results |
| `src/lib/questions.ts` | Every question we ask, in order (F1–F6) |
| `src/lib/tax/rules/` | Tax rates per year (2025.json, 2026.json). Next year: add 2027.json and one line in calculate.ts |
| `src/lib/guides.ts` | The help articles (F15). Add a guide by adding an entry |
| `src/lib/tax/calculate.ts` | The refund estimate (F8) |
| `src/lib/checklist.ts` | The document checklist (F7) |
| `src/lib/guide.ts` | The filing guide (F9) |
| `src/lib/storage.ts` | Save and continue, in the browser only (F10, F11) |

## Good to know

- Answers are saved only in the user's browser. Nothing goes to a server.
- The estimate covers employees, business owners, people 67+, fiscal partners (best split), income from abroad, and qualifying non-residents. M form, C form and abroad estimates are marked "rough".
- Not included yet: business costs and starter deduction, partial non-resident status (30% ruling), non-qualifying non-residents, extra healthcare deductions for 67+.

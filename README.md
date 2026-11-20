# BelastingBuddy

A simple guide for expats (and Dutch residents) to the Dutch income tax return, tax year 2025.

## Run it on your computer

First get the code:

```bash
git clone https://github.com/choureydurgesh/belastingbuddy.git
cd belastingbuddy
```

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
| `npm run test:coverage` | Same tests, plus a coverage report in `coverage/lcov.info` (used by SonarCloud) |
| `npm run lint` | Checks the code with ESLint (Next.js, React, React Hooks, accessibility and TypeScript rules) |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run audit:gate` | Checks dependencies for known high/critical vulnerabilities (exceptions in `.npm-audit-allowlist.json`) |
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
- Also covered: starter deduction, partial non-resident status (picked only when it saves money), extra healthcare deduction for low incomes and 67+.
- Also covered: business turnover and costs, investment deduction (KIA), non-qualifying non-residents (credits by country and insurance), reading WOZ, mortgage, bank and broker statements.
- Not included yet: 2027 rules (waiting for the final numbers), other business deductions (like the self-employed pension reserve).
- Server: `functions/api/` (Cloudflare Pages Functions) with a D1 database in the EU (`schema.sql`). Only feedback and reminder emails are stored.

## DevOps showcase

Besides the app, this repo is a hands-on DevOps portfolio: Docker, GitHub Actions CI/CD, Kubernetes, Argo CD (GitOps),
Terraform, Ansible and SRE/observability (Prometheus, Grafana, OpenTelemetry).
Start with **[docs/LEARNING.md](docs/LEARNING.md)** – every file has simple comments explaining the concept.

Container images (amd64 + arm64), built and scanned on every merge to `main`:
`ghcr.io/choureydurgesh/belastingbuddy` (used for deploys) and a copy on Docker Hub, `durgeshchourey/belastingbuddy`.
The images contain the frontend only; the `/api` functions run on Cloudflare Pages.

DevSecOps checks on every pull request: gitleaks (secrets), npm audit gate (dependencies), ESLint and SonarCloud (SAST),
Trivy misconfiguration scan (Kubernetes, Terraform, Dockerfile), hadolint, and an OWASP ZAP scan of the running app (DAST);
then a Trivy CVE scan of every built image. Overview: [LEARNING.md, Step 3c](docs/LEARNING.md#step-3c--devsecops-every-security-check-in-pipeline-order).

```bash
make up    # app + Prometheus + Grafana + OpenTelemetry locally  ->  http://localhost:8080 / :9090 / :3000
```

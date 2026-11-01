// F19: find what we need in the text of a jaaropgaaf (yearly statement from an employer).
// The text comes from a PDF or a photo, read in the browser. Nothing is uploaded.
// We never keep the BSN or other personal numbers: only the fields below.
import { parseMoney } from "./money";

export interface ScanResult {
  fiscalWage: number | null;
  taxWithheld: number | null;
  /** Tax year printed on the statement. */
  year?: number | null;
  /** Employer or benefit agency name, so the user can tell statements apart. */
  employer?: string | null;
  /** A sign of the 30% ruling (ET allowance) on the statement. */
  ruling30?: boolean;
  /** First month worked that year (1–12), when the statement shows a period. */
  startMonth?: number | null;
}

// Labels employers use. Dutch payroll software varies, so we accept several.
const WAGE_LABELS = [
  /fiscaal\s*loon/i,
  /loon\s*voor\s*de\s*loonheffing/i,
  /loon\s*(?:voor\s*)?(?:de\s*)?lb\s*\/?\s*ph/i,
  /loon\s*lh/i,
  /belastbaar\s*loon/i,
  /taxable\s*(?:wage|income|salary)/i,
];
const TAX_LABELS = [
  /ingehouden\s*loonheffing/i,
  /loonheffing\s*ingehouden/i,
  /ingehouden\s*(?:lb|loonbelasting)/i,
  /(?:^|\s)loonheffing(?:\s|:|$)/i,
  /wage\s*tax\s*withheld/i,
  /tax\s*withheld/i,
];
const EMPLOYER_LABELS = [/naam\s*werkgever/i, /werkgever/i, /inhoudingsplichtige/i, /uitkeringsinstantie/i, /employer/i];
const RULING_SIGNS = /extraterritoriale|\bET[- ]?(?:vergoeding|regeling)|30\s*%[- ]?regeling|30\s*%[- ]?ruling/i;

// A money amount: "45.000", "45.000,00", "€ 45000", "45,000.00". At least 3 digits so dates and percentages don't match.
const MONEY = /€?\s*-?\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|€?\s*-?\d{3,7}(?:[.,]\d{2})?/g;

function firstAmount(text: string): number | null {
  for (const m of text.matchAll(MONEY)) {
    const raw = m[0].replace(/\s(?=\d{3}\b)/g, "");
    // Skip years like "2025".
    if (/^\D*(19|20)\d{2}$/.test(raw.trim())) continue;
    const v = parseMoney(raw.replace("-", ""));
    if (v !== null && v >= 100 && v < 10_000_000) return Math.round(v);
  }
  return null;
}

function findAfterLabel(lines: string[], labels: RegExp[], skip: RegExp[] = []): number | null {
  for (const label of labels) {
    for (let i = 0; i < lines.length; i++) {
      if (skip.some((r) => r.test(lines[i]))) continue;
      const m = lines[i].match(label);
      if (!m) continue;
      // Look on the same line after the label, then on the next two lines (tables split label and value).
      const after = lines[i].slice((m.index ?? 0) + m[0].length);
      const found = firstAmount(after) ?? firstAmount(lines[i + 1] ?? "") ?? firstAmount(lines[i + 2] ?? "");
      if (found !== null) return found;
    }
  }
  return null;
}

function findYear(lines: string[]): number | null {
  for (const l of lines) {
    const m = l.match(/(?:jaaropgaaf|jaaropgave|annual\s*statement|belastingjaar|tax\s*year|jaar)\D{0,12}((?:19|20)\d{2})/i);
    if (m) return Number(m[1]);
  }
  // Otherwise the year of the end date of the period, e.g. "01-01-2025 t/m 31-12-2025".
  for (const l of lines) {
    const m = l.match(/\d{1,2}[-./]\d{1,2}[-./]((?:19|20)\d{2})\s*(?:t\/m|tot|-|to|till)\s*\d{1,2}[-./]\d{1,2}[-./]((?:19|20)\d{2})/i);
    if (m) return Number(m[2]);
  }
  return null;
}

function findStartMonth(lines: string[]): number | null {
  for (const l of lines) {
    const m = l.match(/(\d{1,2})[-./](\d{1,2})[-./](?:19|20)\d{2}\s*(?:t\/m|tot|-|to|till)\s*\d{1,2}[-./]\d{1,2}[-./](?:19|20)\d{2}/i);
    if (m) {
      const month = Number(m[2]);
      if (month >= 1 && month <= 12) return month;
    }
  }
  return null;
}

function findEmployer(lines: string[]): string | null {
  for (const label of EMPLOYER_LABELS) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(label);
      if (!m) continue;
      const after = lines[i].slice((m.index ?? 0) + m[0].length).replace(/^[\s:]+/, "").trim();
      const name = after || lines[i + 1] || "";
      // A name, not a number or another label.
      if (name && /[a-z]/i.test(name) && !/loon|heffing|\d{4,}/i.test(name)) return name.slice(0, 60);
    }
  }
  return null;
}

export function extractJaaropgaaf(text: string): ScanResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const fiscalWage = findAfterLabel(lines, WAGE_LABELS);
  // A wage line like "Loon voor de loonheffing" also contains the word "loonheffing", so skip those.
  let taxWithheld = findAfterLabel(lines, TAX_LABELS, WAGE_LABELS);
  // The tax can't be more than the wage; if it is, we picked up the wrong number.
  if (fiscalWage !== null && taxWithheld !== null && taxWithheld >= fiscalWage) taxWithheld = null;
  return {
    fiscalWage,
    taxWithheld,
    year: findYear(lines),
    employer: findEmployer(lines),
    ruling30: RULING_SIGNS.test(text),
    startMonth: findStartMonth(lines),
  };
}

/** One uploaded statement, after the user checked it. */
export interface ScannedDoc {
  id: string;
  fileName: string;
  owner: "me" | "partner";
  result: ScanResult;
}

/** Turn checked statements into answers for the question flow. Fields we couldn't read stay empty, so we still ask them. */
export function answersFromDocs(docs: ScannedDoc[], years: number[]) {
  const mine = docs.filter((d) => d.owner === "me");
  const theirs = docs.filter((d) => d.owner === "partner");
  const sum = (list: ScannedDoc[], key: "fiscalWage" | "taxWithheld") =>
    list.length && list.every((d) => d.result[key] !== null) ? list.reduce((s, d) => s + (d.result[key] ?? 0), 0) : undefined;

  const found: Record<string, unknown> = { jaaropgaaf: docs.length ? "scanned" : "skipped" };
  const year = docs.map((d) => d.result.year).find((y) => y && years.includes(y));
  if (year) found.taxYear = year;
  if (mine.length) {
    found.hasJob = "yes";
    const w = sum(mine, "fiscalWage");
    const t = sum(mine, "taxWithheld");
    if (w !== undefined) found.fiscalWage = w;
    if (t !== undefined) found.taxWithheld = t;
    if (mine.some((d) => d.result.ruling30)) found.ruling30 = "yes";
  }
  if (theirs.length) {
    found.partner = "yes";
    const w = sum(theirs, "fiscalWage");
    const t = sum(theirs, "taxWithheld");
    if (w !== undefined) found.partnerWage = w;
    if (t !== undefined) found.partnerWithheld = t;
  }
  return found;
}

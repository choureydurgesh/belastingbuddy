// F19: find the two numbers we need in the text of a jaaropgaaf.
// The text comes from a PDF or a photo (read in the browser). Nothing is uploaded.
import { parseMoney } from "./money";

export interface ScanResult {
  fiscalWage: number | null;
  taxWithheld: number | null;
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
  return { fiscalWage, taxWithheld };
}
